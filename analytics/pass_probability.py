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
from models.user_skill import UserSkill


@dataclass
class PassProbabilitySignals:
    recent_accuracy: float
    difficulty_performance: float
    mastery_coverage: float
    weak_topic_ratio: float
    topic_balance: float
    learning_trend: float


@dataclass
class PassProbabilityResult:
    pass_probability: float  # 0.05 .. 0.95
    signals: PassProbabilitySignals


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def calculate_pass_probability_from_signals(
    recent_accuracy: float,
    difficulty_performance: float,
    mastery_coverage: float,
    weak_topic_ratio: float,
    learning_trend: float,
    retention_strength: float | None = None,
    topic_balance: float | None = None,
) -> float:
    """
    Logistic probability from normalized signals.

    Extra dashboard signals are accepted for API compatibility. The
    current lightweight model does not weight them directly yet.
    Returns 0.05 .. 0.95
    """
    z = (
        (0.35 * _clamp(recent_accuracy, 0.0, 1.0))
        + (0.25 * _clamp(difficulty_performance, 0.0, 1.0))
        + (0.20 * _clamp(mastery_coverage, 0.0, 1.0))
        - (0.15 * _clamp(weak_topic_ratio, 0.0, 1.0))
        + (0.05 * _clamp(learning_trend, -1.0, 1.0))
    )
    _ = retention_strength, topic_balance
    probability = 1.0 / (1.0 + exp(-z))
    return _clamp(probability, 0.05, 0.95)


async def calculate_pass_probability(
    user_id: UUID,
    db: AsyncSession,
    *,
    request_id: str | None = None,
) -> PassProbabilityResult:
    """
    Calculate user pass probability with a lightweight logistic model.

    Model:
      z = 0.35 * recent_accuracy
        + 0.25 * difficulty_performance
        + 0.20 * mastery_coverage
        - 0.15 * weak_topic_ratio
        + 0.05 * learning_trend
      p = sigmoid(z), clamped to [0.05, 0.95]
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
        (float(row.score) / max(1, int(row.question_count or 20))) * 100.0
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
    skill_rows = (
        await db.execute(
            select(UserSkill.skill_score, UserSkill.last_practice_at)
            .where(UserSkill.user_id == user_id)
            .limit(100)
        )
    ).all()
    if skill_rows:
        now_utc = datetime.now(timezone.utc)
        effective_skills: list[float] = []
        weak_count = 0
        for row in skill_rows:
            last_practice = row.last_practice_at
            if last_practice is None:
                days_since = 30.0
            else:
                if last_practice.tzinfo is None:
                    last_practice = last_practice.replace(tzinfo=timezone.utc)
                days_since = max(0.0, (now_utc - last_practice).total_seconds() / 86400.0)
            decay = exp(-0.05 * days_since)
            effective = _clamp(float(row.skill_score) * decay, 0.0, 1.0)
            effective_skills.append(effective)
            if effective < 0.55:
                weak_count += 1
        weak_topic_ratio = _clamp(weak_count / len(effective_skills), 0.0, 1.0)

        avg_eff = sum(effective_skills) / len(effective_skills)
        variance = sum((value - avg_eff) ** 2 for value in effective_skills) / len(effective_skills)
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
        difficulty_performance=difficulty_performance,
        mastery_coverage=mastery_coverage,
        weak_topic_ratio=weak_topic_ratio,
        learning_trend=learning_trend,
    )

    result = PassProbabilityResult(
        pass_probability=round(probability, 4),
        signals=PassProbabilitySignals(
            recent_accuracy=round(recent_accuracy, 4),
            difficulty_performance=round(difficulty_performance, 4),
            mastery_coverage=round(mastery_coverage, 4),
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
                "topics_count": len(skill_rows),
            },
        )

    return result
