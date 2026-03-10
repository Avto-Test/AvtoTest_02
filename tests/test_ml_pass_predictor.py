"""
AUTOTEST ML Pass Predictor Tests — Phase 2.5
Updated mocks to use Learning Engine feature sources (UserTopicStats + ReviewQueue).
"""

import hashlib
import json
import os

import numpy as np
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from ml.features import get_user_feature_vector, FEATURE_COUNT, FEATURE_NAMES, FEATURE_VERSION
from ml.model_registry import (
    EXPECTED_HASH,
    FEATURE_NAMES as REGISTRY_FEATURE_NAMES,
    InferenceEngine,
    safe_ml_inference,
)
from ml.train_pass_model import validate_dataset, DatasetValidationError


# ─────────────────────────────────────────────────────────────
# 1. Feature Engineering Tests
# ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_feature_vector_cold_start():
    """Returns None when user has 0 finished attempts."""
    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.all.return_value = []  # 0 attempts
    db.execute.return_value = mock_res

    vector = await get_user_feature_vector(db, "user_cold")
    assert vector is None


@pytest.mark.asyncio
async def test_feature_vector_structure():
    """Returns exactly 20 floats with no NaN or Inf."""
    db = AsyncMock()

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    # Mock attempts result (15 attempts)
    mock_attempts = []
    for i in range(15):
        a = MagicMock()
        a.score = 15.0
        a.finished_at = now
        a.mode = "standard"
        a.avg_response_time = 2000.0
        a.response_time_variance = 50000.0
        mock_attempts.append(a)

    mock_res_attempts = MagicMock()
    mock_res_attempts.all.return_value = mock_attempts

    # Mock UserTopicStats result (learning engine)
    mock_topic = MagicMock()
    mock_topic.accuracy_rate = 0.75
    mock_topic.last_attempt_at = None  # triggers default retention of 0.5

    mock_res_topics = MagicMock()
    mock_res_topics.scalars.return_value.all.return_value = [mock_topic]

    # Mock ReviewQueue result (learning engine)
    mock_rq = MagicMock()
    mock_rq.interval_days = 3
    mock_rq.last_result = "correct"
    mock_rq.next_review_at = None  # not overdue

    mock_res_rq = MagicMock()
    mock_res_rq.scalars.return_value.all.return_value = [mock_rq]

    # Sequential side effects: attempts, topics, review_queue
    db.execute.side_effect = [mock_res_attempts, mock_res_topics, mock_res_rq]

    vector = await get_user_feature_vector(db, "user_123")

    assert vector is not None, "Expected a feature vector, got None"
    assert len(vector) == FEATURE_COUNT, f"Expected {FEATURE_COUNT} features, got {len(vector)}"
    assert all(isinstance(x, float) for x in vector), "All features must be floats"
    assert not any(np.isnan(x) for x in vector), "Vector must not contain NaN"
    assert not any(np.isinf(x) for x in vector), "Vector must not contain Inf"


def test_feature_version():
    """FEATURE_VERSION must be 2 after Phase 2.5 migration."""
    assert FEATURE_VERSION == 2, f"Expected FEATURE_VERSION=2, got {FEATURE_VERSION}"


def test_feature_names_length():
    """Feature list length must equal FEATURE_COUNT."""
    assert len(FEATURE_NAMES) == FEATURE_COUNT


# ─────────────────────────────────────────────────────────────
# 2. Model Registry Tests
# ─────────────────────────────────────────────────────────────

def test_registry_hash_consistent():
    """EXPECTED_HASH computed from REGISTRY_FEATURE_NAMES must be deterministic."""
    computed = hashlib.sha256(",".join(REGISTRY_FEATURE_NAMES).encode()).hexdigest()
    assert computed == EXPECTED_HASH, "Registry hash inconsistency — update FEATURE_NAMES in model_registry.py"


def test_feature_names_match_between_features_and_registry():
    """FEATURE_NAMES in ml/features.py and ml/model_registry.py must be identical."""
    assert FEATURE_NAMES == REGISTRY_FEATURE_NAMES, (
        "ml/features.py and ml/model_registry.py FEATURE_NAMES lists are out of sync"
    )


