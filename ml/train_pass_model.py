"""
AUTOTEST ML Training Pipeline — Phase 2.5
Trains the GradientBoosting pass-prediction model using Learning Engine features.

Fixes from original:
- Added missing `import numpy as np`
- Added missing metrics imports (f1_score)
- Added train/test split so metrics are computed on held-out data
- y_prob computed from test-set predictions (was undefined before)
- auc, precision, recall, f1 computed correctly before metadata is written
- Added validate_dataset() guard before training starts
"""

import hashlib
import json
import logging
import os
import time
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from ml.features import FEATURE_COUNT, FEATURE_NAMES, FEATURE_VERSION, get_user_feature_vector
from models.attempt import Attempt
from models.user import User

logger = logging.getLogger(__name__)

# Passing threshold: 85 % of 20 questions = 17 correct
PASS_THRESHOLD_RAW = 17.0
MIN_USERS = 5
MIN_ATTEMPTS_PER_USER = 30


def calculate_feature_hash(features: list) -> str:
    return hashlib.sha256(",".join(features).encode()).hexdigest()


# ─────────────────────────────────────────────────────────────
# Dataset Validation
# ─────────────────────────────────────────────────────────────

class DatasetValidationError(Exception):
    """Raised when dataset fails validation and training must abort."""


def validate_dataset(X: list[list[float]], y: list[int]) -> None:
    """
    Validate dataset before training.

    Checks:
    1. Lengths match
    2. Feature vector length is FEATURE_COUNT for every sample
    3. No NaN or Inf values exist in any feature
    4. Labels are binary (0 or 1 only)
    5. Class balance — warn if minority class < 20 % (do not abort)
    6. Minimum sample count (≥ 10 after filtering)

    Raises DatasetValidationError on hard failures.
    """
    if len(X) != len(y):
        raise DatasetValidationError(
            f"X length ({len(X)}) != y length ({len(y)})"
        )

    if len(X) < 10:
        raise DatasetValidationError(
            f"Dataset too small: only {len(X)} samples (minimum 10 required)."
        )

    for i, vec in enumerate(X):
        if len(vec) != FEATURE_COUNT:
            raise DatasetValidationError(
                f"Sample {i}: feature vector length {len(vec)} != expected {FEATURE_COUNT}"
            )
        for j, val in enumerate(vec):
            if val != val or val == float("inf") or val == float("-inf"):
                raise DatasetValidationError(
                    f"Sample {i}, feature {j} ({FEATURE_NAMES[j]}): non-finite value {val}"
                )

    unique_labels = set(y)
    invalid_labels = unique_labels - {0, 1}
    if invalid_labels:
        raise DatasetValidationError(f"Labels contain non-binary values: {invalid_labels}")

    if 0 not in unique_labels or 1 not in unique_labels:
        raise DatasetValidationError(
            f"Dataset has only one class: {unique_labels}. Cannot train a classifier."
        )

    # Class balance warning (soft check — does not abort)
    n_pos = sum(y)
    n_neg = len(y) - n_pos
    minority_ratio = min(n_pos, n_neg) / len(y)
    if minority_ratio < 0.20:
        logger.warning(
            "Class imbalance detected: %.1f%% minority class. "
            "Consider collecting more data or using class_weight='balanced'.",
            minority_ratio * 100,
        )

    logger.info(
        "Dataset validation passed: %d samples, %d features, "
        "%.1f%% positive labels.",
        len(X),
        FEATURE_COUNT,
        (n_pos / len(y)) * 100,
    )


# ─────────────────────────────────────────────────────────────
# Main Training Function
# ─────────────────────────────────────────────────────────────

