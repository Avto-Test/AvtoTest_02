"""
AUTOTEST Public Test Router
Endpoints for browsing and viewing tests
"""

from datetime import datetime, timezone
import json
import logging
import random
from uuid import UUID
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.attempts.schemas import AdaptiveStartResponse
from api.tests.schemas import FreeTestStatus, PublicTestDetail, PublicTestList
from api.auth.router import get_current_user
from core.access import ensure_premium_user, require_premium_user
from models.user import User
from database.session import get_db
from models.question import Question
from models.attempt import Attempt
from models.test import Test
from core.config import settings
from core.errors import get_request_id
from analytics.pass_probability import calculate_pass_probability
from services.learning.adaptive_engine import (
    derive_adaptive_training_level,
    generate_adaptive_session,
)

router = APIRouter(prefix="/tests", tags=["tests"])
logger = logging.getLogger(__name__)

ALLOWED_QUESTION_COUNTS = {20, 30, 40, 50}
QUESTION_COUNT_TO_MINUTES = {
    20: 25,
    30: 38,
    40: 50,
    50: 62,
}
FREE_RANDOM_QUESTION_COUNT = 20


def _log_test_event(
    level: int,
    *,
    event: str,
    attempt_id: str,
    user_id: str,
    test_id: str,
    mode: str,
    total_questions: int,
) -> None:
    payload = {
        "event": event,
        "attempt_id": attempt_id,
        "user_id": user_id,
        "test_id": test_id,
        "mode": mode,
        "total_questions": total_questions,
    }
    logger.log(level, "exam_event %s", json.dumps(payload, sort_keys=True))


def _sanitize_option_text(text_value: str) -> str:
    text = text_value.strip()
    if text.lower().endswith("/t"):
        return text[:-2].rstrip()
    return text


async def _get_free_attempt_status(current_user: User, db: AsyncSession) -> FreeTestStatus:
    from api.attempts.router import FREE_MAX_ATTEMPTS_PER_DAY

    if current_user.is_premium or current_user.is_admin:
        return FreeTestStatus(
            attempts_used_today=0,
            attempts_limit=0,
            attempts_remaining=999999,
            limit_reached=False,
            is_premium=True,
        )

    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    attempts_today_result = await db.execute(
        select(func.count(Attempt.id)).where(
            Attempt.user_id == current_user.id,
            Attempt.started_at >= start_of_day,
        )
    )
    attempts_used_today = int(attempts_today_result.scalar_one() or 0)
    attempts_limit = FREE_MAX_ATTEMPTS_PER_DAY
    attempts_remaining = max(0, attempts_limit - attempts_used_today)
    return FreeTestStatus(
        attempts_used_today=attempts_used_today,
        attempts_limit=attempts_limit,
        attempts_remaining=attempts_remaining,
        limit_reached=attempts_used_today >= attempts_limit,
        is_premium=False,
    )


def _build_balanced_random_selection(
    all_questions: list[Question],
    total_questions: int,
) -> list[Question]:
    if len(all_questions) < total_questions:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough questions for requested count ({total_questions}).",
        )

    grouped_questions: dict[str, list[Question]] = defaultdict(list)
    for question in all_questions:
        group_key = (
            str(question.category_id)
            if question.category_id
            else (question.topic or question.category or "__general__").strip().lower()
        )
        grouped_questions[group_key].append(question)

    group_items = list(grouped_questions.items())
    random.shuffle(group_items)
    for _, group in group_items:
        random.shuffle(group)

    selected: list[Question] = []
    selected_ids: set[UUID] = set()

    while len(selected) < total_questions:
        progressed = False
        for _, group in group_items:
            while group:
                question = group.pop()
                if question.id in selected_ids:
                    continue
                selected.append(question)
                selected_ids.add(question.id)
                progressed = True
                break
            if len(selected) >= total_questions:
                break
        if not progressed:
            break

    if len(selected) < total_questions:
        remaining = [question for question in all_questions if question.id not in selected_ids]
        random.shuffle(remaining)
        selected.extend(remaining[: total_questions - len(selected)])

    return selected[:total_questions]


class AdaptiveStartRequest(BaseModel):
    question_count: int = 20
    pressure_mode: bool = False