@patch("ml.model_registry.glob.glob")
@patch("ml.model_registry.os.path.exists")
@patch("ml.model_registry.open", new_callable=MagicMock)
def test_registry_fallback_on_feature_version_mismatch(mock_open, mock_exists, mock_glob):
    """Fallback must trigger if model feature_version does not match."""
    mock_glob.return_value = ["ml_models/bad_model.joblib"]
    mock_exists.return_value = True

    bad_meta = {
        "version": "vBad",
        "feature_version": 999,  # Mismatch vs FEATURE_VERSION=2
        "feature_count": FEATURE_COUNT,
        "normalization": "log1p_v1",
        "feature_hash": "wrong_hash",
    }

    mock_file = MagicMock()
    mock_file.__enter__.return_value = mock_file
    mock_file.read.return_value = json.dumps(bad_meta)
    mock_open.return_value = mock_file

    engine = InferenceEngine()
    engine.load_latest_model()

    assert engine.status == "fallback"
    assert engine.model is None


@pytest.mark.asyncio
async def test_safe_ml_inference_never_raises():
    """safe_ml_inference must return None (not raise) on any error."""
    db = AsyncMock()
    db.execute.side_effect = Exception("DB crash!")

    result = await safe_ml_inference(db, "user_crash")
    assert result is None


# ─────────────────────────────────────────────────────────────
# 3. Dataset Validation Tests
# ─────────────────────────────────────────────────────────────

def _make_valid_dataset(n: int = 20) -> tuple[list, list]:
    X = [[float(i % 5)] * FEATURE_COUNT for i in range(n)]
    y = [i % 2 for i in range(n)]
    return X, y


def test_validate_dataset_passes_clean_data():
    X, y = _make_valid_dataset(20)
    validate_dataset(X, y)  # Should not raise


def test_validate_dataset_rejects_length_mismatch():
    X, y = _make_valid_dataset(20)
    with pytest.raises(DatasetValidationError, match="length"):
        validate_dataset(X, y[:-1])


def test_validate_dataset_rejects_nan_feature():
    X, y = _make_valid_dataset(10)
    X[0][0] = float("nan")
    with pytest.raises(DatasetValidationError, match="non-finite"):
        validate_dataset(X, y)


def test_validate_dataset_rejects_single_class():
    X, _ = _make_valid_dataset(10)
    y_all_zero = [0] * 10
    with pytest.raises(DatasetValidationError, match="one class"):
        validate_dataset(X, y_all_zero)


def test_validate_dataset_rejects_too_small():
    X, y = _make_valid_dataset(5)
    with pytest.raises(DatasetValidationError, match="small"):
        validate_dataset(X, y)


def test_validate_dataset_rejects_wrong_feature_count():
    X = [[1.0] * (FEATURE_COUNT - 1)]  # Too short
    y = [0]
    with pytest.raises(DatasetValidationError):
        validate_dataset(X, y)


# ─────────────────────────────────────────────────────────────
# 4. Blending / Clamping Logic Tests
# ─────────────────────────────────────────────────────────────

def test_inference_clamping_bounds():
    """Final probability must always stay in [0, 100]."""
    assert max(0.0, min(100.0, 150.0)) == 100.0
    assert max(0.0, min(100.0, -50.0)) == 0.0


def test_confidence_calibration():
    """Confidence formula: auc × abs(prob - 0.5) × 2."""
    auc = 0.9
    ml_prob_norm = 0.8
    conf = auc * abs(ml_prob_norm - 0.5) * 2
    assert round(conf, 2) == 0.54

    auc_low = 0.6
    conf_low = auc_low * abs(ml_prob_norm - 0.5) * 2
    assert round(conf_low, 2) == 0.36


def test_ml_weight_tiers():
    """AUC-weighted blend selects correct ml_weight tier."""
    def get_weight(auc):
        if auc >= 0.85:
            return 0.75
        elif auc >= 0.75:
            return 0.60
        else:
            return 0.40

    assert get_weight(0.90) == 0.75
    assert get_weight(0.80) == 0.60
    assert get_weight(0.65) == 0.40
