"""
Shared intelligence and attempt-metric helpers.

These helpers keep adaptive analytics on a single scale:
    - score/readiness/pass probability: 0..100
    - pressure resilience ratio: 0..1 internally, 0..100 when exposed
"""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def resolve_attempt_question_count(
    question_count: int | None,
    *,
    question_ids: Iterable[Any] | None = None,
    answered_count: int | None = None,
    score: int | float | None = None,
) -> int:
    if question_count is not None and int(question_count) > 0:
        return int(question_count)

    if question_ids is not None:
        try:
            ids_count = len(list(question_ids))
        except TypeError:
            ids_count = 0
        if ids_count > 0:
            return ids_count

    if answered_count is not None and int(answered_count) > 0:
        return int(answered_count)

    if score is not None and float(score) > 0:
        return max(1, int(float(score)))

    return 1


def attempt_score_percent(
    score: int | float | None,
    question_count: int | None,
    *,
    question_ids: Iterable[Any] | None = None,
    answered_count: int | None = None,
) -> float:
    total = resolve_attempt_question_count(
        question_count,
        question_ids=question_ids,
        answered_count=answered_count,
        score=score,
    )
    numeric_score = float(score or 0.0)
    return clamp((numeric_score / max(1, total)) * 100.0, 0.0, 100.0)


def pressure_resilience_ratio(
    avg_response_time: float | None,
    response_time_variance: float | None,
) -> float:
    avg_rt = float(avg_response_time or 0.0)
    variance = float(response_time_variance or 0.0)
    if avg_rt <= 0 or variance <= 0:
        return 1.0
    normalized_variance = variance / (avg_rt**2)
    return clamp(1.0 - normalized_variance, 0.0, 1.0)


def pressure_resilience_percent(
    avg_response_time: float | None,
    response_time_variance: float | None,
) -> float:
    return round(pressure_resilience_ratio(avg_response_time, response_time_variance) * 100.0, 1)


def training_level_from_percent(avg_adaptive_percent: float | None) -> str:
    score = float(avg_adaptive_percent or 0.0)
    if score >= 85.0:
        return "advanced"
    if score >= 60.0:
        return "intermediate"
    return "beginner"


def training_level_encoded(level: str | None) -> float:
    normalized = (level or "beginner").strip().lower()
    if normalized == "advanced":
        return 2.0
    if normalized == "intermediate":
        return 1.0
    return 0.0


def training_level_weight(level: str | float | int | None) -> float:
    if isinstance(level, (int, float)):
        numeric = float(level)
        if numeric >= 2:
            return 100.0
        if numeric >= 1:
            return 75.0
        return 50.0

    normalized = (level or "beginner").strip().lower()
    if normalized == "advanced":
        return 100.0
    if normalized == "intermediate":
        return 75.0
    return 50.0


def difficulty_adaptation_score(avg_adaptive_percent: float | None) -> float:
    score = float(avg_adaptive_percent or 0.0)
    if score <= 0:
        return 0.0
    return clamp((score / 75.0) * 100.0, 0.0, 100.0)


def pass_prediction_label(probability_percent: float | None) -> str:
    probability = float(probability_percent or 0.0)
    if probability >= 90.0:
        return "Imtihonga tayyor"
    if probability >= 75.0:
        return "Yaxshi daraja"
    if probability >= 55.0:
        return "Qo'shimcha mashq kerak"
    return "Xavf yuqori"
