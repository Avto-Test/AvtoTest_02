from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import log, sqrt
from statistics import pstdev
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from services.learning.intelligence_metrics import attempt_score_percent

SNAPSHOT_FEATURE_NAMES = [
    "last_score",
    "last_5_avg",
    "last_5_std",
    "improvement_rate",
    "total_attempts",
    "overall_accuracy",
    "avg_response_time",
    "response_time_variance",
    "weakest_topic_accuracy",
    "strongest_topic_accuracy",
    "topic_entropy",
    "consistency_score",
]

FEATURE_COUNT = len(SNAPSHOT_FEATURE_NAMES)
FEATURE_VERSION = 1


@dataclass(slots=True)
class ReadinessFeatures:
    last_score: float
    last_5_avg: float
    last_5_std: float
    improvement_rate: float
    total_attempts: int
    overall_accuracy: float
    avg_response_time: float
    response_time_variance: float
    weakest_topic_accuracy: float
    strongest_topic_accuracy: float
    topic_entropy: float
    consistency_score: float
    last_activity_time: datetime | None
    readiness_score: float
    readiness_label: str


def _ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def readiness_label(score: float) -> str:
    if score >= 80:
        return "Non-ML readiness strong"
    if score >= 60:
        return "Non-ML readiness building"
    if score >= 40:
        return "Non-ML readiness emerging"
    return "Non-ML readiness low"


def build_feature_dict(features: ReadinessFeatures) -> dict[str, float | int]:
    return {
        "last_score": round(features.last_score, 4),
        "last_5_avg": round(features.last_5_avg, 4),
        "last_5_std": round(features.last_5_std, 4),
        "improvement_rate": round(features.improvement_rate, 4),
        "total_attempts": int(features.total_attempts),
        "overall_accuracy": round(features.overall_accuracy, 4),
        "avg_response_time": round(features.avg_response_time, 4),
        "response_time_variance": round(features.response_time_variance, 4),
        "weakest_topic_accuracy": round(features.weakest_topic_accuracy, 4),
        "strongest_topic_accuracy": round(features.strongest_topic_accuracy, 4),
        "topic_entropy": round(features.topic_entropy, 6),
        "consistency_score": round(features.consistency_score, 4),
    }


def build_feature_vector(features: ReadinessFeatures) -> list[float]:
    mapping = build_feature_dict(features)
    return [float(mapping[name]) for name in SNAPSHOT_FEATURE_NAMES]


def readiness_score_from_features(features: ReadinessFeatures) -> float:
    return round(features.readiness_score, 1)


def readiness_score_from_snapshot(snapshot: Any) -> float:
    synthetic = ReadinessFeatures(
        last_score=float(getattr(snapshot, "last_score", 0.0) or 0.0),
        last_5_avg=float(getattr(snapshot, "last_5_avg", 0.0) or 0.0),
        last_5_std=float(getattr(snapshot, "last_5_std", 0.0) or 0.0),
        improvement_rate=float(getattr(snapshot, "improvement_rate", 0.0) or 0.0),
        total_attempts=int(getattr(snapshot, "total_attempts", 0) or 0),
        overall_accuracy=float(getattr(snapshot, "overall_accuracy", 0.0) or 0.0),
        avg_response_time=float(getattr(snapshot, "avg_response_time", 0.0) or 0.0),
        response_time_variance=float(getattr(snapshot, "response_time_variance", 0.0) or 0.0),
        weakest_topic_accuracy=float(getattr(snapshot, "weakest_topic_accuracy", 0.0) or 0.0),
        strongest_topic_accuracy=float(getattr(snapshot, "strongest_topic_accuracy", 0.0) or 0.0),
        topic_entropy=float(getattr(snapshot, "topic_entropy", 0.0) or 0.0),
        consistency_score=float(getattr(snapshot, "consistency_score", 0.0) or 0.0),
        last_activity_time=_ensure_utc(getattr(snapshot, "last_activity_time", None)),
        readiness_score=0.0,
        readiness_label="",
    )
    return _derive_readiness_score(synthetic)


def _normalized_topic_entropy(topic_counts: dict[str, int]) -> float:
    total = sum(topic_counts.values())
    if total <= 0 or len(topic_counts) <= 1:
        return 0.0

    entropy = 0.0
    for count in topic_counts.values():
        probability = count / total
        if probability > 0:
            entropy -= probability * log(probability)
    return max(0.0, min(1.0, entropy / log(len(topic_counts))))


def _derive_readiness_score(features: ReadinessFeatures) -> float:
    volume_component = min(features.total_attempts / 10.0, 1.0) * 100.0
    trend_component = _clamp(50.0 + (features.improvement_rate * 8.0))
    readiness_score = (
        (features.overall_accuracy * 0.45)
        + (features.last_5_avg * 0.25)
        + (features.consistency_score * 0.15)
        + (volume_component * 0.10)
        + (trend_component * 0.05)
    )
    return round(_clamp(readiness_score), 1)