def _public_question_payload(question: Question) -> dict:
    options = list(question.answer_options)
    random.shuffle(options)
    return {
        "id": question.id,
        "text": question.text,
        "difficulty_percent": _question_difficulty_percent(question),
        "image_url": question.image_url,
        "video_url": question.video_url,
        "media_type": question.media_type,
        "topic": question.topic,
        "category": question.category,
        "difficulty": question.difficulty,
        "answer_options": [{"id": option.id, "text": _sanitize_option_text(option.text)} for option in options],
    }


def _question_difficulty_percent(question: Question) -> int:
    if question.difficulty_percent is not None:
        return max(0, min(100, int(question.difficulty_percent)))
    if question.difficulty == "hard":
        return 30
    if question.difficulty == "easy":
        return 70
    return 50

def _is_dev_mode() -> bool:
    return bool(settings.DEBUG)


@router.get("", response_model=list[PublicTestList])
async def get_tests(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of active tests.
    Legacy non-adaptive list is still exposed for compatibility.
    """
    stmt = (
        select(
            Test.id,
            Test.title,
            Test.description,
            Test.difficulty,
            Test.is_premium,
            Test.duration,
            Test.created_at,
            func.count(Question.id).label("question_count"),
        )
        .outerjoin(Question, Question.test_id == Test.id)
        .where(Test.is_active == True)
        .where(Test.difficulty != "Adaptive")
        .group_by(Test.id)
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        PublicTestList(
            id=row.id,
            title=row.title,
            description=row.description,
            difficulty=row.difficulty,
            is_premium=row.is_premium,
            duration=row.duration,
            question_count=row.question_count,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/free-status", response_model=FreeTestStatus)
async def get_free_test_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FreeTestStatus:
    return await _get_free_attempt_status(current_user, db)


@router.post("/adaptive/start", response_model=AdaptiveStartResponse)
async def start_adaptive_test(
    request: Request,
    payload: AdaptiveStartRequest | None = None,
    current_user: User = Depends(require_premium_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start adaptive test from question bank using weighted adaptive selection.
    """
    from api.attempts.router import check_attempt_limit

    await check_attempt_limit(current_user, db)

    request_payload = payload or AdaptiveStartRequest()
    requested_count = request_payload.question_count
    if requested_count not in ALLOWED_QUESTION_COUNTS:
        raise HTTPException(
            status_code=400,
            detail="question_count must be one of: 20, 30, 40, 50.",
        )
    plan = await generate_adaptive_session(
        current_user.id,
        db=db,
        question_count=requested_count,
    )
    questions = list(plan.questions)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions available")
    if len(questions) < requested_count:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough questions for requested count ({requested_count}).",
        )

    adaptive_title = "Adaptive Practice Mode"
    test_result = await db.execute(select(Test).where(Test.title == adaptive_title))
    adaptive_test = test_result.scalar_one_or_none()

    duration_minutes = QUESTION_COUNT_TO_MINUTES.get(
        requested_count,
        max(10, int(round(requested_count * 1.25))),
    )
    if request_payload.pressure_mode:
        duration_minutes = max(5, int(round(duration_minutes * 0.8)))

    if not adaptive_test:
        adaptive_test = Test(
            title=adaptive_title,
            description="Generated adaptive test based on your performance.",
            difficulty="Adaptive",
            duration=duration_minutes,
            is_active=True,
            is_premium=True,
        )
        db.add(adaptive_test)
        await db.flush()
    elif adaptive_test.duration != duration_minutes:
        adaptive_test.duration = duration_minutes

    training_level = await derive_adaptive_training_level(current_user.id, db=db)

    attempt = Attempt(
        user_id=current_user.id,
        test_id=adaptive_test.id,
        mode="adaptive",
        training_level=training_level,
        pressure_mode=request_payload.pressure_mode,
        pressure_score_modifier=0.85 if request_payload.pressure_mode else 1.0,
        question_ids=[str(question.id) for question in questions],
        question_count=len(questions),
        time_limit_seconds=duration_minutes * 60,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    if _is_dev_mode():
        probability_prediction = await calculate_pass_probability(
            current_user.id,
            db,
            request_id=get_request_id(request),
        )
        logger.info(
            "TEST_GENERATION | selected_questions=%s | weak_topic_ids=%s | training_level=%s | pass_probability_prediction=%s",
            len(questions),
            [str(topic_id) for topic_id in plan.weak_topic_ids],
            training_level,
            round(probability_prediction.pass_probability, 1),
        )
    _log_test_event(
        logging.INFO,
        event="exam_started",
        attempt_id=str(attempt.id),
        user_id=str(current_user.id),
        test_id=str(attempt.test_id),
        mode=attempt.mode,
        total_questions=len(questions),
    )

    return AdaptiveStartResponse(
        id=attempt.id,
        test_id=attempt.test_id,
        score=attempt.score,
        started_at=attempt.started_at.isoformat(),
        finished_at=None,
        questions=[_public_question_payload(question) for question in questions],
        question_count=len(questions),
        duration_minutes=duration_minutes,
        attempt_mode="adaptive",
    )


@router.get("/free-random", response_model=AdaptiveStartResponse)
async def start_free_random_test(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdaptiveStartResponse:
    usage = await _get_free_attempt_status(current_user, db)

    if usage.is_premium:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Premium users should use adaptive mode instead of free random mode.",
        )

    if usage.limit_reached:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "DAILY_LIMIT_REACHED",
                "attempts_used_today": usage.attempts_used_today,
                "attempts_limit": usage.attempts_limit,
                "attempts_remaining": usage.attempts_remaining,
            },
        )

    questions_result = await db.execute(
        select(Question)
        .options(selectinload(Question.answer_options))
        .where(Question.answer_options.any())
    )
    all_questions = list(questions_result.scalars().all())
    questions = _build_balanced_random_selection(all_questions, FREE_RANDOM_QUESTION_COUNT)

    free_test_result = await db.execute(
        select(Test).where(Test.title == "Free Random Practice")
    )
    free_test = free_test_result.scalar_one_or_none()
    duration_minutes = QUESTION_COUNT_TO_MINUTES[FREE_RANDOM_QUESTION_COUNT]

    if free_test is None:
        free_test = Test(
            title="Free Random Practice",
            description="Randomized daily practice for free users.",
            difficulty="Random",
            duration=duration_minutes,
            is_active=True,
            is_premium=False,
        )
        db.add(free_test)
        await db.flush()
    elif free_test.duration != duration_minutes:
        free_test.duration = duration_minutes

    attempt = Attempt(
        user_id=current_user.id,
        test_id=free_test.id,
        mode="free_random",
        pressure_mode=False,
        pressure_score_modifier=1.0,
        question_ids=[str(question.id) for question in questions],
        question_count=len(questions),
        time_limit_seconds=duration_minutes * 60,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    _log_test_event(
        logging.INFO,
        event="exam_started",
        attempt_id=str(attempt.id),
        user_id=str(current_user.id),
        test_id=str(attempt.test_id),
        mode=attempt.mode,
        total_questions=len(questions),
    )

    refreshed_usage = await _get_free_attempt_status(current_user, db)

    return AdaptiveStartResponse(
        id=attempt.id,
        test_id=attempt.test_id,
        score=attempt.score,
        started_at=attempt.started_at.isoformat(),
        finished_at=None,
        questions=[_public_question_payload(question) for question in questions],
        question_count=len(questions),
        duration_minutes=duration_minutes,
        attempt_mode="free_random",
        attempts_used_today=refreshed_usage.attempts_used_today,
        attempts_limit=refreshed_usage.attempts_limit,
        attempts_remaining=refreshed_usage.attempts_remaining,
    )


@router.get("/{test_id}", response_model=PublicTestDetail)
async def get_test_detail(
    test_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get full test detail for taking a test.
    Includes questions and answer options (without is_correct).
    """
    stmt = (
        select(Test)
        .options(
            selectinload(Test.questions).selectinload(Question.answer_options)
        )
        .where(Test.id == test_id)
        .where(Test.is_active == True)
    )

    result = await db.execute(stmt)
    test = result.scalar_one_or_none()

    if not test:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found",
        )

    if test.is_premium:
        await ensure_premium_user(current_user, db)

    return {
        "id": test.id,
        "title": test.title,
        "description": test.description,
        "difficulty": test.difficulty,
        "is_premium": test.is_premium,
        "duration": test.duration,
        "questions": [_public_question_payload(question) for question in test.questions],
        "created_at": test.created_at,
    }
