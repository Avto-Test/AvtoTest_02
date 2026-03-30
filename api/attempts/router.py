"""
AUTOTEST Attempts Router
API endpoints for test attempts
"""

from datetime import datetime, timezone, timedelta as dt_timedelta
import json
import logging
import random
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy import Float, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.attempts.schemas import (
    AnswerResponse,
    AttemptResponse,
    BulkSubmit,
    BulkSubmitResponse,
    DetailedAnswer,
    FinishAttempt,
    GuestFinishAttempt,
    GuestStartAttempt,
    GuestSubmitAnswer,
    RewardAchievement,
    RewardSummary,
    ScoreResponse,
    StartAttempt,
    StartAttemptResponse,
    SubmitAnswer,
)
from api.auth.router import get_current_user
from core.config import settings
from database.session import get_db
from models.answer_option import AnswerOption
from models.analytics_event import AnalyticsEvent
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.exam_simulation_attempt import ExamSimulationAttempt
from models.guest_attempt import GuestAttempt
from models.guest_attempt_answer import GuestAttemptAnswer
from models.question import Question
from models.review_queue import ReviewQueue
from models.test import Test
from models.user import User
from models.user_adaptive_profile import UserAdaptiveProfile
from models.user_question_history import UserQuestionHistory
from models.user_topic_stats import UserTopicStats
from core.logging import get_logger
from services.gamification.rewards import award_attempt_completion_rewards
from services.attempts.finalizer import finalize_attempt
from services.learning.intelligence_metrics import attempt_score_percent, pass_prediction_label
from services.learning.coach_feedback import build_question_feedback
from services.learning.question_update_logging import (
    log_dry_run_write,
    log_question_update_comparison,
    question_update_comparison_enabled,
    snapshot_question_row,
)
from services.learning.simulation_service import finalize_exam_simulation, resolve_simulation_limits
from services.learning.progress_tracking import LearningAnswerRecord, apply_learning_progress_updates

router = APIRouter(prefix="/attempts", tags=["attempts"])
logger = get_logger(__name__)

# Limits
FREE_MAX_ATTEMPTS_PER_DAY = 3
GUEST_MAX_ATTEMPTS = 2
GUEST_COOKIE_NAME = "guest_id"
GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
ALLOWED_QUESTION_COUNTS = {20, 30, 40, 50}
QUESTION_COUNT_TO_MINUTES = {
    20: 25,
    30: 38,
    40: 50,
    50: 62,
}


def _log_attempt_event(
    level: int,
    *,
    event: str,
    attempt_id: str,
    user_id: str | None = None,
    test_id: str | None = None,
    mode: str | None = None,
    score: int | None = None,
    total_questions: int | None = None,
    passed: bool | None = None,
) -> None:
    payload: dict[str, object] = {
        "event": event,
        "attempt_id": attempt_id,
    }
    if user_id is not None:
        payload["user_id"] = user_id
    if test_id is not None:
        payload["test_id"] = test_id
    if mode is not None:
        payload["mode"] = mode
    if score is not None:
        payload["score"] = score
    if total_questions is not None:
        payload["total_questions"] = total_questions
    if passed is not None:
        payload["passed"] = passed
    logger.log(level, "exam_event %s", json.dumps(payload, sort_keys=True, default=str))


def _sanitize_option_text(text_value: str) -> str:
    text = text_value.strip()
    if text.lower().endswith("/t"):
        return text[:-2].rstrip()
    return text


def _is_demo_account(user: User) -> bool:
    email = (user.email or "").strip().lower()
    return settings.is_development and email.startswith("demo.") and email.endswith("@example.com")


def _public_question_payload(question: Question) -> dict:
    options = list(question.answer_options)
    random.shuffle(options)
    return {
        "id": question.id,
        "text": question.text,
        "difficulty_percent": max(0, min(100, int(question.difficulty_percent or 0))),
        "image_url": question.image_url,
        "video_url": question.video_url,
        "media_type": question.media_type,
        "topic": question.topic,
        "category": question.category,
        "difficulty": question.difficulty,
        "answer_options": [{"id": option.id, "text": _sanitize_option_text(option.text)} for option in options],
    }


async def check_attempt_limit(user: User, db: AsyncSession) -> None:
    """
    Check if user has exceeded daily attempt limit.
    
    Args:
        user: Current user
        db: Database session
    
    Raises:
        HTTPException: If limit exceeded
    """
    # Premium users have no limits
    if user.is_premium:
        return
    
    # Calculate start of today (UTC)
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Count attempts today
    result = await db.execute(
        select(func.count(Attempt.id)).where(
            Attempt.user_id == user.id,
            Attempt.started_at >= start_of_day,
        )
    )
    attempts_today = result.scalar_one()
    
    if attempts_today >= FREE_MAX_ATTEMPTS_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Daily limit exceeded. Free users can attempt {FREE_MAX_ATTEMPTS_PER_DAY} tests per day. Upgrade to premium for unlimited access.",
        )


def _get_or_create_guest_id(request: Request, response: Response) -> str:
    guest_id = request.cookies.get(GUEST_COOKIE_NAME)
    if guest_id:
        return guest_id
    new_id = uuid.uuid4().hex
    response.set_cookie(
        key=GUEST_COOKIE_NAME,
        value=new_id,
        max_age=GUEST_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    return new_id


async def _check_guest_limit(guest_id: str, db: AsyncSession) -> None:
    result = await db.execute(
        select(func.count(GuestAttempt.id)).where(GuestAttempt.guest_id == guest_id)
    )
    attempts = result.scalar_one()
    if attempts >= GUEST_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guest limit reached. Please register to continue.",
        )


def _resolve_question_count(requested_count: int | None, available_count: int) -> int:
    if available_count <= 0:
        raise HTTPException(status_code=400, detail="Test has no questions.")

    if requested_count is None:
        # Backward-compatible default when client does not specify.
        return min(20, available_count)

    if requested_count not in ALLOWED_QUESTION_COUNTS:
        raise HTTPException(
            status_code=400,
            detail="question_count must be one of: 20, 30, 40, 50.",
        )

    if requested_count > available_count:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough questions in this test. Available: {available_count}.",
        )

    return requested_count


