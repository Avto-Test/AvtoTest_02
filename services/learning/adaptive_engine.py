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

from models.question import Question
from models.question_difficulty import QuestionDifficulty
from models.user_question_history import UserQuestionHistory
from services.learning.topic_analysis import detect_weak_topics

RECENT_REPEAT_LOOKBACK_DAYS = 7


@dataclass(slots=True)
class AdaptiveSessionPlan:
    questions: list[Question]
    weak_topic_ids: list[UUID]


def _difficulty_value(question: Question, difficulty_map: dict[UUID, QuestionDifficulty]) -> float:
    metric = difficulty_map.get(question.id)
    if metric is not None:
        return float(metric.difficulty_score)
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

    if active_focus_ids:
        weak_target = int(round(question_count * 0.8))
        medium_target = int(round(question_count * 0.1))
    else:
        weak_target = int(round(question_count * 0.6)) if weak_topic_ids else 0
        medium_target = int(round(question_count * 0.3))
    unseen_target = max(question_count - weak_target - medium_target, 0)

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

    difficulty_rows = (
        await db.execute(select(QuestionDifficulty).where(QuestionDifficulty.question_id.in_([question.id for question in all_questions])))
    ).scalars().all() if all_questions else []
    difficulty_map = {row.question_id: row for row in difficulty_rows}

    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=RECENT_REPEAT_LOOKBACK_DAYS)
    recent_ids = {
        row.question_id
        for row in history_rows
        if row.last_seen_at is not None and row.last_seen_at >= recent_cutoff
    }

    weak_pool = [question for question in all_questions if question.category_id in weak_topic_ids]
    medium_pool = [
        question
        for question in all_questions
        if 0.35 <= _difficulty_value(question, difficulty_map) <= 0.65
    ]
    unseen_pool = [
        question
        for question in all_questions
        if question.id not in history_map
    ]

    random.shuffle(unseen_pool)
    selected_ids: set[UUID] = set()
    selected_questions: list[Question] = []

    weak_selection = _pick_questions(
        source=weak_pool,
        target_count=weak_target,
        selected_ids=selected_ids,
        recent_ids=recent_ids,
        sorter=lambda question: (-_difficulty_value(question, difficulty_map), str(question.id)),
    )
    for question in weak_selection:
        selected_questions.append(question)
        selected_ids.add(question.id)

    medium_selection = _pick_questions(
        source=medium_pool,
        target_count=medium_target,
        selected_ids=selected_ids,
        recent_ids=recent_ids,
        sorter=lambda question: (abs(_difficulty_value(question, difficulty_map) - 0.5), str(question.id)),
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
                abs(_difficulty_value(question, difficulty_map) - 0.55),
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
