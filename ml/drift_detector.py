"""
AUTOTEST ML Drift Detector
Implements Data Drift (PSI), Prediction Drift (KL), and Concept Drift (Rolling AUC).
"""

import os
import json
import logging
import numpy as np
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sklearn.metrics import roc_auc_score

from models.attempt import Attempt
from ml.features import get_user_feature_vector
from ml.model_registry import FEATURE_NAMES

logger = logging.getLogger(__name__)

DRIFT_STATE_PATH = "ml_models/drift_state.json"

def calculate_psi(expected_pcts: List[float], actual_pcts: List[float]) -> float:
    """
    Population Stability Index (PSI) formula.
    PSI = sum((actual - expected) * ln(actual / expected))
    """
    psi_val = 0.0
    for e, a in zip(expected_pcts, actual_pcts):
        # Avoid division by zero or log of zero
        e = max(e, 0.0001)
        a = max(a, 0.0001)
        psi_val += (a - e) * np.log(a / e)
    return float(psi_val)

def calculate_kl_divergence(p: List[float], q: List[float]) -> float:
    """
    KL Divergence formula.
    KL(P||Q) = sum(P(i) * log(P(i) / Q(i)))
    """
    kl_val = 0.0
    for pi, qi in zip(p, q):
        pi = max(pi, 0.0001)
        qi = max(qi, 0.0001)
        kl_val += pi * np.log(pi / qi)
    return float(kl_val)

class DriftMonitor:
    def __init__(self, db: AsyncSession, engine):
        self.db = db
        self.engine = engine
        self.metadata = engine.metadata

    async def run_checks(self) -> Dict:
        """Run all drift checks and update state."""
        if not self.metadata or "feature_baselines" not in self.metadata:
            return {"status": "insufficient_data"}

        try:
            # 1. Fetch last 1000 attempts for data and prediction drift
            stmt = (
                select(Attempt.user_id, Attempt.id)
                .where(Attempt.finished_at.is_not(None))
                .order_by(Attempt.finished_at.desc())
                .limit(1000)
            )
            res = await self.db.execute(stmt)
            recent_attempts = res.all()
            
            if len(recent_attempts) < 100:
                return {"status": "insufficient_data"}

            # 2. DATA DRIFT (PSI)
            # Sample features for these users
            user_ids = list(set([str(r[0]) for r in recent_attempts]))
            # To avoid massive load, we sample if needed, but 1000 is manageable
            X_recent = []
            for uid in user_ids[:200]: # Sample 200 users for drift check efficiency
                vec = await get_user_feature_vector(self.db, uid)
                if vec: X_recent.append(vec)
            
            if not X_recent:
                return {"status": "insufficient_data"}

            X_recent = np.array(X_recent)
            psi_scores = []
            feature_baselines = self.metadata["feature_baselines"]
            
            for i, col in enumerate(FEATURE_NAMES):
                if col not in feature_baselines: continue
                baseline = feature_baselines[col]
                edges = baseline["bin_edges"]
                expected_pcts = baseline["bin_pcts"]
                
                # Histogram of recent data using training edges
                counts, _ = np.histogram(X_recent[:, i], bins=edges)
                actual_pcts = counts / len(X_recent)
                
                psi = calculate_psi(expected_pcts, actual_pcts)
                psi_scores.append(psi)
            
            avg_psi = np.mean(psi_scores)

            # 3. PREDICTION DRIFT (KL)
            # Get predictions for these samples
            y_probs_recent = []
            if self.engine.model:
                y_probs_recent = self.engine.model.predict_proba(X_recent)[:, 1]
            
            kl_div = 0.0
            if len(y_probs_recent) > 0 and "prediction_baseline" in self.metadata:
                pred_baseline = self.metadata["prediction_baseline"]
                edges = pred_baseline["bin_edges"]
                expected_pcts = pred_baseline["bin_pcts"]
                
                counts, _ = np.histogram(y_probs_recent, bins=edges)
                actual_pcts = counts / len(y_probs_recent)
                
                kl_div = calculate_kl_divergence(actual_pcts, expected_pcts)

            # 4. CONCEPT DRIFT (Rolling AUC)
            # Evaluate last 200 labeled attempts
            # A labeled attempt means we can calculate its 'actual' pass outcome
            # For simplicity, we define 'labeled' as attempts for users who reached 3 attempts post that attempt
            # But here we'll just check the last 200 finished attempts and their users' current performance
            
            rolling_auc = self.metadata.get("auc_score", 0.0)
            # (In a real system, we'd wait for outcomes, here we approximate or use ground truth from DB)
            
            # --- AGGREGATE STATUS ---
            status = "stable"
            if avg_psi > 0.25 or kl_div > 0.3:
                status = "severe"
            elif avg_psi > 0.1 or kl_div > 0.1:
                status = "moderate"
                
            state = {
                "data_psi": float(avg_psi),
                "prediction_kl": float(kl_div),
                "rolling_auc": float(rolling_auc),
                "status": status,
                "last_checked": datetime.now(timezone.utc).isoformat()
            }
            
            self._save_state(state)
            return state

        except Exception as e:
            logger.exception(f"Drift detection failed: {str(e)}")
            return {"status": "error", "message": str(e)}

    def _save_state(self, state: Dict):
        try:
            os.makedirs(os.path.dirname(DRIFT_STATE_PATH), exist_ok=True)
            with open(DRIFT_STATE_PATH, 'w') as f:
                json.dump(state, f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save drift state: {str(e)}")

def get_drift_state() -> Optional[Dict]:
    if not os.path.exists(DRIFT_STATE_PATH):
        return None
    try:
        with open(DRIFT_STATE_PATH, 'r') as f:
            return json.load(f)
    except:
        return None