async def compute_user_readiness_features(
    db: AsyncSession,
    user_id,
    *,
    as_of: datetime | None = None,
) -> ReadinessFeatures:
    as_of = _ensure_utc(as_of) or datetime.now(timezone.utc)

    attempts = (
        await db.execute(
            select(Attempt)
            .where(
                Attempt.user_id == user_id,
                Attempt.finished_at.is_not(None),
                Attempt.finished_at <= as_of,
            )
            .order_by(Attempt.finished_at.desc())
        )
    ).scalars().all()

    if not attempts:
        return ReadinessFeatures(
            last_score=0.0,
            last_5_avg=0.0,
            last_5_std=0.0,
            improvement_rate=0.0,
            total_attempts=0,
            overall_accuracy=0.0,
            avg_response_time=0.0,
            response_time_variance=0.0,
            weakest_topic_accuracy=0.0,
            strongest_topic_accuracy=0.0,
            topic_entropy=0.0,
            consistency_score=0.0,
            last_activity_time=None,
            readiness_score=0.0,
            readiness_label=readiness_label(0.0),
        )

    recent_attempts = attempts[:5]
    recent_scores = [attempt_score_percent(item.score, item.question_count) for item in recent_attempts]
    last_score = recent_scores[0] if recent_scores else 0.0
    last_5_avg = sum(recent_scores) / len(recent_scores) if recent_scores else 0.0
    last_5_std = pstdev(recent_scores) if len(recent_scores) >= 2 else 0.0
    improvement_rate = 0.0
    if len(recent_scores) >= 2:
        improvement_rate = (recent_scores[0] - recent_scores[-1]) / max(1, len(recent_scores) - 1)

    answer_rows = (
        await db.execute(
            select(
                AttemptAnswer.is_correct,
                AttemptAnswer.response_time_ms,
                AttemptAnswer.answered_at,
                AttemptAnswer.topic_label,
            )
            .join(Attempt, AttemptAnswer.attempt_id == Attempt.id)
            .where(
                Attempt.user_id == user_id,
                Attempt.finished_at.is_not(None),
                Attempt.finished_at <= as_of,
            )
        )
    ).all()

    total_answers = len(answer_rows)
    correct_answers = sum(1 for row in answer_rows if bool(row.is_correct))
    overall_accuracy = (correct_answers / total_answers * 100.0) if total_answers else 0.0

    response_times = [float(row.response_time_ms) for row in answer_rows if row.response_time_ms is not None]
    if response_times:
        avg_response_time = sum(response_times) / len(response_times)
        response_time_variance = (
            sum((value - avg_response_time) ** 2 for value in response_times) / len(response_times)
        )
    else:
        attempt_response_times = [float(item.avg_response_time) for item in attempts if item.avg_response_time is not None]
        avg_response_time = sum(attempt_response_times) / len(attempt_response_times) if attempt_response_times else 0.0
        attempt_variances = [float(item.response_time_variance) for item in attempts if item.response_time_variance is not None]
        response_time_variance = sum(attempt_variances) / len(attempt_variances) if attempt_variances else 0.0

    topic_totals: dict[str, int] = {}
    topic_correct: dict[str, int] = {}
    last_activity_time = _ensure_utc(attempts[0].finished_at)
    for row in answer_rows:
        topic = (row.topic_label or "General").strip() or "General"
        topic_totals[topic] = topic_totals.get(topic, 0) + 1
        topic_correct[topic] = topic_correct.get(topic, 0) + (1 if bool(row.is_correct) else 0)
        answered_at = _ensure_utc(row.answered_at)
        if answered_at is not None and (last_activity_time is None or answered_at > last_activity_time):
            last_activity_time = answered_at

    topic_accuracies = [
        (topic_correct[topic] / total * 100.0)
        for topic, total in topic_totals.items()
        if total > 0
    ]
    weakest_topic_accuracy = min(topic_accuracies) if topic_accuracies else 0.0
    strongest_topic_accuracy = max(topic_accuracies) if topic_accuracies else 0.0
    topic_entropy = _normalized_topic_entropy(topic_totals)

    score_consistency_component = max(0.0, min(1.0, 1.0 - (last_5_std / 30.0)))
    rt_spread = sqrt(response_time_variance) if response_time_variance > 0 else 0.0
    response_consistency_component = max(0.0, min(1.0, 1.0 - (rt_spread / 5000.0)))
    consistency_score = ((score_consistency_component * 0.7) + (response_consistency_component * 0.3)) * 100.0
    consistency_score = round(_clamp(consistency_score), 1)

    features = ReadinessFeatures(
        last_score=round(_clamp(last_score), 4),
        last_5_avg=round(_clamp(last_5_avg), 4),
        last_5_std=round(max(0.0, last_5_std), 4),
        improvement_rate=round(improvement_rate, 4),
        total_attempts=len(attempts),
        overall_accuracy=round(_clamp(overall_accuracy), 4),
        avg_response_time=round(max(0.0, avg_response_time), 4),
        response_time_variance=round(max(0.0, response_time_variance), 4),
        weakest_topic_accuracy=round(_clamp(weakest_topic_accuracy), 4),
        strongest_topic_accuracy=round(_clamp(strongest_topic_accuracy), 4),
        topic_entropy=round(topic_entropy, 6),
        consistency_score=consistency_score,
        last_activity_time=last_activity_time,
        readiness_score=0.0,
        readiness_label="",
    )
    features.readiness_score = _derive_readiness_score(features)
    features.readiness_label = readiness_label(features.readiness_score)
    return features