def _enforce_free_question_count_limit(user: User, question_count: int) -> None:
    if user.is_premium or user.is_admin:
        return
    if question_count <= 20:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Free plan faqat 20 ta savollik testlarni ochadi. 30/40/50 savollik rejimlar uchun Premium tarif kerak.",
    )


def _resolve_duration_minutes(question_count: int, pressure_mode: bool) -> int:
    minutes = QUESTION_COUNT_TO_MINUTES.get(
        question_count,
        max(10, int(round(question_count * 1.25))),
    )
    if pressure_mode:
        minutes = max(5, int(round(minutes * 0.8)))
    return minutes


async def _sync_simulation_completion(
    db: AsyncSession,
    attempt: Attempt,
    *,
    finished_at: datetime,
    mistake_count: int,
    passed: bool,
    timeout: bool,
    violation_count: int | None = None,
    disqualified: bool | None = None,
    disqualification_reason: str | None = None,
) -> None:
    if attempt.mode != "simulation":
        return

    simulation = await finalize_exam_simulation(
        db,
        attempt,
        finished_at=finished_at,
        mistake_count=mistake_count,
        passed=passed,
        timeout=timeout,
        violation_count=violation_count,
        disqualified=disqualified,
        disqualification_reason=disqualification_reason,
    )
    if simulation is None:
        return

    db.add(
        AnalyticsEvent(
            user_id=attempt.user_id,
            event_name="simulation_completed",
            metadata_json={
                "simulation_id": str(attempt.id),
                "mistake_count": int(mistake_count),
                "passed": bool(passed),
                "timeout": bool(timeout),
            },
        )
    )


@router.post("/start", response_model=StartAttemptResponse, status_code=status.HTTP_201_CREATED)
async def start_attempt(
    data: StartAttempt,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StartAttemptResponse:
    """
    Start a new test attempt.
    
    Args:
        data: Test ID to start attempt for
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Created attempt details
    
    Raises:
        HTTPException: If test not found, inactive, or limit exceeded
    """
    # Check daily limit for free users
    await check_attempt_limit(current_user, db)
    
    # Check if test exists and is active
    result = await db.execute(
        select(Test)
        .where(Test.id == data.test_id, Test.is_active == True)
        .options(selectinload(Test.questions).selectinload(Question.answer_options))
    )
    test = result.scalar_one_or_none()
    
    if test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found or inactive",
        )
    
    # Check premium access
    if test.is_premium and not current_user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required to access this test.",
        )

    # Validate Mode (Hardening)
    if test.difficulty == "Adaptive":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adaptive tests must be started via /tests/adaptive/start endpoint.",
        )
    
    selected_count = _resolve_question_count(data.question_count, len(test.questions))
    _enforce_free_question_count_limit(current_user, selected_count)
    selected_questions = random.sample(list(test.questions), selected_count)
    question_payloads = [_public_question_payload(question) for question in selected_questions]

    duration_minutes = _resolve_duration_minutes(selected_count, data.pressure_mode)

    # Create new attempt
    attempt = Attempt(
        user_id=current_user.id,
        test_id=data.test_id,
        mode="standard",
        pressure_mode=data.pressure_mode,
        pressure_score_modifier=0.85 if data.pressure_mode else 1.0,
        question_ids=[str(q.id) for q in selected_questions],
        question_count=selected_count,
        time_limit_seconds=duration_minutes * 60,
    )
    
    db.add(attempt)
    if settings.DRY_RUN:
        await db.flush()
    else:
        await db.commit()
        await db.refresh(attempt)
    _log_attempt_event(
        logging.INFO,
        event="exam_started",
        attempt_id=str(attempt.id),
        user_id=str(current_user.id),
        test_id=str(attempt.test_id),
        mode=attempt.mode,
        total_questions=selected_count,
    )
    
    return StartAttemptResponse(
        id=attempt.id,
        test_id=attempt.test_id,
        score=attempt.score,
        started_at=attempt.started_at.isoformat(),
        finished_at=None,
        question_count=selected_count,
        duration_minutes=duration_minutes,
        questions=question_payloads,
    )


