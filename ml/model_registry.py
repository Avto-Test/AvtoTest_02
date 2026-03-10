"""
AUTOTEST ML Model Registry
Handles loading, caching, and validating versioned models.
"""

import os
import json
import joblib
import glob
import logging
import threading
import hashlib
import time
from typing import Optional, Dict, Any, List
from ml.features import FEATURE_VERSION, FEATURE_COUNT, get_user_feature_vector
from models.inference_snapshot import InferenceSnapshot

logger = logging.getLogger(__name__)

# Strict feature names for hash verification — must match ml/features.py FEATURE_NAMES exactly.
# Phase 2.5: migrated from UserSkill (legacy) to UserTopicStats + ReviewQueue.
FEATURE_NAMES = [
    "readiness_score",
    "avg_topic_accuracy",
    "avg_retention_days",
    "consolidation_factor",
    "adaptive_consistency_score",
    "training_level_encoded",
    "pressure_resilience",
    "avg_response_time",
    "response_time_variance_log",
    "total_attempts_log",
    "last_5_score_mean",
    "last_5_score_std",
    "review_queue_size",
    "avg_interval_days",
    "avg_last_result_score",
    "topic_entropy",
    "weakest_topic_accuracy",
    "strongest_topic_accuracy",
    "time_since_last_attempt",
    "overdue_ratio",
]

def calculate_feature_hash(features: list):
    return hashlib.sha256(",".join(features).encode()).hexdigest()

EXPECTED_HASH = calculate_feature_hash(FEATURE_NAMES)

