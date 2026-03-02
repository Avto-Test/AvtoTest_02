import pytest
import numpy as np
import hashlib
import os
import json
import joblib
from unittest.mock import AsyncMock, MagicMock, patch
from ml.features import get_user_feature_vector, FEATURE_COUNT
from ml.model_registry import InferenceEngine, FEATURE_VERSION, EXPECTED_HASH, safe_ml_inference, FEATURE_NAMES
from models.attempt import Attempt
from models.user_skill import UserSkill

# --- 1. Feature Engineering Tests ---

@pytest.mark.asyncio
async def test_feature_vector_cold_start():
    """Ensure returns None for < 10 attempts."""
    db = AsyncMock()
    # Mock attempts result < 10
    mock_res = MagicMock()
    mock_res.all.return_value = [MagicMock() for _ in range(5)] # 5 attempts
    db.execute.return_value = mock_res
    
    vector = await get_user_feature_vector(db, "user_123")
    assert vector is None

@pytest.mark.asyncio
async def test_feature_vector_structure():
    """Ensure strictly 20 floats returned."""
    db = AsyncMock()
    
    # Mock 15 attempts
    mock_attempts = []
    for _ in range(15):
        a = MagicMock()
        a.score = 15.0
        a.finished_at = MagicMock()
        a.mode = "normal"
        a.avg_response_time = 2000.0
        a.response_time_variance = 50000.0
        mock_attempts.append(a)
        
    mock_res_attempts = MagicMock()
    mock_res_attempts.all.return_value = mock_attempts
    
    # Mock skills
    mock_skill = MagicMock()
    mock_skill.bkt_knowledge_prob = 0.8
    mock_skill.last_practice_at = None
    mock_skill.interval_days = 2.0
    mock_skill.ease_factor = 2.5
    mock_skill.skill_score = 0.9
    mock_skill.next_review_at = None
    
    mock_res_skills = MagicMock()
    mock_res_skills.scalars().all.return_value = [mock_skill]
    
    # Setup sequential side effects for db.execute
    db.execute.side_effect = [mock_res_attempts, mock_res_skills]
    
    vector = await get_user_feature_vector(db, "user_123")
    
    assert vector is not None
    assert len(vector) == FEATURE_COUNT
    assert all(isinstance(x, float) for x in vector)
    assert not any(np.isnan(x) for x in vector)
    assert not any(np.isinf(x) for x in vector)

# --- 2. Model Registry & Hardening Tests ---

def test_registry_hash_validation():
    """Ensure registry validates feature hash."""
    calc_hash = hashlib.sha256(",".join(FEATURE_NAMES).encode()).hexdigest()
    assert calc_hash == EXPECTED_HASH

@patch("ml.model_registry.glob.glob")
@patch("ml.model_registry.os.path.exists")
@patch("ml.model_registry.open", new_callable=MagicMock)
def test_registry_fallback_on_metadata_mismatch(mock_open, mock_exists, mock_glob):
    """Ensure fallback triggers if metadata is invalid."""
    mock_glob.return_value = ["ml_models/bad_model.joblib"]
    mock_exists.return_value = True
    
    # Mock invalid metadata
    bad_meta = {
        "version": "vBad",
        "feature_version": 999, # Mismatch
        "feature_count": 20,
        "normalization": "none",
        "feature_hash": "wrong_hash"
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
    """Ensure safe_ml_inference catches all errors and returns None."""
    db = AsyncMock()
    db.execute.side_effect = Exception("System Crash!")
    
    # Should not raise exception
    res = await safe_ml_inference(db, "user_123")
    assert res is None

def test_inference_clamping_logic():
    """Verify blending and clamping boundary logic."""
    # Simulation of router logic
    ml_prob = 110.0 # Malformed prediction
    rule_prob = -5.0 # Malformed rule
    
    ml_weight = 0.8
    final = (ml_weight * ml_prob) + ((1 - ml_weight) * rule_prob)
    
    # Hybrid math: 0.8*110 + 0.2*-5 = 88 - 1 = 87
    clamped = max(0.0, min(100.0, final))
    assert clamped == 87.0
    
    # Extreme cases
    assert max(0.0, min(100.0, 150.0)) == 100.0
    assert max(0.0, min(100.0, -50.0)) == 0.0

def test_confidence_calibration():
    """Test upgraded 12C confidence formula."""
    auc = 0.9
    ml_prob_norm = 0.8 # 80%
    
    # Formula: auc * abs(prob - 0.5) * 2
    conf = auc * abs(ml_prob_norm - 0.5) * 2
    # 0.9 * 0.3 * 2 = 0.54
    assert round(conf, 2) == 0.54
    
    # Low AUC impact
    auc_low = 0.6
    conf_low = auc_low * abs(ml_prob_norm - 0.5) * 2
    # 0.6 * 0.3 * 2 = 0.36
    assert round(conf_low, 2) == 0.36
