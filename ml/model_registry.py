"""Disabled ML registry kept for compatibility while data infra is being built."""

from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from models.attempt import Attempt
from models.user_prediction_snapshot import UserPredictionSnapshot
from services.ml_data.readiness import FEATURE_COUNT, FEATURE_VERSION, SNAPSHOT_FEATURE_NAMES
from services.ml_data.snapshot_service import create_prediction_snapshot

FEATURE_NAMES = list(SNAPSHOT_FEATURE_NAMES)


@dataclass(slots=True)
class InferenceEngineState:
    model: None = None
    metadata: dict[str, Any] | None = None
    version: str = "data-readiness-v1"
    auc_score: float = 0.0
    drift_status: str = "disabled"
    drift_state: dict[str, Any] | None = None
    status: str = "disabled"


class InferenceEngine:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._state = InferenceEngineState(drift_state={})
        return cls._instance

    @property
    def model(self):
        return self._state.model

    @property
    def metadata(self):
        return self._state.metadata

    @property
    def version(self):
        return self._state.version

    @property
    def auc_score(self):
        return self._state.auc_score

    @property
    def drift_status(self):
        return self._state.drift_status

    @property
    def drift_state(self):
        return self._state.drift_state or {}

    @property
    def status(self):
        return self._state.status

    def load_latest_model(self) -> None:
        self._state = InferenceEngineState(drift_state={})

    def predict(self, feature_vector: list[float]) -> Optional[float]:
        return None

    def fallback_to_rule_engine(self) -> None:
        self._state.status = "disabled"


def get_inference_engine() -> InferenceEngine:
    return InferenceEngine()


def calculate_readiness_score(
    avg_recent_pct: float,
    topic_consistency_score: float,
    difficulty_adaptation_score: float,
) -> float:
    readiness = (
        (0.5 * float(avg_recent_pct))
        + (0.3 * float(topic_consistency_score))
        + (0.2 * float(difficulty_adaptation_score))
    )
    return round(max(0.0, min(100.0, readiness)), 1)


def calculate_hybrid_probability(
    readiness_score: float,
    adaptive_performance_score: float,
    consistency_score_pp: float,
    training_level_weight: float,
    pressure_resilience: float,
    ml_prob: Optional[float],
    auc_score: float,
    drift_status: str,
) -> dict[str, Any]:
    signal = (
        (float(readiness_score) * 0.5)
        + (float(adaptive_performance_score) * 0.2)
        + (float(consistency_score_pp) * 0.2)
        + (float(training_level_weight) * 0.05)
        + (float(pressure_resilience) * 100.0 * 0.05)
    )
    signal = round(max(0.0, min(100.0, signal)), 1)
    return {
        "pass_probability": signal,
        "rule_prob": signal,
        "ml_prob": None,
        "confidence_score": 0.0,
        "source": "non_ml_readiness",
    }


async def safe_ml_inference(db: AsyncSession, user_id: str) -> Optional[float]:
    return None


async def capture_inference_snapshot(
    db: AsyncSession,
    attempt_id: Any,
    user_id: str,
) -> Optional[UserPredictionSnapshot]:
    attempt = await db.get(Attempt, attempt_id)
    snapshot_time = getattr(attempt, "finished_at", None)
    snapshot, _ = await create_prediction_snapshot(
        db,
        user_id=user_id,
        snapshot_time=snapshot_time,
        trigger_source="attempt_completion",
        attempt_id=attempt_id,
    )
    return snapshot
