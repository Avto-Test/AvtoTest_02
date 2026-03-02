"""
AUTOTEST Public Test Router
Endpoints for browsing and viewing tests
"""

from uuid import UUID
import random

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.attempts.schemas import AdaptiveStartResponse
from api.tests.schemas import PublicTestDetail, PublicTestList
from api.auth.router import get_current_user
from models.user import User
from database.session import get_db
from models.question import Question
from models.question_category import QuestionCategory
from models.attempt import Attempt
from models.test import Test
from models.user_adaptive_profile import UserAdaptiveProfile

router = APIRouter(prefix="/tests", tags=["tests"])

ALLOWED_QUESTION_COUNTS = {20, 30, 40, 50}
QUESTION_COUNT_TO_MINUTES = {
    20: 25,
    30: 38,
    40: 50,
    50: 62,
}


def _sanitize_option_text(text_value: str) -> str:
    text = text_value.strip()
    if text.lower().endswith("/t"):
        return text[:-2].rstrip()
    return text


class AdaptiveStartRequest(BaseModel):
    question_count: int = 20
    pressure_mode: bool = False


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


def _question_difficulty_percent(question: Question) -> int:
    if question.difficulty_percent is not None:
        return max(0, min(100, int(question.difficulty_percent)))
    if question.difficulty == "hard":
        return 30
    if question.difficulty == "easy":
        return 70
    return 50


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


@router.get("/{test_id}", response_model=PublicTestDetail)
async def get_test_detail(
    test_id: UUID,
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


async def _get_or_create_adaptive_profile(current_user: User, db: AsyncSession) -> UserAdaptiveProfile:
    result = await db.execute(
        select(UserAdaptiveProfile).where(UserAdaptiveProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is not None:
        return profile

    profile = UserAdaptiveProfile(user_id=current_user.id, target_difficulty_percent=50)
    db.add(profile)
    await db.flush()
    return profile


@router.post("/adaptive/start", response_model=AdaptiveStartResponse)
async def start_adaptive_test(
    payload: AdaptiveStartRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start adaptive test from question bank with equal category distribution.
    """
    from api.attempts.router import check_attempt_limit

    await check_attempt_limit(current_user, db)

    if not (current_user.is_premium or current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required to start adaptive mode.",
        )

    request_payload = payload or AdaptiveStartRequest()
    requested_count = request_payload.question_count
    if requested_count not in ALLOWED_QUESTION_COUNTS:
        raise HTTPException(
            status_code=400,
            detail="question_count must be one of: 20, 30, 40, 50.",
        )

    profile = await _get_or_create_adaptive_profile(current_user, db)
    target_percent = max(0, min(100, int(profile.target_difficulty_percent)))

    categories_result = await db.execute(
        select(QuestionCategory)
        .where(QuestionCategory.is_active == True)  # noqa: E712
        .order_by(QuestionCategory.name.asc())
    )
    categories = list(categories_result.scalars().all())
    active_category_ids = {category.id for category in categories}

    questions_result = await db.execute(
        select(Question)
        .options(selectinload(Question.answer_options))
        .where(Question.answer_options.any())
    )
    all_questions = list(questions_result.scalars().all())

    if not all_questions:
        raise HTTPException(status_code=404, detail="No questions available")
    if len(all_questions) < requested_count:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough questions for requested count ({requested_count}).",
        )

    weak_topics: set[str] = set()
    try:
        from models.user_skill import UserSkill

        weak_result = await db.execute(
            select(UserSkill.topic)
            .where(UserSkill.user_id == current_user.id)
            .order_by(UserSkill.skill_score.asc())
            .limit(3)
        )
        weak_topics = {topic for topic in weak_result.scalars().all() if topic}
    except Exception:
        weak_topics = set()

    def rank_score(question: Question) -> float:
        base_distance = abs(_question_difficulty_percent(question) - target_percent)
        priority_boost = 0.0
        topic_key = (question.topic or question.category or "").strip()
        if topic_key and topic_key in weak_topics:
            priority_boost = -8.0
        return base_distance + priority_boost + random.uniform(0.0, 0.35)

    category_pools: dict[str, list[Question]] = {}
    if active_category_ids:
        for category in categories:
            category_pools[str(category.id)] = []
        for question in all_questions:
            if question.category_id and question.category_id in active_category_ids:
                category_pools[str(question.category_id)].append(question)
        category_pools = {key: pool for key, pool in category_pools.items() if pool}

    if not category_pools:
        category_pools = {"__all__": all_questions[:]}

    bucket_keys = list(category_pools.keys())
    bucket_count = len(bucket_keys)
    base_take = requested_count // bucket_count
    remainder = requested_count % bucket_count

    selected: list[Question] = []
    selected_ids: set[UUID] = set()

    for idx, bucket_key in enumerate(bucket_keys):
        take_count = base_take + (1 if idx < remainder else 0)
        if take_count <= 0:
            continue
        ranked_pool = sorted(category_pools[bucket_key], key=rank_score)
        bucket_selected = 0
        for question in ranked_pool:
            if question.id in selected_ids:
                continue
            selected.append(question)
            selected_ids.add(question.id)
            bucket_selected += 1
            if bucket_selected >= take_count:
                break

    if len(selected) < requested_count:
        remaining = [question for question in all_questions if question.id not in selected_ids]
        remaining.sort(key=rank_score)
        selected.extend(remaining[: requested_count - len(selected)])

    questions = selected[:requested_count]
    random.shuffle(questions)

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

    if target_percent <= 35:
        training_level = "advanced"
    elif target_percent <= 65:
        training_level = "intermediate"
    else:
        training_level = "beginner"

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

    return AdaptiveStartResponse(
        id=attempt.id,
        test_id=attempt.test_id,
        score=attempt.score,
        started_at=attempt.started_at.isoformat(),
        finished_at=None,
        questions=[_public_question_payload(question) for question in questions],
        question_count=len(questions),
        duration_minutes=duration_minutes,
    )