@router.post("/guest/start", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED)
async def start_guest_attempt(
    data: GuestStartAttempt,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AttemptResponse:
    guest_id = _get_or_create_guest_id(request, response)
    await _check_guest_limit(guest_id, db)

    result = await db.execute(
        select(Test).where(Test.id == data.test_id, Test.is_active == True)
    )
    test = result.scalar_one_or_none()
    if test is None:
        raise HTTPException(status_code=404, detail="Test not found or inactive")
    if test.is_premium:
        raise HTTPException(status_code=403, detail="Premium subscription required to access this test.")

    attempt = GuestAttempt(
        guest_id=guest_id,
        test_id=data.test_id,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    _log_attempt_event(
        logging.INFO,
        event="exam_started",
        attempt_id=str(attempt.id),
        test_id=str(attempt.test_id),
        mode="guest",
    )

    return AttemptResponse(
        id=attempt.id,
        test_id=attempt.test_id,
        score=attempt.score,
        started_at=attempt.started_at.isoformat(),
        finished_at=None,
    )


@router.post("/answer", response_model=AnswerResponse)
async def submit_answer(
    data: SubmitAnswer,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnswerResponse:
    """
    Submit an answer for a question.
    
    Args:
        data: Answer submission data
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Created answer details acknowledgement
    
    Raises:
        HTTPException: If attempt/question/option not found or unauthorized
    """
    # Get attempt and verify ownership
    result = await db.execute(
        select(Attempt).where(Attempt.id == data.attempt_id)
    )
    attempt = result.scalar_one_or_none()
    
    if attempt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found",
        )
    
    if attempt.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this attempt",
        )
    
    if attempt.finished_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt already finished",
        )
    
    # Verify question belongs to this attempt's assigned set.
    expected_question_ids = set(attempt.question_ids or [])
    if expected_question_ids:
        if str(data.question_id) not in expected_question_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question not found in this attempt",
            )
        result = await db.execute(select(Question).where(Question.id == data.question_id))
    else:
        result = await db.execute(
            select(Question).where(
                Question.id == data.question_id,
                Question.test_id == attempt.test_id,
            )
        )
    question = result.scalar_one_or_none()
    
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question not found in this test",
        )
    
    # Verify option belongs to the question and get correctness
    result = await db.execute(
        select(AnswerOption).where(
            AnswerOption.id == data.selected_option_id,
            AnswerOption.question_id == data.question_id,
        )
    )
    option = result.scalar_one_or_none()
    
    if option is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer option not found for this question",
        )

    # Check if answer already exists for this question
    result = await db.execute(
        select(AttemptAnswer).where(
            AttemptAnswer.attempt_id == data.attempt_id,
            AttemptAnswer.question_id == data.question_id,
        )
    )
    existing_answer = result.scalar_one_or_none()
    
    if existing_answer is not None:
        # Update existing answer
        existing_answer.selected_option_id = data.selected_option_id
        existing_answer.is_correct = option.is_correct
        await db.commit()
        await db.refresh(existing_answer)
        
        return AnswerResponse(
            id=existing_answer.id,
            question_id=existing_answer.question_id,
            selected_option_id=existing_answer.selected_option_id,
            accepted=True,
        )
    
    # Create new answer
    attempt_answer = AttemptAnswer(
        attempt_id=data.attempt_id,
        question_id=data.question_id,
        selected_option_id=data.selected_option_id,
        is_correct=option.is_correct,
    )
    
    db.add(attempt_answer)
    await db.commit()
    await db.refresh(attempt_answer)
    
    return AnswerResponse(
        id=attempt_answer.id,
        question_id=attempt_answer.question_id,
        selected_option_id=attempt_answer.selected_option_id,
        accepted=True,
    )


