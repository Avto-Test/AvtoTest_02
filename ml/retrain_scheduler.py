"""
AUTOTEST ML Retrain Scheduler
Monitors retraining thresholds and drift.
"""

import os
import json
import logging
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from models.attempt import Attempt
from ml.model_registry import get_inference_engine
from ml.train_pass_model import train_model

logger = logging.getLogger(__name__)

async def check_retrain_needed():
    """
    Check if retraining is required based on new data or drift.
    """
    engine = get_inference_engine()
    metadata = engine.metadata
    
    # 1. Threshold check: 50 new attempts since last training
    last_train_time = None
    if metadata and "trained_at" in metadata:
        last_train_time = datetime.fromisoformat(metadata["trained_at"])
    else:
        # No model trained yet, we should probably train one
        logger.info("No model metadata found. Triggering first training...")
        version = await train_model()
        return f"Trained first model: {version}"
        
    async for db in get_db():
        stmt = (
            select(func.count(Attempt.id))
            .where(Attempt.finished_at > last_train_time)
        )
        res = await db.execute(stmt)
        new_attempts_count = res.scalar() or 0
        
        logger.info(f"New attempts since last train: {new_attempts_count}")
        
        # Threshold: 50 new attempts
        if new_attempts_count >= 50:
            logger.info("Retrain threshold reached (50 new attempts). Starting retraining...")
            version = await train_model()
            return f"Retrained model version: {version}"
            
        # 2. Drift Monitoring (Phase 13)
        from ml.drift_detector import DriftMonitor
        monitor = DriftMonitor(db, engine)
        drift_report = await monitor.run_checks()
        
        if drift_report.get("status") == "severe":
            logger.warning("Severe drift detected. Triggering urgent retraining...")
            version = await train_model()
            return f"Retrained due to severe drift: {version}"
            
        # Legacy monitoring (deprecated by Phase 13 but kept as fallback)
        auc_score = metadata.get("auc_score", 1.0)
        if auc_score < 0.65:
            logger.warning(f"MODEL DRIFT DETECTED (Legacy): AUC ({auc_score}) dropped below 0.65 threshold. Setting model_status = 'degraded'.")
            return "Model marked as degraded due to legacy drift."
            
    return "Retraining not needed yet."

if __name__ == "__main__":
    import asyncio
    result = asyncio.run(check_retrain_needed())
    print(result)