class InferenceEngine:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(InferenceEngine, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.model = None
        self.metadata = None
        self.version = "none"
        self.auc_score = 0.0
        self.drift_status = "stable"
        self.drift_state = {}
        self.status = "insufficient_data" # Default
        self._initialized = True
        self.load_latest_model()

    def load_latest_model(self):
        try:
            model_files = glob.glob("ml_models/*.joblib")
            if not model_files:
                self.status = "fallback"  # No model yet
                logger.warning("No ML models found in ml_models/ directory.")
                return

            # Pick newest by filename/timestamp
            latest_model_path = max(model_files, key=os.path.getctime)
            meta_path = latest_model_path.replace(".joblib", ".json")

            if not os.path.exists(meta_path):
                logger.error(f"Metadata missing for model {latest_model_path}")
                self.status = "fallback"
                return

            with open(meta_path, 'r') as f:
                metadata = json.load(f)

            # VALIDATIONS
            if metadata.get("feature_version") != FEATURE_VERSION:
                logger.error(f"Model feature version mismatch: {metadata.get('feature_version')} != {FEATURE_VERSION}")
                self.status = "fallback"
                return

            if metadata.get("feature_count") != FEATURE_COUNT:
                logger.error(f"Model feature count mismatch: {metadata.get('feature_count')} != {FEATURE_COUNT}")
                self.status = "fallback"
                return

            if metadata.get("normalization") != "log1p_v1":
                logger.error(f"Model normalization mismatch: {metadata.get('normalization')} != log1p_v1")
                self.status = "fallback"
                return

            if metadata.get("feature_hash") != EXPECTED_HASH:
                logger.error("Model feature integrity (hash) mismatch.")
                self.status = "fallback"
                return

            # LOAD MODEL
            self.model = joblib.load(latest_model_path)
            self.metadata = metadata
            self.version = metadata.get("version", "unknown")
            self.auc_score = metadata.get("auc_score", 0.0)
            self.status = "active"
            
            # PHASE 13: DRIFT CHECK
            self.load_drift_state()
            
            logger.info(f"Loaded ML Model version {self.version} (AUC={self.auc_score}, Drift={self.drift_status})")

        except Exception as e:
            logger.exception(f"Failed to load ML model: {str(e)}")
            self.status = "fallback"
            self.model = None

    def load_drift_state(self):
        """Load drift state and apply safety overrides."""
        self.drift_status = "stable"
        self.drift_state = {}
        
        drift_path = "ml_models/drift_state.json"
        if os.path.exists(drift_path):
            try:
                with open(drift_path, 'r') as f:
                    self.drift_state = json.load(f)
                    self.drift_status = self.drift_state.get("status", "stable")
                    
                    if self.drift_status == "severe":
                        logger.warning("SEVERE DRIFT DETECTED: Forcing ML Fallback.")
                        self.status = "fallback" # Downgrade to rule-only
            except Exception as e:
                logger.error(f"Failed to load drift state: {str(e)}")

    def predict(self, feature_vector: list) -> Optional[float]:
        """Predict pass probability (0 to 1)."""
        if self.model is None or self.status != "active":
            return None

        try:
            if len(feature_vector) != FEATURE_COUNT:
                logger.error(f"Feature vector size mismatch: got {len(feature_vector)}, expected {FEATURE_COUNT}")
                return None
            
            start_time = time.time()
            # predict_proba returns [ [prob_0, prob_1] ]
            prob = self.model.predict_proba([feature_vector])[0][1]
            duration = (time.time() - start_time) * 1000
            
            if duration > 50:
                logger.warning(f"Slow inference detected: {duration:.2f}ms")
            else:
                logger.debug(f"Inference duration: {duration:.2f}ms")
                
            return float(prob)
        except Exception as e:
            logger.exception(f"Inference error: {str(e)}")
            return None
    
    def fallback_to_rule_engine(self):
        """Explicitly disable ML and use rule engine."""
        self.status = "fallback"
        self.model = None

# Global helper function for easier access
def get_inference_engine() -> InferenceEngine:
    return InferenceEngine()

def calculate_readiness_score(
    avg_recent_pct: float,
    topic_consistency_score: float,
    difficulty_adaptation_score: float
) -> float:
    """Centralized readiness score calculation (Phase 4 Logic)."""
    readiness = (
        (0.5 * avg_recent_pct) +
        (0.3 * topic_consistency_score) +
        (0.2 * difficulty_adaptation_score)
    )
    return min(100.0, max(0.0, readiness))

def calculate_hybrid_probability(
    readiness_score: float,
    adaptive_performance_score: float,
    consistency_score_pp: float,
    training_level_weight: float,
    pressure_resilience: float,
    ml_prob: Optional[float],
    auc_score: float,
    drift_status: str
) -> Dict[str, Any]:
    """
    Centralized Hybrid Blending logic.
    Ensures consistency between Dashboard and History endpoints.
    """
    # 1. Rule-Based Calculation (Baseline)
    rule_prob_val = (
        (0.35 * readiness_score) +
        (0.25 * adaptive_performance_score) +
        (0.20 * consistency_score_pp) +
        (0.10 * training_level_weight) +
        (0.10 * (pressure_resilience * 100))
    )
    rule_prob = round(min(100.0, max(0.0, rule_prob_val)), 1)
    
    # 2. Hybrid Blending & Calibration
    final_pass_prob = rule_prob
    confidence_score = 0.0
    source = "rule"
    
    if ml_prob is not None:
        source = "ml"
        # Scale ml_prob to 0-100
        ml_prob_scaled = ml_prob * 100.0
        
        # Dynamic weight based on AUC
        if auc_score >= 0.85: ml_weight = 0.8
        elif auc_score >= 0.75: ml_weight = 0.6
        else: ml_weight = 0.4
        
        final_pass_prob = (ml_weight * ml_prob_scaled) + ((1 - ml_weight) * rule_prob)
        
        # Upgraded Confidence Equation
        confidence_score = auc_score * abs(ml_prob - 0.5) * 2.0
        confidence_score = max(0.0, min(1.0, confidence_score))
        
    # Phase 13: Drift Confidence Override
    if drift_status == "severe":
        confidence_score = 0.15
        source = "rule"
        final_pass_prob = rule_prob
        
    # Final Clamping for production safety
    final_pass_prob = round(max(0.0, min(100.0, final_pass_prob)), 1)
    
    return {
        "pass_probability": final_pass_prob,
        "rule_prob": rule_prob,
        "ml_prob": ml_prob * 100.0 if ml_prob is not None else None,
        "confidence_score": round(confidence_score, 2),
        "source": source
    }

async def safe_ml_inference(db, user_id: str) -> Optional[float]:
    """
    Fully wrapped model loading + feature extraction + prediction.
    Never allows router to crash. Returns None on ANY failure.
    """
    try:
        engine = get_inference_engine()
        if engine.status != "active":
            return None
            
        vector = await get_user_feature_vector(db, user_id)
        if vector is None:
            return None
            
        return engine.predict(vector)
    except Exception as e:
        logger.exception(f"Safe ML Inference failure for user {user_id}: {str(e)}")
        return None

async def capture_inference_snapshot(db, attempt_id: Any, user_id: str) -> Optional[InferenceSnapshot]:
    """
    Captures a full AI inference snapshot for a given attempt.
    Atomic-ready but must be saved by the caller.
    """
    try:
        start_time = time.time()
        engine = get_inference_engine()
        
        # 1. Feature Extraction
        vector = await get_user_feature_vector(db, user_id)
        if vector is None:
            return None
        
        # 2. ML Prediction
        ml_prob = engine.predict(vector)
        latency_ms = (time.time() - start_time) * 1000
        
        # 3. Hybrid Blending (Re-using centralized logic)
        # We extract components from vector to avoid re-calculating
        # VectorIndices: 0:readiness, 4:consistency, 2:retention, 6:resilience, 3:consolidation
        readiness_val = vector[0] if len(vector) > 0 else 0.0
        consistency_val = vector[4] if len(vector) > 4 else 0.0
        retention_val = vector[2] if len(vector) > 2 else 0.0
        resilience_val = vector[6] if len(vector) > 6 else 0.0
        
        # Calculate hybrid metadata
        hybrid = calculate_hybrid_probability(
            readiness_score=readiness_val,
            adaptive_performance_score=readiness_val, # Proxy if not available separately
            consistency_score_pp=consistency_val,
            training_level_weight=10.0, # Constant/Default
            pressure_resilience=resilience_val / 100.0,
            ml_prob=ml_prob,
            auc_score=engine.auc_score,
            drift_status=engine.drift_status
        )
        
        # 4. Create Snapshot Object
        snapshot = InferenceSnapshot(
            attempt_id=attempt_id,
            pass_probability=hybrid["pass_probability"],
            probability_source=hybrid["source"],
            confidence=hybrid["confidence_score"],
            readiness_score=readiness_val,
            cognitive_stability=consistency_val,
            retention_score=retention_val,
            drift_state=engine.drift_status,
            model_version=engine.version,
            inference_latency_ms=round(latency_ms, 2)
        )
        
        return snapshot
        
    except Exception as e:
        logger.exception(f"Failed to capture inference snapshot for attempt {attempt_id}: {str(e)}")
        return None
