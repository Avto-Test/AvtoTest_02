"""
Pass probability prediction model for AUTOTEST analytics.

This module intentionally keeps computation lightweight and reuses
existing aggregates (attempt scores, question history, user skills).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import exp
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.logger import log_info
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.question import Question
from models.user_question_history import UserQuestionHistory
from models.user_topic_stats import UserTopicStats
from services.learning.intelligence_metrics import attempt_score_percent


@dataclass
class PassProbabilitySignals:
    recent_accuracy: float
    mastery_coverage: float
    retention_strength: float
    difficulty_performance: float
    weak_topic_ratio: float
    topic_balance: float
    learning_trend: float


@dataclass
class PassProbabilityResult:
    pass_probability: float  # 0 .. 100
    signals: PassProbabilitySignals


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def calculate_pass_probability_from_signals(
    recent_accuracy: float,
    mastery_coverage: float,
    retention_strength: float,
    difficulty_performance: float,
    weak_topic_ratio: float,
    learning_trend: float,
    topic_balance: float = 0.5,
) -> float:
    """
    Stable pass probability from normalized signals.
    Accuracy, coverage, and retention form the core signal while
    difficulty, topic balance, weak-topic load, and short-term trend
    apply smaller adjustments to avoid sudden jumps.
    """
    accuracy = _clamp(recent_accuracy, 0.0, 1.0)
    coverage = _clamp(mastery_coverage, 0.0, 1.0)
    retention = _clamp(retention_strength, 0.0, 1.0)
    difficulty = _clamp(difficulty_performance, 0.0, 1.0)
    weak_ratio = _clamp(weak_topic_ratio, 0.0, 1.0)
    balance = _clamp(topic_balance, 0.0, 1.0)
    trend = _clamp(learning_trend, -1.0, 1.0)

    core_signal = (accuracy * 0.45) + (coverage * 0.30) + (retention * 0.25)
    support_signal = (
        (difficulty - 0.5) * 0.10
        + (balance - 0.5) * 0.08
        - (weak_ratio * 0.10)
        + (trend * 0.05)
    )
    anchor_signal = (accuracy * 0.40) + (coverage * 0.35) + (retention * 0.25)
    probability = (core_signal * 0.72) + ((0.5 + support_signal) * 0.18) + (anchor_signal * 0.10)
    return _clamp(probability, 0.05, 0.95)


def _retention_ratio(last_attempt_at: datetime | None, now_utc: datetime) -> float:
    if last_attempt_at is None:
        return 0.45
    normalized = last_attempt_at if last_attempt_at.tzinfo is not None else last_attempt_at.replace(tzinfo=timezone.utc)
    days_since = max((now_utc - normalized).total_seconds() / 86_400, 0.0)
    return _clamp(exp(-days_since / 21.0), 0.15, 1.0)


async def calculate_pass_probability(
    user_id: UUID,
    db: AsyncSession,
    *,
    request_id: str | None = None,
) -> PassProbabilityResult:
    """
    Calculate user pass probability with a stable blended model.

    Core signal:
      - recent accuracy
      - mastery coverage
      - retention strength

    Smaller adjustments:
      - hard-question performance
      - topic balance
      - weak-topic load
      - short-term learning trend
    """
    attempts_rows = (
        await db.execute(
            select(Attempt.score, Attempt.question_count, Attempt.id)
            .where(
                Attempt.user_id == user_id,
                Attempt.finished_at.is_not(None),
                Attempt.score.is_not(None),
            )
            .order_by(Attempt.finished_at.desc())
            .limit(12)
        )
    ).all()

    score_pcts = [
        attempt_score_percent(row.score, row.question_count)
        for row in attempts_rows
    ]

    recent_accuracy = 0.0
    if score_pcts:
        window = score_pcts[:5]
        recent_accuracy = _clamp(sum(window) / len(window) / 100.0, 0.0, 1.0)

    difficulty_performance = 0.0
    hard_stats = (
        await db.execute(
            select(
                func.count(AttemptAnswer.id).label("total"),
                func.sum(case((AttemptAnswer.is_correct == True, 1), else_=0)).label("correct"),
            )
            .join(Attempt, Attempt.id == AttemptAnswer.attempt_id)
            .join(Question, Question.id == AttemptAnswer.question_id)
            .where(
                Attempt.user_id == user_id,
                Attempt.finished_at.is_not(None),
                # hard band by percent or fallback legacy difficulty label
                ((Question.difficulty_percent.is_not(None)) & (Question.difficulty_percent <= 33))
                | ((Question.difficulty_percent.is_(None)) & (Question.difficulty == "hard")),
            )
        )
    ).one()
    hard_total = int(hard_stats.total or 0)
    hard_correct = int(hard_stats.correct or 0)
    if hard_total > 0:
        difficulty_performance = _clamp(hard_correct / hard_total, 0.0, 1.0)

    mastery_stats = (
        await db.execute(
            select(
                func.count(UserQuestionHistory.question_id).label("seen"),
                func.sum(
                    case(
                        (
                            (UserQuestionHistory.correct_count >= 2)
                            & (UserQuestionHistory.attempt_count >= 2),
                            1,
                        ),
                        else_=0,
                    )
                ).label("mastered"),
            ).where(UserQuestionHistory.user_id == user_id)
        )
    ).one()
    seen_total = int(mastery_stats.seen or 0)
    mastered_total = int(mastery_stats.mastered or 0)
    mastery_coverage = _clamp((mastered_total / seen_total) if seen_total > 0 else 0.0, 0.0, 1.0)

    weak_topic_ratio = 0.0
    topic_balance = 0.0
    retention_strength = 0.45
    now_utc = datetime.now(timezone.utc)
    topic_rows = (
        await db.execute(
            select(UserTopicStats.accuracy_rate, UserTopicStats.total_attempts, UserTopicStats.last_attempt_at)
            .where(UserTopicStats.user_id == user_id)
            .limit(100)
        )
    ).all()
    if topic_rows:
        effective_accuracies: list[float] = []
        retention_values: list[float] = []
        weak_count = 0
        for row in topic_rows:
            attempts = max(int(row.total_attempts or 0), 0)
            coverage = _clamp(attempts / 12.0, 0.0, 1.0)
            accuracy = _clamp(float(row.accuracy_rate or 0.0), 0.0, 1.0)
            effective = _clamp((accuracy * 0.8) + (coverage * 0.2), 0.0, 1.0)
            effective_accuracies.append(effective)
            retention_values.append(_retention_ratio(row.last_attempt_at, now_utc))
            if accuracy < 0.55:
                weak_count += 1
        weak_topic_ratio = _clamp(weak_count / len(effective_accuracies), 0.0, 1.0)
        retention_strength = _clamp(sum(retention_values) / len(retention_values), 0.0, 1.0)

        avg_eff = sum(effective_accuracies) / len(effective_accuracies)
        variance = sum((value - avg_eff) ** 2 for value in effective_accuracies) / len(effective_accuracies)
        std_dev = variance ** 0.5
        topic_balance = _clamp(1.0 - std_dev, 0.0, 1.0)

    learning_trend = 0.0
    if len(score_pcts) >= 6:
        latest_avg = sum(score_pcts[:3]) / 3.0
        previous_avg = sum(score_pcts[3:6]) / 3.0
        learning_trend = _clamp((latest_avg - previous_avg) / 50.0, -1.0, 1.0)
    elif len(score_pcts) >= 2:
        learning_trend = _clamp((score_pcts[0] - score_pcts[1]) / 50.0, -1.0, 1.0)

    probability = calculate_pass_probability_from_signals(
        recent_accuracy=recent_accuracy,
        mastery_coverage=mastery_coverage,
        retention_strength=retention_strength,
        difficulty_performance=difficulty_performance,
        weak_topic_ratio=weak_topic_ratio,
        learning_trend=learning_trend,
        topic_balance=topic_balance,
    )

    result = PassProbabilityResult(
        pass_probability=round(probability * 100.0, 1),
        signals=PassProbabilitySignals(
            recent_accuracy=round(recent_accuracy, 4),
            mastery_coverage=round(mastery_coverage, 4),
            retention_strength=round(retention_strength, 4),
            difficulty_performance=round(difficulty_performance, 4),
            weak_topic_ratio=round(weak_topic_ratio, 4),
            topic_balance=round(topic_balance, 4),
            learning_trend=round(learning_trend, 4),
        ),
    )

    if request_id is not None:
        log_info(
            "ml",
            "prediction_generated",
            request_id,
            user_id=user_id,
            metadata={
                "probability": result.pass_probability,
                "topics_count": len(topic_rows),
            },
        )

    return result
