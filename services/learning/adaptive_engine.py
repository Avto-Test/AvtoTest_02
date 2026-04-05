"""
Adaptive learning session generation.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import random
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.attempt import Attempt
from models.question import Question
from models.review_queue import ReviewQueue
from models.user_question_history import UserQuestionHistory
from services.learning.intelligence_metrics import attempt_score_percent, training_level_from_percent
from services.learning.topic_analysis import detect_weak_topics

RECENT_REPEAT_LOOKBACK_DAYS = 7


@dataclass(slots=True)
class AdaptiveSessionPlan:
    questions: list[Question]
    weak_topic_ids: list[UUID]


def _matches_focus(question: Question, focus_topic_ids: list[UUID]) -> bool:
    if not focus_topic_ids:
        return True
    return question.category_id in focus_topic_ids


def _is_due(review_entry: ReviewQueue, now_utc: datetime) -> bool:
    next_review_at = review_entry.next_review_at
    if next_review_at.tzinfo is None:
        next_review_at = next_review_at.replace(tzinfo=timezone.utc)
    return next_review_at <= now_utc


def _days_since(moment: datetime | None, now_utc: datetime) -> float:
    if moment is None:
        return 30.0
    normalized = moment if moment.tzinfo is not None else moment.replace(tzinfo=timezone.utc)
    return max((now_utc - normalized).total_seconds() / 86_400, 0.0)


def _difficulty_value(question: Question) -> float:
    if question.dynamic_difficulty_score is not None:
        return float(question.dynamic_difficulty_score)
    if question.total_attempts > 0:
        wrong_answers = max(int(question.total_attempts) - int(question.total_correct), 0)
        return float(wrong_answers) / float(question.total_attempts)
    return float(question.dynamic_difficulty_score or 0.5)


def _pick_questions(
    *,
    source: list[Question],
    target_count: int,
    selected_ids: set[UUID],
    recent_ids: set[UUID],
    sorter,
) -> list[Question]:
    if target_count <= 0:
        return []

    fresh_candidates = [question for question in source if question.id not in selected_ids and question.id not in recent_ids]
    stale_candidates = [question for question in source if question.id not in selected_ids and question.id in recent_ids]

    fresh_candidates.sort(key=sorter)
    stale_candidates.sort(key=sorter)

    picked = fresh_candidates[:target_count]
    if len(picked) < target_count:
        picked.extend(stale_candidates[: target_count - len(picked)])
    return picked


def _review_priority(
    question: Question,
    *,
    review_entry: ReviewQueue,
    history_row: UserQuestionHistory | None,
    now_utc: datetime,
) -> tuple[float, float, float, str]:
    next_review_at = review_entry.next_review_at
    if next_review_at.tzinfo is None:
        next_review_at = next_review_at.replace(tzinfo=timezone.utc)

    overdue_days = max((now_utc - next_review_at).total_seconds() / 86_400, 0.0)
    interval_days = max(int(review_entry.interval_days or 1), 1)
    forgetting_pressure = min(overdue_days / interval_days, 3.0)
    recency_pressure = min(_days_since(history_row.last_seen_at if history_row else None, now_utc) / interval_days, 3.0)
    wrong_pressure = 1.0 if (review_entry.last_result or "wrong").lower() != "correct" else 0.2
    history_pressure = 0.0
    if history_row is not None and history_row.attempt_count > 0:
        history_pressure = 1.0 - (float(history_row.correct_count or 0) / float(history_row.attempt_count))

    priority = (
        wrong_pressure * 1.6
        + forgetting_pressure * 1.25
        + recency_pressure * 0.7
        + history_pressure * 0.9
        + _difficulty_value(question) * 0.5
    )
    return (-priority, -history_pressure, -_difficulty_value(question), str(question.id))


def _weak_topic_priority(
    question: Question,
    *,
    review_entry: ReviewQueue | None,
    history_row: UserQuestionHistory | None,
    now_utc: datetime,
) -> tuple[float, float, float, str]:
    accuracy_gap = 1.0
    seen_days = 30.0
    if history_row is not None and history_row.attempt_count > 0:
        accuracy_gap = 1.0 - (float(history_row.correct_count or 0) / float(history_row.attempt_count))
        seen_days = _days_since(history_row.last_seen_at, now_utc)

    review_boost = 0.0
    if review_entry is not None:
        review_boost = 1.0 if _is_due(review_entry, now_utc) else 0.35

    priority = accuracy_gap * 1.4 + review_boost + min(seen_days / 14.0, 1.0) * 0.5 + _difficulty_value(question)
    return (-priority, -accuracy_gap, -_difficulty_value(question), str(question.id))


async def generate_adaptive_session(
    user_id: UUID,
    *,
    db: AsyncSession,
    question_count: int = 20,
    focus_topic_ids: list[UUID] | None = None,
) -> AdaptiveSessionPlan:
    detected_weak_topic_ids = await detect_weak_topics(user_id, db)
    active_focus_ids = [topic_id for topic_id in (focus_topic_ids or []) if topic_id is not None]
    weak_topic_ids = active_focus_ids or detected_weak_topic_ids
    now_utc = datetime.now(timezone.utc)

    questions_result = await db.execute(
        select(Question)
        .options(selectinload(Question.answer_options))
        .where(Question.answer_options.any())
    )
    all_questions = list(questions_result.scalars().all())

    history_rows = (
        await db.execute(select(UserQuestionHistory).where(UserQuestionHistory.user_id == user_id))
    ).scalars().all()
    history_map = {row.question_id: row for row in history_rows}
    review_rows = (
        await db.execute(select(ReviewQueue).where(ReviewQueue.user_id == user_id))
    ).scalars().all()
    review_map = {row.question_id: row for row in review_rows}

    recent_cutoff = now_utc - timedelta(days=RECENT_REPEAT_LOOKBACK_DAYS)
    recent_ids = {
        row.question_id
        for row in history_rows
        if row.last_seen_at is not None and row.last_seen_at >= recent_cutoff
    }

    focus_pool = [question for question in all_questions if _matches_focus(question, active_focus_ids)]
    due_pool = [
        question
        for question in focus_pool
        if (review_entry := review_map.get(question.id)) is not None and _is_due(review_entry, now_utc)
    ]
    weak_pool = [question for question in focus_pool if question.category_id in weak_topic_ids]
    medium_pool = [
        question
        for question in all_questions
        if 0.35 <= _difficulty_value(question) <= 0.65
    ]
    unseen_pool = [
        question
        for question in all_questions
        if question.id not in history_map
    ]

    if active_focus_ids:
        focus_target = min(question_count, max(1, int(round(question_count * 0.8))))
        due_target = min(len(due_pool), focus_target)
        weak_target = max(focus_target - due_target, 0)
        medium_target = min(max(question_count - focus_target - 1, 0), int(round(question_count * 0.1)))
    else:
        due_target = min(len(due_pool), max(0, int(round(question_count * 0.3)))) if due_pool else 0
        weak_target = min(
            max(question_count - due_target, 0),
            int(round(question_count * 0.6)) if weak_topic_ids else 0,
        )
        medium_target = min(
            max(question_count - due_target - weak_target, 0),
            int(round(question_count * 0.3)),
        )
    unseen_target = max(question_count - due_target - weak_target - medium_target, 0)

    random.shuffle(unseen_pool)
    selected_ids: set[UUID] = set()
    selected_questions: list[Question] = []

    due_selection = _pick_questions(
        source=due_pool,
        target_count=due_target,
        selected_ids=selected_ids,
        recent_ids=set(),
        sorter=lambda question: _review_priority(
            question,
            review_entry=review_map[question.id],
            history_row=history_map.get(question.id),
            now_utc=now_utc,
        ),
    )
    for question in due_selection:
        selected_questions.append(question)
        selected_ids.add(question.id)

    weak_selection = _pick_questions(
        source=weak_pool,
        target_count=weak_target,
        selected_ids=selected_ids,
        recent_ids=recent_ids,
        sorter=lambda question: _weak_topic_priority(
            question,
            review_entry=review_map.get(question.id),
            history_row=history_map.get(question.id),
            now_utc=now_utc,
        ),
    )
    for question in weak_selection:
        selected_questions.append(question)
        selected_ids.add(question.id)

    medium_selection = _pick_questions(
        source=medium_pool,
        target_count=medium_target,
        selected_ids=selected_ids,
        recent_ids=recent_ids,
        sorter=lambda question: (abs(_difficulty_value(question) - 0.5), str(question.id)),
    )
    for question in medium_selection:
        selected_questions.append(question)
        selected_ids.add(question.id)

    unseen_selection = _pick_questions(
        source=unseen_pool,
        target_count=unseen_target,
        selected_ids=selected_ids,
        recent_ids=recent_ids,
        sorter=lambda question: random.random(),
    )
    for question in unseen_selection:
        selected_questions.append(question)
        selected_ids.add(question.id)

    if len(selected_questions) < question_count:
        remainder = _pick_questions(
            source=all_questions,
            target_count=question_count - len(selected_questions),
            selected_ids=selected_ids,
            recent_ids=recent_ids,
            sorter=lambda question: (
                abs(_difficulty_value(question) - 0.55),
                str(question.id),
            ),
        )
        for question in remainder:
            selected_questions.append(question)
            selected_ids.add(question.id)

    random.shuffle(selected_questions)
    return AdaptiveSessionPlan(
        questions=selected_questions[:question_count],
        weak_topic_ids=weak_topic_ids,
    )


async def derive_adaptive_training_level(
    user_id: UUID,
    *,
    db: AsyncSession,
) -> str:
    recent_rows = (
        await db.execute(
            select(Attempt.score, Attempt.question_count)
            .where(
                Attempt.user_id == user_id,
                Attempt.finished_at.is_not(None),
                Attempt.mode.in_(("adaptive", "learning")),
            )
            .order_by(Attempt.finished_at.desc())
            .limit(5)
        )
    ).all()

    if not recent_rows:
        return "beginner"

    average_percent = sum(
        attempt_score_percent(row.score, row.question_count)
        for row in recent_rows
    ) / len(recent_rows)
    return training_level_from_percent(average_percent)