@router.post("/guest/answer", response_model=AnswerResponse)
async def submit_guest_answer(
    data: GuestSubmitAnswer,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AnswerResponse:
    guest_id = _get_or_create_guest_id(request, response)
    result = await db.execute(
        select(GuestAttempt).where(GuestAttempt.id == data.attempt_id)
    )
    attempt = result.scalar_one_or_none()
    if attempt is None or attempt.guest_id != guest_id:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.finished_at is not None:
        raise HTTPException(status_code=400, detail="Attempt already finished")

    result = await db.execute(
        select(Question).where(
            Question.id == data.question_id,
            Question.test_id == attempt.test_id,
        )
    )
    question = result.scalar_one_or_none()
    if question is None:
        raise HTTPException(status_code=400, detail="Question not found in this test")

    result = await db.execute(
        select(AnswerOption).where(
            AnswerOption.id == data.selected_option_id,
            AnswerOption.question_id == data.question_id,
        )
    )
    option = result.scalar_one_or_none()
    if option is None:
        raise HTTPException(status_code=400, detail="Answer option not found for this question")

    result = await db.execute(
        select(GuestAttemptAnswer).where(
            GuestAttemptAnswer.attempt_id == data.attempt_id,
            GuestAttemptAnswer.question_id == data.question_id,
        )
    )
    existing_answer = result.scalar_one_or_none()
    if existing_answer is not None:
        existing_answer.selected_option_id = data.selected_option_id
        existing_answer.is_correct = option.is_correct
        await db.commit()
        await db.refresh(existing_answer)
        return AnswerResponse(
            id=existing_answer.id,
            question_id=existing_answer.question_id,
            selected_option_id=existing_answer.selected_option_id,
            accepted=True,
        )

    attempt_answer = GuestAttemptAnswer(
        attempt_id=data.attempt_id,
        question_id=data.question_id,
        selected_option_id=data.selected_option_id,
        is_correct=option.is_correct,
    )
    db.add(attempt_answer)
    await db.commit()
    await db.refresh(attempt_answer)

    return AnswerResponse(
        id=attempt_answer.id,
        question_id=attempt_answer.question_id,
        selected_option_id=attempt_answer.selected_option_id,
        accepted=True,
    )


@router.post("/finish", response_model=ScoreResponse)
async def finish_attempt(
    data: FinishAttempt,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScoreResponse:
    """
    Finish an attempt and get final score.
    
    Args:
        data: Attempt ID to finish
        current_user: Authenticated user
        db: Database session
    
    Returns:
        Final score details
    
    Raises:
        HTTPException: If attempt not found or unauthorized
    """
    # Get attempt with answers
    result = await db.execute(
        select(Attempt)
        .options(selectinload(Attempt.attempt_answers))
        .where(Attempt.id == data.attempt_id)
    )
    attempt = result.scalar_one_or_none()
    
    if attempt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attempt not found",
        )
    
    if attempt.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this attempt",
        )
    
    if attempt.finished_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attempt already finished",
        )

    if settings.USE_CANONICAL_ATTEMPT_FINALIZER:
        canonical_response = await finalize_attempt(
            db=db,
            current_user=current_user,
            attempt_id=attempt.id,
            answers={
                answer.question_id: answer.selected_option_id
                for answer in attempt.attempt_answers
            },
            visited_question_ids=[answer.question_id for answer in attempt.attempt_answers],
            response_times=[],
        )
        return ScoreResponse(
            attempt_id=attempt.id,
            score=canonical_response.score,
            total_questions=canonical_response.total,
            finished_at=canonical_response.finished_at,
        )
    
    # Get total questions count (attempt-specific when available)
    if attempt.question_count and attempt.question_count > 0:
        total_questions = attempt.question_count
    else:
        result = await db.execute(
            select(Question).where(Question.test_id == attempt.test_id)
        )
        questions = result.scalars().all()
        total_questions = len(questions)
    
    # Finish attempt and calculate score
    attempt.finish()
    correct_count = attempt.score
    mistake_count = max(0, total_questions - correct_count)
    simulation = await db.get(ExamSimulationAttempt, attempt.id) if attempt.mode == "simulation" else None
    mistake_limit = resolve_simulation_limits(simulation)[0] if simulation is not None else (1 if attempt.pressure_mode else 2)
    passed = mistake_count < mistake_limit
    question_ids = [answer.question_id for answer in attempt.attempt_answers]
    question_rows = (
        await db.execute(select(Question).where(Question.id.in_(question_ids)))
    ).scalars().all() if question_ids else []
    question_map = {question.id: question for question in question_rows}
    answer_records = [
        LearningAnswerRecord(
            question_id=answer.question_id,
            topic_id=question_map.get(answer.question_id).category_id if question_map.get(answer.question_id) else None,
            is_correct=bool(answer.is_correct),
            occurred_at=attempt.finished_at or datetime.now(timezone.utc),
        )
        for answer in attempt.attempt_answers
    ]
    completed_at = attempt.finished_at or datetime.now(timezone.utc)
    topic_ids = {record.topic_id for record in answer_records if record.topic_id is not None}
    pre_topic_rows = (
        await db.execute(
            select(UserTopicStats).where(
                UserTopicStats.user_id == current_user.id,
                UserTopicStats.topic_id.in_(topic_ids),
            )
        )
    ).scalars().all() if topic_ids else []
    pre_topic_state = {
        row.topic_id: (int(row.total_attempts), float(row.accuracy_rate))
        for row in pre_topic_rows
    }
    due_review_count_before = int(
        (
            await db.execute(
                select(func.count(ReviewQueue.id)).where(
                    ReviewQueue.user_id == current_user.id,
                    ReviewQueue.next_review_at <= completed_at,
                )
            )
        ).scalar_one()
        or 0
    )
    await apply_learning_progress_updates(
        db=db,
        user_id=current_user.id,
        answer_records=answer_records,
    )
    if attempt.mode == "learning":
        db.add(
            AnalyticsEvent(
                user_id=current_user.id,
                event_name="learning_session_completed",
                metadata_json={
                    "session_id": str(attempt.id),
                    "score": attempt.score,
                    "total_questions": total_questions,
                },
            )
        )
    await _sync_simulation_completion(
        db,
        attempt,
        finished_at=completed_at,
        mistake_count=mistake_count,
        passed=passed,
        timeout=False,
    )
    await award_attempt_completion_rewards(
        db,
        current_user.id,
        attempt_id=attempt.id,
        mode=attempt.mode,
        passed=passed,
        score_percent=(float(attempt.score) / max(1, total_questions)) * 100.0,
        occurred_at=completed_at,
        topic_ids=topic_ids,
        pre_topic_state=pre_topic_state,
        due_review_count_before=due_review_count_before,
    )

    # Phase 2.5: Inference snapshot capture (non-blocking)
    try:
        from ml.model_registry import capture_inference_snapshot
        snapshot = await capture_inference_snapshot(db, attempt.id, str(current_user.id))
        if snapshot:
            db.add(snapshot)
    except Exception as _snap_exc:
        logger.warning("Inference snapshot failed for attempt %s (non-blocking): %s", attempt.id, _snap_exc)

    await db.commit()
    await db.refresh(attempt)

    _log_attempt_event(
        logging.INFO,
        event="exam_submitted",
        attempt_id=str(attempt.id),
        user_id=str(current_user.id),
        test_id=str(attempt.test_id),
        mode=attempt.mode,
        score=attempt.score,
        total_questions=total_questions,
    )
    
    response_payload = ScoreResponse(
        attempt_id=attempt.id,
        score=attempt.score,
        total_questions=total_questions,
        finished_at=attempt.finished_at.isoformat(),
    )
    if settings.DRY_RUN:
        log_dry_run_write(
            operation="attempts.finish",
            entity="attempt",
            entity_id=attempt.id,
            payload={
                "score": int(attempt.score or 0),
                "question_count": int(total_questions),
            },
        )
        await db.rollback()
    return response_payload


