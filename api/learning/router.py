"""
AUTOTEST Learning Router
Backend-generated adaptive learning sessions.
"""

from __future__ import annotations

import random

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth.router import get_current_user
from api.learning.schemas import CreateLearningSessionRequest, LearningSessionResponse
from database.session import get_db
from models.analytics_event import AnalyticsEvent
from models.attempt import Attempt
from models.question import Question
from models.question_category import QuestionCategory
from models.test import Test
from models.user import User
from services.learning.adaptive_engine import generate_adaptive_session
from services.learning.taxonomy import normalize_learning_key

router = APIRouter(prefix="/learning", tags=["learning"])

LEARNING_SESSION_TEST_TITLE = "Learning Review Session"
LEARNING_SESSION_DESCRIPTION = "Backend-generated adaptive review session."
DEFAULT_DURATION_MINUTES = 25


def _sanitize_option_text(text_value: str) -> str:
    text = text_value.strip()
    if text.lower().endswith("/t"):
        return text[:-2].rstrip()
    return text


def _public_question_payload(question: Question) -> dict:
    options = list(question.answer_options)
    random.shuffle(options)
    return {
        "id": question.id,
        "text": question.text,
        "image_url": question.image_url,
        "video_url": question.video_url,
        "media_type": question.media_type,
        "topic": question.topic,
        "category": question.category,
        "difficulty": question.difficulty,
        "answer_options": [{"id": option.id, "text": _sanitize_option_text(option.text)} for option in options],
    }


async def _get_or_create_learning_test(db: AsyncSession) -> Test:
    result = await db.execute(select(Test).where(Test.title == LEARNING_SESSION_TEST_TITLE))
    test = result.scalar_one_or_none()
    if test is not None:
        return test

    test = Test(
        title=LEARNING_SESSION_TEST_TITLE,
        description=LEARNING_SESSION_DESCRIPTION,
        difficulty="Learning",
        duration=DEFAULT_DURATION_MINUTES,
        is_active=True,
        is_premium=False,
    )
    db.add(test)
    await db.flush()
    return test


async def _resolve_focus_topic_ids(
    db: AsyncSession,
    topic_preferences: list[str],
) -> list:
    normalized_preferences = {
        normalize_learning_key(topic)
        for topic in topic_preferences
        if topic and topic.strip()
    }
    if not normalized_preferences:
        return []

    categories = (
        await db.execute(select(QuestionCategory).where(QuestionCategory.is_active == True))
    ).scalars().all()
    return [
        category.id
        for category in categories
        if normalize_learning_key(category.name) in normalized_preferences
    ]


@router.post("/session", response_model=LearningSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_learning_session(
    payload: CreateLearningSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LearningSessionResponse:
    focus_topic_ids = await _resolve_focus_topic_ids(db, payload.topic_preferences)
    plan = await generate_adaptive_session(
        current_user.id,
        db=db,
        question_count=payload.question_count,
        focus_topic_ids=focus_topic_ids or None,
    )
    if not plan.questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No learning questions available.",
        )

    learning_test = await _get_or_create_learning_test(db)
    attempt = Attempt(
        user_id=current_user.id,
        test_id=learning_test.id,
        mode="learning",
        question_ids=[str(question.id) for question in plan.questions],
        question_count=len(plan.questions),
        time_limit_seconds=DEFAULT_DURATION_MINUTES * 60,
    )
    db.add(attempt)

    db.add(
        AnalyticsEvent(
            user_id=current_user.id,
            event_name="learning_session_started",
            metadata_json={
                "session_id": str(attempt.id),
                "question_count": len(plan.questions),
                "weak_topic_ids": [str(topic_id) for topic_id in plan.weak_topic_ids],
                "focus_topic_ids": [str(topic_id) for topic_id in focus_topic_ids],
            },
        )
    )
    if plan.weak_topic_ids:
        db.add(
            AnalyticsEvent(
                user_id=current_user.id,
                event_name="weak_topic_detected",
                metadata_json={
                    "topic_ids": [str(topic_id) for topic_id in plan.weak_topic_ids],
                    "count": len(plan.weak_topic_ids),
                },
            )
        )

    await db.commit()
    await db.refresh(attempt)

    return LearningSessionResponse(
        session_id=attempt.id,
        questions=[_public_question_payload(question) for question in plan.questions],
    )
