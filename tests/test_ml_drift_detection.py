import pytest
import os
import json
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from ml.drift_detector import DriftMonitor, calculate_psi, calculate_kl_divergence
from ml.features import get_user_feature_vector, FEATURE_COUNT
from ml.model_registry import InferenceEngine, FEATURE_NAMES, safe_ml_inference

# --- 1. Statistical Function Tests ---

def test_psi_calculation():
    """Verify PSI formula logic."""
    # Stable: identical distributions
    p1 = [0.1, 0.4, 0.5]
    p2 = [0.1, 0.4, 0.5]
    assert calculate_psi(p1, p2) == 0.0
    
    # Drifted: skewed distribution
    p3 = [0.5, 0.4, 0.1]
    psi = calculate_psi(p1, p3)
    assert psi > 0.25 # Significant drift

def test_kl_divergence():
    """Verify KL Divergence formula."""
    p = [0.1, 0.8, 0.1]
    q = [0.1, 0.8, 0.1]
    assert calculate_kl_divergence(p, q) == 0.0
    
    q2 = [0.4, 0.2, 0.4]
    kl = calculate_kl_divergence(p, q2)
    assert kl > 0.3

# --- 2. Drift Monitor Tests ---

@pytest.mark.asyncio
async def test_drift_detection_severe_psi():
    """Simulate severe PSI drift and verify status."""
    db = AsyncMock()
    engine = MagicMock()
    
    # Mock metadata with baselines
    engine.metadata = {
        "feature_baselines": {
            "readiness_score": {
                "bin_edges": [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
                "bin_pcts": [0.1] * 10
            }
        },
        "prediction_baseline": {
            "bin_edges": [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
            "bin_pcts": [0.1] * 10
        }
    }
    engine.model = MagicMock()
    
    # Mock 1000 attempts
    mock_res = MagicMock()
    mock_res.all.return_value = [("user_1", i) for i in range(1000)]
    db.execute.return_value = mock_res
    
    # Mock feature extraction with drifted data
    # (Uniformly drifted features)
    with patch("ml.drift_detector.get_user_feature_vector", AsyncMock(return_value=[100.0] * 20)):
        monitor = DriftMonitor(db, engine)
        state = await monitor.run_checks()
        
        assert state["status"] == "severe"
        assert state["data_psi"] > 0.25
        assert os.path.exists("ml_models/drift_state.json")

def test_registry_fallback_on_severe_drift():
    """Verify InferenceEngine falls back when drift_state is severe."""
    # Create temp severe drift file
    os.makedirs("ml_models", exist_ok=True)
    state = {
        "status": "severe",
        "data_psi": 0.5,
        "last_checked": "now"
    }
    with open("ml_models/drift_state.json", 'w') as f:
        json.dump(state, f)
        
    engine = InferenceEngine()
    # We need to trigger the reload since it's a singleton
    engine.load_drift_state()
    
    assert engine.status == "fallback"
    assert engine.drift_status == "severe"

def test_corrupted_drift_state_handling():
    """Ensure engine doesn't crash on corrupted drift_state.json."""
    with open("ml_models/drift_state.json", 'w') as f:
        f.write("CORRUPTED DATA {[[")
        
    engine = InferenceEngine()
    # Should not raise exception
    engine.load_drift_state()
    assert engine.drift_status == "stable" # Default fallback