@router.post("/guest/finish", response_model=ScoreResponse)
async def finish_guest_attempt(
    data: GuestFinishAttempt,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> ScoreResponse:
    guest_id = _get_or_create_guest_id(request, response)
    result = await db.execute(
        select(GuestAttempt)
        .options(selectinload(GuestAttempt.attempt_answers))
        .where(GuestAttempt.id == data.attempt_id)
    )
    attempt = result.scalar_one_or_none()
    if attempt is None or attempt.guest_id != guest_id:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.finished_at:
        raise HTTPException(status_code=400, detail="Attempt already finished")

    result = await db.execute(
        select(Question).where(Question.test_id == attempt.test_id)
    )
    questions = result.scalars().all()
    total_questions = len(questions)

    correct_count = 0
    for answer in attempt.attempt_answers:
        if answer.is_correct:
            correct_count += 1

    attempt.score = correct_count
    attempt.finish()
    await db.commit()
    await db.refresh(attempt)
    _log_attempt_event(
        logging.INFO,
        event="exam_submitted",
        attempt_id=str(attempt.id),
        test_id=str(attempt.test_id),
        mode="guest",
        score=attempt.score,
        total_questions=total_questions,
    )

    return ScoreResponse(
        attempt_id=attempt.id,
        score=attempt.score,
        total_questions=total_questions,
        finished_at=attempt.finished_at.isoformat(),
    )


@router.post("/submit", response_model=BulkSubmitResponse)
async def bulk_submit_attempt(
    data: BulkSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BulkSubmitResponse:
    """
    Submit all answers at once, finish attempt, and get rich score details.
    """
    # 1. Get attempt and verify
    stmt = (
        select(Attempt)
        .options(selectinload(Attempt.attempt_answers))
        .where(Attempt.id == data.attempt_id)
    )
    result = await db.execute(stmt)
    attempt = result.scalar_one_or_none()
    
    if not attempt or attempt.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if attempt.finished_at:
        raise HTTPException(status_code=400, detail="Attempt already finished")

    if settings.USE_CANONICAL_ATTEMPT_FINALIZER:
        return await finalize_attempt(
            db=db,
            current_user=current_user,
            attempt_id=attempt.id,
            answers=data.answers,
            visited_question_ids=data.visited_question_ids,
            response_times=data.response_times,
        )

    simulation = await db.get(ExamSimulationAttempt, attempt.id) if attempt.mode == "simulation" else None
    mistake_limit = resolve_simulation_limits(simulation)[0] if simulation is not None else (1 if attempt.pressure_mode else 2)
    violation_limit = resolve_simulation_limits(simulation)[1] if simulation is not None else None

    # First completed attempt gets demo detailed review for non-premium users.
    finished_attempts_result = await db.execute(
        select(func.count(Attempt.id)).where(
            Attempt.user_id == current_user.id,
            Attempt.finished_at.is_not(None),
        )
    )
    finished_attempts_before = finished_attempts_result.scalar_one()
    is_first_completed_attempt = finished_attempts_before == 0

    # 2. Resolve the exact question set assigned to this attempt.
    # For newer attempts we use persisted question_ids; for legacy attempts we fallback to full test set.
    expected_question_ids: list[uuid.UUID] = []
    if attempt.question_ids:
        try:
            expected_question_ids = [uuid.UUID(qid) for qid in attempt.question_ids]
        except (ValueError, TypeError):
            expected_question_ids = []

    if expected_question_ids:
        stmt = (
            select(Question)
            .options(selectinload(Question.answer_options))
            .where(Question.id.in_(expected_question_ids))
        )
    else:
        stmt = (
            select(Question)
            .options(selectinload(Question.answer_options))
            .where(Question.test_id == attempt.test_id)
        )

    result = await db.execute(stmt)
    questions = result.scalars().all()
    questions_map = {q.id: q for q in questions}
    test_question_ids = {q.id for q in questions}
    submitted_question_ids = {q_id for q_id in data.answers.keys()}
    visited_question_ids = set(data.visited_question_ids or [])

    # Allow partial submissions, but reject unknown question IDs.
    extra = submitted_question_ids - test_question_ids
    if extra:
        raise HTTPException(
            status_code=400,
            detail="Submission contains unknown questions.",
        )

    extra_visited = visited_question_ids - test_question_ids
    if extra_visited:
        raise HTTPException(
            status_code=400,
            detail="Submission contains unknown visited questions.",
        )

    effective_reviewed_ids = (visited_question_ids | submitted_question_ids) if visited_question_ids else set(test_question_ids)
    effective_reviewed_ids &= test_question_ids
    reviewed_question_count = len(effective_reviewed_ids) if effective_reviewed_ids else len(questions)
    answered_question_count = len(submitted_question_ids)
    completed_all = answered_question_count == len(questions) and reviewed_question_count == len(questions)

    # 2b. Response Times Validation (Phase 11)
    if data.response_times and len(data.response_times) not in {len(questions), len(data.answers), reviewed_question_count}:
        raise HTTPException(
            status_code=400,
            detail="Response times count must match total questions, reviewed questions, or submitted answers.",
        )
    
    if any(rt < 0 for rt in data.response_times):
        raise HTTPException(status_code=400, detail="Response times cannot be negative.")
    
    # Cap Realistic Values (> 5 minutes = 300,000 ms)
    validated_response_times = [min(rt, 300000) for rt in data.response_times]
    if len(validated_response_times) == len(data.answers) and len(questions) > len(data.answers):
        # Keep compatibility for older clients that only send answered-question timings.
        validated_response_times.extend([0] * (len(questions) - len(data.answers)))
    
    # Compute Cognitive Metrics
    avg_rt = sum(validated_response_times) / len(validated_response_times) if validated_response_times else 0
    variance_rt = sum((rt - avg_rt) ** 2 for rt in validated_response_times) / len(validated_response_times) if validated_response_times else 0
    
    # Normalized Variance for Classification (Threshold: 0.35)
    normalized_variance = variance_rt / (avg_rt ** 2) if avg_rt > 0 else 0
    
    cognitive_profile = "Stable"
    if avg_rt < 2500 and normalized_variance < 0.35:
        cognitive_profile = "Stable-Fast"
    elif normalized_variance >= 0.35:
        cognitive_profile = "Unstable"
    elif avg_rt >= 4000:
        cognitive_profile = "Slow-Deliberate"
    
    # Store on Attempt
    attempt.avg_response_time = avg_rt
    attempt.response_time_variance = variance_rt

    # 3. Timer Validation
    now = datetime.now(timezone.utc)
    # Ensure attempt has started_at (it should, but we check)
    started_at = attempt.started_at
    if not started_at.tzinfo:
        started_at = started_at.replace(tzinfo=timezone.utc)
        
    elapsed = now - started_at
    
    # Validate against per-attempt limit when available, fallback to test default for legacy attempts.
    if attempt.time_limit_seconds and attempt.time_limit_seconds > 0:
        duration_limit = dt_timedelta(seconds=attempt.time_limit_seconds)
    else:
        stmt_test = select(Test).where(Test.id == attempt.test_id)
        test_res = await db.execute(stmt_test)
        test_obj = test_res.scalar_one()
        duration_limit = dt_timedelta(minutes=test_obj.duration if test_obj.duration else 25)
    
    # Add a small buffer (e.g. 30 seconds) for network latency
    time_is_up = elapsed > (duration_limit + dt_timedelta(seconds=30))

    # 4. Process answers in a transaction-safe way
    detailed_answers = []
    detailed_answer_payloads: list[dict[str, object]] = []
    learning_answer_records: list[LearningAnswerRecord] = []
    correct_count = 0
    adaptive_profile: UserAdaptiveProfile | None = None
    topic_ids = {q.category_id for q in questions if q.category_id is not None}
    pre_topic_rows = (
        await db.execute(
            select(UserTopicStats).where(
                UserTopicStats.user_id == current_user.id,
                UserTopicStats.topic_id.in_(topic_ids),
            )
        )
    ).scalars().all() if topic_ids else []
    pre_topic_state = {
        row.topic_id: (int(row.total_attempts), float(row.accuracy_rate))
        for row in pre_topic_rows
    }
    due_review_count_before = int(
        (
            await db.execute(
                select(func.count(ReviewQueue.id)).where(
                    ReviewQueue.user_id == current_user.id,
                    ReviewQueue.next_review_at <= now,
                )
            )
        ).scalar_one()
        or 0
    )

    if attempt.mode == "adaptive":
        adaptive_profile_result = await db.execute(
            select(UserAdaptiveProfile).where(UserAdaptiveProfile.user_id == current_user.id)
        )
        adaptive_profile = adaptive_profile_result.scalar_one_or_none()
        if adaptive_profile is None:
            adaptive_profile = UserAdaptiveProfile(
                user_id=current_user.id,
                target_difficulty_percent=50,
            )
            db.add(adaptive_profile)
            await db.flush()
    
    # Clear existing answers (atomic overwrite)
    await db.execute(
        delete(AttemptAnswer).where(AttemptAnswer.attempt_id == attempt.id)
    )

    submitted_question_ids = list(data.answers.keys())
    history_rows = (
        await db.execute(
            select(UserQuestionHistory).where(
                UserQuestionHistory.user_id == current_user.id,
                UserQuestionHistory.question_id.in_(submitted_question_ids),
            )
        )
    ).scalars().all() if submitted_question_ids else []
    history_map = {row.question_id: row for row in history_rows}

    for q_id, opt_id in data.answers.items():
        question = questions_map[q_id]
        selected_option = next((o for o in question.answer_options if o.id == opt_id), None)
        if selected_option is None:
            raise HTTPException(
                status_code=400,
                detail="Invalid answer option submitted.",
            )
        
        # Find correct option
        correct_option = next((o for o in question.answer_options if o.is_correct), None)
        correct_option_id = correct_option.id if correct_option else opt_id
        is_correct = selected_option.is_correct
        feedback = build_question_feedback(
            question=question,
            selected_option=selected_option,
            correct_option=correct_option or selected_option,
            is_correct=bool(is_correct),
        )
        detailed_answer_payloads.append(
            {
                "question_id": q_id,
                "selected_option_id": opt_id,
                "correct_option_id": correct_option_id,
                "is_correct": is_correct,
                "correct_answer": feedback["correct_answer"],
                "explanation": feedback["explanation"],
                "ai_coach": feedback["ai_coach"],
                "recommendations": feedback["recommendations"],
            }
        )
        
        if is_correct:
            correct_count += 1
            
        # Create record
        ans_record = AttemptAnswer(
            attempt_id=attempt.id,
            question_id=q_id,
            selected_option_id=opt_id,
            is_correct=is_correct
        )
        db.add(ans_record)

        history = history_map.get(q_id)
        if history is None:
            history = UserQuestionHistory(
                user_id=current_user.id,
                question_id=q_id,
                attempt_count=0,
                correct_count=0,
            )
            db.add(history)
            history_map[q_id] = history

        history.attempt_count = int(history.attempt_count) + 1
        history.last_seen_at = now
        if is_correct:
            history.correct_count = int(history.correct_count) + 1
            history.last_correct_at = now

        if not settings.USE_PROGRESS_TRACKING_ONLY:
            # Legacy bulk-submit aggregate path kept behind a flag for staged migration.
            correct_inc = 1 if is_correct else 0
            before_snapshot = snapshot_question_row(question) if question_update_comparison_enabled() else None

            await db.execute(
                update(Question)
                .where(Question.id == q_id)
                .values(
                    total_attempts=Question.total_attempts + 1,
                    total_correct=Question.total_correct + correct_inc
                )
            )

            await db.execute(
                update(Question)
                .where(Question.id == q_id)
                .values(
                    dynamic_difficulty_score=func.greatest(
                        0.05,
                        func.least(
                            0.95,
                            1.0 - (func.cast(Question.total_correct, Float) / func.nullif(Question.total_attempts, 0))
                        )
                    )
                )
            )

            await db.refresh(question)
            if before_snapshot is not None:
                log_question_update_comparison(
                    source="attempts",
                    question_id=q_id,
                    before=before_snapshot,
                    after=snapshot_question_row(question),
                )

            detailed_answers.append(DetailedAnswer(
                question_id=q_id,
                selected_option_id=opt_id,
                correct_option_id=correct_option_id,
                is_correct=is_correct,
                dynamic_difficulty_score=question.dynamic_difficulty_score,
                correct_answer=feedback["correct_answer"],
                explanation=feedback["explanation"],
                ai_coach=feedback["ai_coach"],
                recommendations=feedback["recommendations"],
            ))
        learning_answer_records.append(
            LearningAnswerRecord(
                question_id=q_id,
                topic_id=question.category_id,
                is_correct=is_correct,
                occurred_at=now,
            )
        )

    # 5. Score-based adaptive target update (faster than per-question +/-1).
    if adaptive_profile is not None and questions:
        score_percent = (correct_count / max(1, reviewed_question_count)) * 100.0
        delta = 0
        if score_percent >= 85:
            delta = -4
        elif score_percent >= 70:
            delta = -2
        elif score_percent <= 35:
            delta = +5
        elif score_percent <= 50:
            delta = +3

        # Difficulty momentum from historical adaptive performance:
        # rising trend -> slightly harder; falling trend -> slightly easier.
        recent_scores_rows = (
            await db.execute(
                select(Attempt.score, Attempt.question_count)
                .where(
                    Attempt.user_id == current_user.id,
                    Attempt.mode == "adaptive",
                    Attempt.finished_at.is_not(None),
                    Attempt.score.is_not(None),
                    Attempt.question_count > 0,
                )
                .order_by(Attempt.finished_at.desc())
                .limit(6)
            )
        ).all()
        if len(recent_scores_rows) >= 6:
            recents = [
                (float(row.score) / max(1, int(row.question_count))) * 100.0
                for row in recent_scores_rows[:3]
            ]
            previous = [
                (float(row.score) / max(1, int(row.question_count))) * 100.0
                for row in recent_scores_rows[3:6]
            ]
            trend = (sum(recents) / len(recents)) - (sum(previous) / len(previous))
            if trend > 5.0:
                delta -= 2
            elif trend < -5.0:
                delta += 2

        adaptive_profile.target_difficulty_percent = max(
            0,
            min(100, int(adaptive_profile.target_difficulty_percent) + delta),
        )

    # 6. Finalize attempt
    if visited_question_ids:
        effective_total = max(1, reviewed_question_count)
        mistakes = max(0, answered_question_count - correct_count)
        unanswered_count = max(0, effective_total - answered_question_count)
    else:
        effective_total = len(questions)
        mistakes = effective_total - correct_count
        unanswered_count = max(0, effective_total - answered_question_count)

    attempt.question_count = effective_total
    attempt.score = int(correct_count * attempt.pressure_score_modifier)
    attempt.finished_at = now
    
    simulation_disqualified = bool(simulation.disqualified) if simulation is not None else False
    violation_count = int(simulation.violation_count or 0) if simulation is not None else None
    disqualification_reason = simulation.disqualification_reason if simulation is not None else None
    passed = completed_all and mistakes <= mistake_limit and not time_is_up and not simulation_disqualified

    # If time was up, they fail automatically
    if time_is_up:
        passed = False

    await apply_learning_progress_updates(
        db=db,
        user_id=current_user.id,
        answer_records=learning_answer_records,
    )
    if settings.USE_PROGRESS_TRACKING_ONLY and detailed_answer_payloads:
        refreshed_question_rows = (
            await db.execute(
                select(Question)
                .where(Question.id.in_(submitted_question_ids))
                .execution_options(populate_existing=True)
            )
        ).scalars().all()
        refreshed_question_map = {row.id: row for row in refreshed_question_rows}
        detailed_answers = [
            DetailedAnswer(
                question_id=payload["question_id"],
                selected_option_id=payload["selected_option_id"],
                correct_option_id=payload["correct_option_id"],
                is_correct=bool(payload["is_correct"]),
                dynamic_difficulty_score=float(
                    refreshed_question_map.get(payload["question_id"]).dynamic_difficulty_score
                    if refreshed_question_map.get(payload["question_id"]) is not None
                    else 0.5
                ),
                correct_answer=payload["correct_answer"],
                explanation=payload["explanation"],
                ai_coach=payload["ai_coach"],
                recommendations=payload["recommendations"],
            )
            for payload in detailed_answer_payloads
        ]
    if attempt.mode == "learning":
        db.add(
            AnalyticsEvent(
                user_id=current_user.id,
                event_name="learning_session_completed",
                metadata_json={
                    "session_id": str(attempt.id),
                    "score": attempt.score,
                    "total_questions": effective_total,
                    "passed": passed,
                },
            )
        )
    await _sync_simulation_completion(
        db,
        attempt,
        finished_at=now,
        mistake_count=mistakes,
        passed=passed,
        timeout=time_is_up,
        violation_count=violation_count,
        disqualified=simulation_disqualified,
        disqualification_reason=disqualification_reason,
    )
    reward_grant = await award_attempt_completion_rewards(
        db,
        current_user.id,
        attempt_id=attempt.id,
        mode=attempt.mode,
        passed=passed,
        score_percent=(correct_count / max(1, effective_total)) * 100.0,
        occurred_at=now,
        topic_ids={record.topic_id for record in learning_answer_records if record.topic_id is not None},
        pre_topic_state=pre_topic_state,
        due_review_count_before=due_review_count_before,
    )

    # Phase 20: Snapshot-Based ML Inference Storage
    try:
        from ml.model_registry import capture_inference_snapshot
        snapshot = await capture_inference_snapshot(db, attempt.id, str(current_user.id))
        if snapshot:
            db.add(snapshot)
    except Exception as e:
        # Fallback: log and continue so attempt completion is not blocked
        logging.getLogger(__name__).error(f"Snapshot storage failed (non-blocking): {e}")

    if settings.DRY_RUN:
        await db.flush()
    else:
        await db.commit()
        await db.refresh(attempt)

    # Compute lightweight intelligence summary from canonical learning tables.
    pass_prediction_label_value = pass_prediction_label(
        (correct_count / max(1, effective_total)) * 100.0,
    )
    skill_messages = []
    fading_topics = []
    topic_stability = {}
    
    try:
        topic_label_by_id: dict[uuid.UUID, str] = {}
        for question in questions:
            if question.category_id is None:
                continue
            topic_label_by_id.setdefault(
                question.category_id,
                (question.category or question.topic or "Umumiy").strip(),
            )

        topic_ids = [record.topic_id for record in learning_answer_records if record.topic_id is not None]
        unique_topic_ids = list(dict.fromkeys(topic_ids))
        stats_rows = (
            await db.execute(
                select(UserTopicStats).where(
                    UserTopicStats.user_id == current_user.id,
                    UserTopicStats.topic_id.in_(unique_topic_ids),
                )
            )
        ).scalars().all() if unique_topic_ids else []
        stats_map = {row.topic_id: row for row in stats_rows}

        review_due_rows = (
            await db.execute(
                select(Question.category_id, func.count(ReviewQueue.question_id))
                .join(Question, ReviewQueue.question_id == Question.id)
                .where(
                    ReviewQueue.user_id == current_user.id,
                    ReviewQueue.next_review_at <= now,
                    Question.category_id.in_(unique_topic_ids),
                )
                .group_by(Question.category_id)
            )
        ).all() if unique_topic_ids else []
        due_map = {topic_id: int(count or 0) for topic_id, count in review_due_rows if topic_id is not None}

        topic_accuracy_rows: list[tuple[str, float]] = []
        for topic_id in unique_topic_ids:
            label = topic_label_by_id.get(topic_id, "Umumiy")
            local_results = [
                record.is_correct
                for record in learning_answer_records
                if record.topic_id == topic_id
            ]
            if not local_results:
                continue
            accuracy = (sum(1 for result in local_results if result) / len(local_results)) * 100.0
            topic_accuracy_rows.append((label, accuracy))

            stats = stats_map.get(topic_id)
            total_attempts = int(stats.total_attempts or 0) if stats is not None else len(local_results)
            rolling_accuracy = float(stats.accuracy_rate or 0.0) * 100.0 if stats is not None else accuracy
            due_count = due_map.get(topic_id, 0)

            if rolling_accuracy >= 80.0 and total_attempts >= 10 and due_count == 0:
                topic_stability[label] = "High"
            elif rolling_accuracy >= 60.0 and total_attempts >= 4:
                topic_stability[label] = "Medium"
            else:
                topic_stability[label] = "Low"

            if due_count > 0 or rolling_accuracy < 55.0:
                fading_topics.append(label)

        topic_accuracy_rows.sort(key=lambda item: item[1])
        weakest_topics = topic_accuracy_rows[:2]
        strongest_topic = max(topic_accuracy_rows, key=lambda item: item[1]) if topic_accuracy_rows else None

        for label, accuracy in weakest_topics:
            skill_messages.append(
                f"{label} bo'yicha natija {accuracy:.0f}% — shu yo'nalishni qayta ko'ring."
            )
        if strongest_topic is not None and strongest_topic[1] >= 85.0:
            skill_messages.append(
                f"{strongest_topic[0]} bo'yicha natija yaxshi — murakkabroq savollarga o'tish mumkin."
            )

        recent_stmt = (
            select(Attempt.score, Attempt.question_count)
            .where(
                Attempt.user_id == current_user.id,
                Attempt.finished_at.is_not(None)
            )
            .order_by(Attempt.finished_at.desc())
            .limit(5)
        )
        recent_res = await db.execute(recent_stmt)
        recent_data = recent_res.all()

        if recent_data:
            total_pct = sum(
                attempt_score_percent(row.score, row.question_count)
                for row in recent_data
            )
            avg_pct = total_pct / len(recent_data)
            pass_prediction_label_value = pass_prediction_label(avg_pct)
    except Exception as e:
        logging.getLogger(__name__).exception(f"Detailed Intelligence update failure: {e}")
        pass_prediction_label_value = pass_prediction_label(
            (correct_count / max(1, effective_total)) * 100.0,
        )

    skill_messages = list(dict.fromkeys(skill_messages))[:4]
    fading_topics = list(dict.fromkeys(fading_topics))[:4]

    demo_review_enabled = _is_demo_account(current_user)
    answers_unlocked = current_user.is_premium or is_first_completed_attempt or demo_review_enabled or attempt.mode == "simulation"
    unlock_reason: str | None = None
    if current_user.is_premium:
        unlock_reason = "premium"
    elif attempt.mode == "simulation":
        unlock_reason = "simulation_review"
    elif is_first_completed_attempt:
        unlock_reason = "first_test_demo"
    elif demo_review_enabled:
        unlock_reason = "demo_account"
    else:
        unlock_reason = "premium_required"

    response_answers = detailed_answers if answers_unlocked else []
    response_skill_messages = skill_messages if answers_unlocked else []
    response_fading_topics = fading_topics if answers_unlocked else []
    response_topic_stability = topic_stability if answers_unlocked else {}

    _log_attempt_event(
        logging.INFO,
        event="exam_submitted",
        attempt_id=str(attempt.id),
        user_id=str(current_user.id),
        test_id=str(attempt.test_id),
        mode=attempt.mode,
        score=attempt.score,
        total_questions=effective_total,
        passed=passed,
    )

    response_payload = BulkSubmitResponse(
        score=attempt.score,
        total=effective_total,
        reviewed_count=effective_total,
        answered_count=answered_question_count,
        unanswered_count=unanswered_count,
        correct_count=correct_count,
        mistakes_count=mistakes,
        completed_all=completed_all,
        passed=passed,
        finished_at=attempt.finished_at.isoformat(),
        answers=response_answers,
        answers_unlocked=answers_unlocked,
        unlock_reason=unlock_reason,
        is_adaptive=(attempt.mode == "adaptive"),
        training_level=attempt.training_level,
        pass_prediction_label=pass_prediction_label_value,
        skill_messages=response_skill_messages,
        fading_topics=response_fading_topics,
        topic_stability=response_topic_stability,
        avg_response_time=avg_rt,
        cognitive_profile=cognitive_profile,
        pressure_mode=attempt.pressure_mode,
        mistake_limit=mistake_limit if attempt.mode == "simulation" else None,
        violation_count=violation_count,
        violation_limit=violation_limit,
        disqualified=simulation_disqualified,
        disqualification_reason=disqualification_reason,
        reward_summary=RewardSummary(
            xp_awarded=reward_grant.xp_awarded,
            coins_awarded=reward_grant.coins_awarded,
            achievements=[
                RewardAchievement(
                    id=getattr(achievement, "id", None),
                    name=achievement.achievement_definition.name,
                    icon=achievement.achievement_definition.icon,
                )
                for achievement in reward_grant.unlocked_achievements
            ],
        ),
    )
    if settings.DRY_RUN:
        log_dry_run_write(
            operation="attempts.submit",
            entity="attempt",
            entity_id=attempt.id,
            payload={
                "score": int(attempt.score or 0),
                "question_count": int(effective_total),
                "use_progress_tracking_only": bool(settings.USE_PROGRESS_TRACKING_ONLY),
            },
        )
        await db.rollback()
    return response_payload