async def train_model():
    """
    Full training pipeline:
    1. Identify users with >= 30 finished attempts
    2. Extract feature vectors via get_user_feature_vector()
    3. Generate binary labels (pass = avg last 3 scores >= PASS_THRESHOLD_RAW)
    4. Validate dataset
    5. 80/20 train/test split
    6. Train GradientBoostingClassifier
    7. Evaluate on test set: AUC, Precision, Recall, F1
    8. Save model artifact (.joblib) and metadata (.json)
    """
    logger.info("Starting ML Model Training Pipeline (Phase 2.5)...")

    async for db in get_db():
        # 1. Identify valid users
        stmt = (
            select(User.id)
            .join(Attempt, User.id == Attempt.user_id)
            .where(Attempt.finished_at.is_not(None))
            .group_by(User.id)
            .having(func.count(Attempt.id) >= MIN_ATTEMPTS_PER_USER)
        )
        res = await db.execute(stmt)
        user_ids = [str(r[0]) for r in res.all()]

        if len(user_ids) < MIN_USERS:
            logger.info(
                "Insufficient data: only %d users with >= %d attempts (need %d). "
                "Training aborted — will retry when more data is available.",
                len(user_ids),
                MIN_ATTEMPTS_PER_USER,
                MIN_USERS,
            )
            return None

        logger.info("Found %d valid users. Extracting features...", len(user_ids))

        X: list[list[float]] = []
        y: list[int] = []

        for uid in user_ids:
            # Extract feature vector
            vector = await get_user_feature_vector(db, uid)
            if vector is None:
                continue

            # Generate label: pass if avg of last 3 raw scores >= threshold
            label_res = await db.execute(
                select(Attempt.score)
                .where(Attempt.user_id == uid, Attempt.finished_at.is_not(None))
                .order_by(Attempt.finished_at.desc())
                .limit(3)
            )
            last_3_scores = [r[0] for r in label_res.all() if r[0] is not None]
            if len(last_3_scores) < 3:
                continue

            avg_last_3 = sum(last_3_scores) / len(last_3_scores)
            label = 1 if avg_last_3 >= PASS_THRESHOLD_RAW else 0

            X.append(vector)
            y.append(label)

        # 2. Validate dataset
        try:
            validate_dataset(X, y)
        except DatasetValidationError as exc:
            logger.error("Dataset validation failed — training aborted: %s", exc)
            return None

        logger.info("Training on %d samples...", len(X))

        # 3. Train / test split (80/20, stratified)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )

        # 4. Train model
        model = GradientBoostingClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=3,
            subsample=0.8,
            random_state=42,
        )
        model.fit(X_train, y_train)

        # 5. Evaluate on held-out test set
        y_prob = model.predict_proba(X_test)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)

        auc = float(roc_auc_score(y_test, y_prob))
        precision = float(precision_score(y_test, y_pred, zero_division=0))
        recall = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))

        logger.info(
            "Model evaluation — AUC: %.3f | Precision: %.3f | Recall: %.3f | F1: %.3f",
            auc, precision, recall, f1,
        )

        # 6. Compute baseline distributions for drift detection
        X_arr = np.array(X_train)
        feature_baselines: dict = {}
        for idx, col in enumerate(FEATURE_NAMES):
            counts, bin_edges = np.histogram(X_arr[:, idx], bins=10)
            feature_baselines[col] = {
                "bin_edges": [float(b) for b in bin_edges],
                "bin_counts": [int(c) for c in counts],
                "bin_pcts": [float(c / max(1, len(X_train))) for c in counts],
            }

        # Full training set predictions for baseline
        y_prob_all = model.predict_proba(X)[:, 1]
        pred_counts, pred_edges = np.histogram(y_prob_all, bins=10, range=(0, 1))
        prediction_baseline = {
            "bin_edges": [float(b) for b in pred_edges],
            "bin_pcts": [float(c / max(1, len(X))) for c in pred_counts],
        }

        # 7. Save artifacts
        timestamp = int(time.time())
        version = f"v{timestamp}"
        os.makedirs("ml_models", exist_ok=True)

        model_path = f"ml_models/pass_model_{version}.joblib"
        meta_path = f"ml_models/pass_model_{version}.json"

        joblib.dump(model, model_path)

        metadata = {
            "version": version,
            "feature_version": FEATURE_VERSION,
            "feature_count": FEATURE_COUNT,
            "feature_hash": calculate_feature_hash(FEATURE_NAMES),
            "normalization": "log1p_v1",
            "auc_score": auc,
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "training_size": len(X),
            "test_size": len(X_test),
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "pass_threshold": PASS_THRESHOLD_RAW,
            "feature_baselines": feature_baselines,
            "prediction_baseline": prediction_baseline,
        }

        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=4)

        logger.info("Model artifact saved: %s (AUC=%.3f)", model_path, auc)
        return version


if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)
    asyncio.run(train_model())
