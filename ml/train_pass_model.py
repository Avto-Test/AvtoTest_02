"""
AUTOTEST ML Training Pipeline
Trains the Gradient Boosting model for pass prediction.
"""

import os
import json
import time
import hashlib
import joblib
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score, precision_score, recall_score
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from models.user import User
from models.attempt import Attempt
from ml.features import get_user_feature_vector, FEATURE_COUNT, FEATURE_VERSION

FEATURE_NAMES = [
    "readiness_score", "avg_bkt_mastery", "avg_retention", "consolidation_factor",
    "adaptive_consistency_score", "training_level_encoded", "pressure_resilience",
    "avg_response_time", "response_time_variance", "total_attempts",
    "last_5_score_mean", "last_5_score_std", "review_queue_size",
    "avg_interval_days", "repetition_stability_score", "topic_entropy",
    "weakest_topic_mastery", "strongest_topic_mastery", "time_since_last_attempt",
    "overdue_ratio"
]

def calculate_feature_hash(features: list):
    return hashlib.sha256(",".join(features).encode()).hexdigest()

async def train_model():
    """Main training loop."""
    print("Starting ML Model Training Pipeline...")
    
    async for db in get_db():
        # 1. Identify valid users (>= 30 completed attempts)
        stmt = (
            select(User.id)
            .join(Attempt, User.id == Attempt.user_id)
            .where(Attempt.finished_at.is_not(None))
            .group_by(User.id)
            .having(func.count(Attempt.id) >= 30)
        )
        res = await db.execute(stmt)
        user_ids = [str(r[0]) for r in res.all()]
        
        if len(user_ids) < 5:
            print(f"Insufficient data: only {len(user_ids)} users found with >= 30 attempts. Need at least 5.")
            return
            
        print(f"Found {len(user_ids)} valid users. Extracting features...")
        
        X = []
        y = []
        
        for uid in user_ids:
            # Extract features
            vector = await get_user_feature_vector(db, uid)
            if vector is None:
                continue
                
            # Extract label: 1 if user last 3 attempts avg >= 85%, else 0
            # Note: score is raw (out of 20), so 85% is 17.0
            label_res = await db.execute(
                select(Attempt.score)
                .where(Attempt.user_id == uid, Attempt.finished_at.is_not(None))
                .order_by(Attempt.finished_at.desc())
                .limit(3)
            )
            last_3_scores = [r[0] for r in label_res.all()]
            if len(last_3_scores) < 3:
                continue
                
            avg_last_3 = sum(last_3_scores) / len(last_3_scores)
            label = 1 if avg_last_3 >= 17.0 else 0
            
            X.append(vector)
            y.append(label)
            
        if not X:
            print("No valid data points extracted.")
            return
            
        print(f"Training on {len(X)} samples...")
        
        # 3. Algorithm Specification
        model = GradientBoostingClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=3,
            subsample=0.8,
            random_state=42
        )
        
        model.fit(X, y)
        
        # 5. Calculate Baselines for Drift Detection (Phase 13)
        X_df = pd.DataFrame(X, columns=FEATURE_NAMES)
        feature_baselines = {}
        for col in FEATURE_NAMES:
            # Use 10 bins, based on training range
            counts, bin_edges = np.histogram(X_df[col], bins=10)
            feature_baselines[col] = {
                "bin_edges": [float(b) for b in bin_edges],
                "bin_counts": [int(c) for c in counts],
                "bin_pcts": [float(c/len(X)) for c in counts]
            }
            
        pred_counts, pred_edges = np.histogram(y_prob, bins=10, range=(0, 1))
        prediction_baseline = {
            "bin_edges": [float(b) for b in pred_edges],
            "bin_pcts": [float(c/len(X)) for c in pred_counts]
        }
        
        # 6. Save Artifacts
        timestamp = int(time.time())
        version = f"v{timestamp}"
        
        # Ensure directory exists
        os.makedirs("ml_models", exist_ok=True)
        
        model_path = f"ml_models/pass_model_{version}.joblib"
        meta_path = f"ml_models/pass_model_{version}.json"
        
        joblib.dump(model, model_path)
        
        metadata = {
            "version": version,
            "feature_count": FEATURE_COUNT,
            "feature_version": FEATURE_VERSION,
            "auc_score": float(auc),
            "precision": float(precision),
            "recall": float(recall),
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "training_size": len(X),
            "normalization": "log1p_v1",
            "feature_hash": calculate_feature_hash(FEATURE_NAMES),
            "feature_baselines": feature_baselines,
            "prediction_baseline": prediction_baseline
        }
        
        with open(meta_path, 'w') as f:
            json.dump(metadata, f, indent=4)
            
        print(f"Model saved to {model_path}")
        return version

if __name__ == "__main__":
    import asyncio
    asyncio.run(train_model())
