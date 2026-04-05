"""
Learning progress tracking services.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import Float, cast, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.question import Question
from models.question_difficulty import QuestionDifficulty
from models.review_queue import ReviewQueue
from models.user_topic_stats import UserTopicStats
from services.learning.question_update_logging import (
    log_dry_run_write,
    log_question_update_comparison,
    question_update_comparison_enabled,
    snapshot_question_mapping,
    snapshot_question_row,
)

REVIEW_INTERVALS = (1, 3, 7, 14, 30)


@dataclass(slots=True)
class LearningAnswerRecord:
    question_id: UUID
    topic_id: UUID | None
    is_correct: bool
    occurred_at: datetime


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _next_review_interval(current_interval: int) -> int:
    for interval in REVIEW_INTERVALS:
        if current_interval < interval:
            return interval
    return REVIEW_INTERVALS[-1]


async def apply_learning_progress_updates(
    *,
    db: AsyncSession,
    user_id: UUID,
    answer_records: list[LearningAnswerRecord],
) -> None:
    if not answer_records:
        return

    question_ids = [record.question_id for record in answer_records]
    topic_ids = sorted({record.topic_id for record in answer_records if record.topic_id is not None})
    question_rows = (
        await db.execute(select(Question).where(Question.id.in_(question_ids)))
    ).scalars().all()
    question_map = {row.id: row for row in question_rows}

    topic_stats_rows = (
        await db.execute(
            select(UserTopicStats).where(
                UserTopicStats.user_id == user_id,
                UserTopicStats.topic_id.in_(topic_ids),
            )
        )
    ).scalars().all() if topic_ids else []
    topic_stats_map = {row.topic_id: row for row in topic_stats_rows}

    difficulty_rows = (
        await db.execute(
            select(QuestionDifficulty).where(QuestionDifficulty.question_id.in_(question_ids))
        )
    ).scalars().all()
    difficulty_map = {row.question_id: row for row in difficulty_rows}

    review_rows = (
        await db.execute(
            select(ReviewQueue).where(
                ReviewQueue.user_id == user_id,
                ReviewQueue.question_id.in_(question_ids),
            )
        )
    ).scalars().all()
    review_map = {row.question_id: row for row in review_rows}

    for record in answer_records:
        occurred_at = _ensure_utc(record.occurred_at)
        question = question_map.get(record.question_id)
        before_snapshot = snapshot_question_row(question) if question is not None and question_update_comparison_enabled() else None

        if question is not None:
            correct_inc = 1 if record.is_correct else 0
            updated_question = (
                await db.execute(
                    update(Question)
                    .where(Question.id == record.question_id)
                    .values(
                        total_attempts=Question.total_attempts + 1,
                        total_correct=Question.total_correct + correct_inc,
                        dynamic_difficulty_score=(
                            cast(
                                (Question.total_attempts + 1) - (Question.total_correct + correct_inc),
                                Float,
                            )
                            / (Question.total_attempts + 1)
                        ),
                    )
                    .returning(
                        Question.total_attempts,
                        Question.total_correct,
                        Question.dynamic_difficulty_score,
                    )
                )
            ).one()
            after_snapshot = snapshot_question_mapping(
                total_attempts=updated_question.total_attempts,
                total_correct=updated_question.total_correct,
                dynamic_difficulty_score=updated_question.dynamic_difficulty_score,
            )
            question.total_attempts = int(after_snapshot["total_attempts"])
            question.total_correct = int(after_snapshot["total_correct"])
            question.dynamic_difficulty_score = float(after_snapshot["dynamic_difficulty_score"])
            if before_snapshot is not None:
                log_question_update_comparison(
                    source="progress_tracking",
                    question_id=record.question_id,
                    before=before_snapshot,
                    after=after_snapshot,
                )
            log_dry_run_write(
                operation="question_aggregate_update",
                entity="question",
                entity_id=record.question_id,
                payload={
                    "source": "progress_tracking",
                    "before": before_snapshot,
                    "after": after_snapshot,
                },
            )

        # Legacy compatibility mirror. Active adaptive logic reads Question.dynamic_difficulty_score.
        difficulty = difficulty_map.get(record.question_id)
        if difficulty is None:
            difficulty = QuestionDifficulty(
                question_id=record.question_id,
                attempts=0,
                correct_count=0,
                wrong_count=0,
                difficulty_score=0.0,
            )
            db.add(difficulty)
            difficulty_map[record.question_id] = difficulty
        difficulty.attempts += 1
        if record.is_correct:
            difficulty.correct_count += 1
        else:
            difficulty.wrong_count += 1
        difficulty.difficulty_score = (
            float(difficulty.wrong_count) / float(difficulty.attempts)
            if difficulty.attempts > 0
            else 0.0
        )
        difficulty.updated_at = occurred_at

        if record.topic_id is not None:
            topic_stats = topic_stats_map.get(record.topic_id)
            if topic_stats is None:
                topic_stats = UserTopicStats(
                    user_id=user_id,
                    topic_id=record.topic_id,
                    total_attempts=0,
                    correct_answers=0,
                    wrong_answers=0,
                    accuracy_rate=0.0,
                )
                db.add(topic_stats)
                topic_stats_map[record.topic_id] = topic_stats
            topic_stats.total_attempts += 1
            if record.is_correct:
                topic_stats.correct_answers += 1
            else:
                topic_stats.wrong_answers += 1
            topic_stats.accuracy_rate = (
                float(topic_stats.correct_answers) / float(topic_stats.total_attempts)
                if topic_stats.total_attempts > 0
                else 0.0
            )
            topic_stats.last_attempt_at = occurred_at
            topic_stats.updated_at = occurred_at

        existing_review = review_map.get(record.question_id)
        if not record.is_correct:
            if existing_review is None:
                existing_review = ReviewQueue(
                    user_id=user_id,
                    question_id=record.question_id,
                    interval_days=REVIEW_INTERVALS[0],
                    next_review_at=occurred_at + timedelta(days=REVIEW_INTERVALS[0]),
                    last_result="wrong",
                )
                db.add(existing_review)
                review_map[record.question_id] = existing_review
            else:
                existing_review.interval_days = REVIEW_INTERVALS[0]
                existing_review.next_review_at = occurred_at + timedelta(days=REVIEW_INTERVALS[0])
                existing_review.last_result = "wrong"
            continue

        if existing_review is not None:
            next_interval = _next_review_interval(existing_review.interval_days)
            existing_review.interval_days = next_interval
            existing_review.next_review_at = occurred_at + timedelta(days=next_interval)
            existing_review.last_result = "correct"
