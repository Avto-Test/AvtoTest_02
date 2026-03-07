"""
AUTOTEST Attempts Router
API endpoints for test attempts
"""

from datetime import datetime, timezone, timedelta as dt_timedelta
from math import exp, sqrt
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
    ScoreResponse,
    StartAttempt,
    StartAttemptResponse,
    SubmitAnswer,
)
from api.auth.router import get_current_user
from database.session import get_db
from models.answer_option import AnswerOption
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.guest_attempt import GuestAttempt
from models.guest_attempt_answer import GuestAttemptAnswer
from models.question import Question
from models.test import Test
from models.user import User
from models.user_adaptive_profile import UserAdaptiveProfile
from models.user_question_history import UserQuestionHistory

router = APIRouter(prefix="/attempts", tags=["attempts"])

# Limits
FREE_MAX_ATTEMPTS_PER_DAY = 2
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


def _resolve_duration_minutes(question_count: int, pressure_mode: bool) -> int:
    minutes = QUESTION_COUNT_TO_MINUTES.get(
        question_count,
        max(10, int(round(question_count * 1.25))),
    )
    if pressure_mode:
        minutes = max(5, int(round(minutes * 0.8)))
    return minutes


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
    await db.commit()
    await db.refresh(attempt)
    
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
        Created answer details with correctness
    
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

    correct_option_result = await db.execute(
        select(AnswerOption.id).where(
            AnswerOption.question_id == data.question_id,
            AnswerOption.is_correct == True,
        )
    )
    correct_option_id = correct_option_result.scalar_one_or_none()
    
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
            is_correct=existing_answer.is_correct,
            correct_option_id=correct_option_id,
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
        is_correct=attempt_answer.is_correct,
        correct_option_id=correct_option_id,
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

    correct_option_result = await db.execute(
        select(AnswerOption.id).where(
            AnswerOption.question_id == data.question_id,
            AnswerOption.is_correct == True,
        )
    )
    correct_option_id = correct_option_result.scalar_one_or_none()

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
            is_correct=existing_answer.is_correct,
            correct_option_id=correct_option_id,
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
        is_correct=attempt_answer.is_correct,
        correct_option_id=correct_option_id,
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
    await db.commit()
    await db.refresh(attempt)
    
    return ScoreResponse(
        attempt_id=attempt.id,
        score=attempt.score,
        total_questions=total_questions,
        finished_at=attempt.finished_at.isoformat(),
    )


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

    # Allow partial submissions, but reject unknown question IDs.
    extra = submitted_question_ids - test_question_ids
    if extra:
        raise HTTPException(
            status_code=400,
            detail="Submission contains unknown questions.",
        )

    # 2b. Response Times Validation (Phase 11)
    if data.response_times and len(data.response_times) not in {len(questions), len(data.answers)}:
        raise HTTPException(
            status_code=400,
            detail="Response times count must match total questions (or submitted answers for legacy clients).",
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
    correct_count = 0
    topic_results = {}
    adaptive_profile: UserAdaptiveProfile | None = None

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

        # Atomic update for Question performance
        correct_inc = 1 if is_correct else 0
        
        await db.execute(
            update(Question)
            .where(Question.id == q_id)
            .values(
                total_attempts=Question.total_attempts + 1,
                total_correct=Question.total_correct + correct_inc
            )
        )
        
        # Now update difficulty score based on the new totals
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
        
        # Refresh question to get updated difficulty score
        await db.refresh(question)
        
        # Capture for intelligence modeling (avoiding relationship trigger later)
        topic_key = question.topic or question.category
        if topic_key:
            if topic_key not in topic_results:
                topic_results[topic_key] = []
            topic_results[topic_key].append({
                "correct": is_correct,
                "difficulty": question.dynamic_difficulty_score
            })

        detailed_answers.append(DetailedAnswer(
            question_id=q_id,
            selected_option_id=opt_id,
            correct_option_id=correct_option_id,
            is_correct=is_correct,
            dynamic_difficulty_score=question.dynamic_difficulty_score
        ))

    # 5. Score-based adaptive target update (faster than per-question +/-1).
    if adaptive_profile is not None and questions:
        score_percent = (correct_count / len(questions)) * 100.0
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
    attempt.score = int(correct_count * attempt.pressure_score_modifier)
    attempt.finished_at = now
    
    # Success condition (Normal: 2 mistakes, Pressure Mode: 1 mistake)
    mistake_limit = 1 if attempt.pressure_mode else 2
    mistakes = len(questions) - correct_count
    passed = mistakes <= mistake_limit and not time_is_up

    # If time was up, they fail automatically
    if time_is_up:
        passed = False

    # Phase 20: Snapshot-Based ML Inference Storage
    try:
        from ml.model_registry import capture_inference_snapshot
        snapshot = await capture_inference_snapshot(db, attempt.id, str(current_user.id))
        if snapshot:
            db.add(snapshot)
    except Exception as e:
        # Fallback: log and continue so attempt completion is not blocked
        from core.config import settings
        import logging
        logging.getLogger(__name__).error(f"Snapshot storage failed (non-blocking): {e}")

    await db.commit()
    await db.refresh(attempt)

    # Compute pass_prediction_label from recent history
    pass_prediction_label = None
    skill_messages = []
    fading_topics = []
    topic_stability = {}
    
    try:
        # Phase 7: User Skill Vector Modeling
        from models.user_skill import UserSkill
        
        # 1. Collect topic/category keys for this test
        topics = list(set([(q.topic or q.category) for q in questions if (q.topic or q.category)]))
        
        # 2. Batch fetch existing skills for these topics
        skill_stmt = select(UserSkill).where(
            UserSkill.user_id == current_user.id,
            UserSkill.topic.in_(topics)
        )
        skill_res = await db.execute(skill_stmt)
        skills_map = {s.topic: s for s in skill_res.scalars().all()}
        
        # Track initial skills for message generation
        initial_skills = {t: (skills_map[t].skill_score if t in skills_map else 0.5) for t in topics}
        initial_bkt = {t: (skills_map[t].bkt_knowledge_prob if t in skills_map else 0.3) for t in topics}

        # 3. Update skills sequentially (Phase 7 - 10)
        # Note: topic_results was pre-populated in the first loop to avoid lazy-loading triggers

        # BKT Constants
        P_SLIP = 0.1
        P_LEARN = 0.08

        # Phase 9: Memory Decay & Retention
        from math import exp
        
        for topic, results in topic_results.items():
            skill_obj = skills_map.get(topic)
            if not skill_obj:
                skill_obj = UserSkill(
                    user_id=current_user.id, 
                    topic=topic, 
                    skill_score=0.5, 
                    bkt_knowledge_prob=0.3,
                    retention_score=1.0,
                    repetition_count=0,
                    interval_days=0,
                    ease_factor=2.5
                )
                db.add(skill_obj)
            
            current_ema = skill_obj.skill_score
            current_bkt = skill_obj.bkt_knowledge_prob
            
            # Dynamic Retention Check (Phase 9)
            if skill_obj.last_practice_at:
                days_since = (now - skill_obj.last_practice_at).days
                decay_lambda = 0.015
                retention = max(0.2, min(1.0, exp(-decay_lambda * days_since)))
                if retention < 0.6:
                    fading_topics.append(topic)
                    skill_messages.append(f"This topic needs revision Ч knowledge fading in {topic}")
            
            for r in results:
                # --- EMA Logic ---
                ema_res = 1.0 if r["correct"] else 0.0
                current_ema = (0.7 * current_ema) + (0.3 * ema_res)
                current_ema = max(0.05, min(0.95, current_ema))
                
                # --- BKT Logic ---
                diff = r["difficulty"]
                if diff < 0.33: p_guess = 0.25
                elif diff <= 0.66: p_guess = 0.2
                else: p_guess = 0.15
                
                prior = max(0.01, min(0.99, current_bkt))
                if r["correct"]:
                    num = prior * (1 - P_SLIP)
                    den = num + (1 - prior) * p_guess
                else:
                    num = prior * P_SLIP
                    den = num + (1 - prior) * (1 - p_guess)
                
                posterior = num / den if den != 0 else prior
                # Apply learning
                posterior = posterior + (1 - posterior) * P_LEARN
                current_bkt = max(0.01, min(0.99, posterior))
            
            # --- Phase 10: Spaced Repetition (SM-2) ---
            from datetime import timedelta
            any_wrong = any(not r["correct"] for r in results)
            
            # Compute session quality for topic
            if not any_wrong:
                quality = 5 if current_bkt > 0.8 else 4
            else:
                quality = 2 if current_bkt > 0.5 else 1
            
            # SM-2 logic
            if quality < 3:
                skill_obj.repetition_count = 0
                skill_obj.interval_days = 1
            else:
                if skill_obj.repetition_count == 0:
                    skill_obj.interval_days = 1
                elif skill_obj.repetition_count == 1:
                    skill_obj.interval_days = 6
                else:
                    skill_obj.interval_days = round(skill_obj.interval_days * skill_obj.ease_factor)
                
                skill_obj.repetition_count += 1
            
            # Update Ease Factor
            skill_obj.ease_factor = skill_obj.ease_factor + (
                0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
            )
            skill_obj.ease_factor = max(1.3, skill_obj.ease_factor)
            skill_obj.interval_days = max(1, skill_obj.interval_days)
            
            skill_obj.next_review_at = now + timedelta(days=skill_obj.interval_days)
            
            # Generate Stability Label
            if skill_obj.repetition_count >= 3:
                topic_stability[topic] = "High"
            elif skill_obj.repetition_count >= 1:
                topic_stability[topic] = "Medium"
            else:
                topic_stability[topic] = "Low"

            skill_obj.skill_score = current_ema
            skill_obj.bkt_knowledge_prob = current_bkt
            skill_obj.total_attempts += len(results)
            skill_obj.bkt_attempts += len(results)
            
            # Reset Retention on Practice
            skill_obj.last_practice_at = now
            skill_obj.retention_score = 1.0
            skill_obj.last_updated = now

            # 4. Generate Messages
            # EMA check
            ema_diff = current_ema - initial_skills.get(topic, 0.5)
            if ema_diff > 0.05:
                skill_messages.append(f"Skill improved in {topic}")
            elif ema_diff < -0.05:
                skill_messages.append(f"Focus on {topic} for improvement")
                
            # BKT check
            bkt_diff = current_bkt - initial_bkt.get(topic, 0.3)
            if bkt_diff > 0.02:
                skill_messages.append(f"Concept mastery improved in {topic}")
            elif bkt_diff < -0.02:
                skill_messages.append(f"Reinforcement needed in {topic}")
            
            if skill_obj.retention_score > 0.9:
                skill_messages.append(f"Strong long-term retention in {topic}")
            
            if quality >= 4:
                skill_messages.append(f"Memory interval extended for {topic}")

        # COMMIT ALL UPDATES (skills + attempt)
        await db.commit()
        await db.refresh(attempt)

        # Dashboard Pass Prediction recalculation
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
            # Correctly calculate percentage based on each attempt's question count
            total_pct = sum((row.score / max(1, row.question_count)) * 100 for row in recent_data)
            avg_pct = total_pct / len(recent_data)
            
            # Simplified probability estimate for result page
            prob = min(100.0, max(0.0, avg_pct))
            if prob >= 95:
                pass_prediction_label = "Exam Ready"
            elif prob >= 85:
                pass_prediction_label = "Very Likely to Pass"
            elif prob >= 70:
                pass_prediction_label = "Likely to Pass"
            elif prob >= 50:
                pass_prediction_label = "Needs Improvement"
            else:
                pass_prediction_label = "High Risk of Failing"
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception(f"Detailed Intelligence update failure: {e}")
        pass_prediction_label = None

    answers_unlocked = current_user.is_premium or is_first_completed_attempt
    unlock_reason: str | None = None
    if current_user.is_premium:
        unlock_reason = "premium"
    elif is_first_completed_attempt:
        unlock_reason = "first_test_demo"
    else:
        unlock_reason = "premium_required"

    response_answers = detailed_answers if answers_unlocked else []
    response_skill_messages = skill_messages if answers_unlocked else []
    response_fading_topics = fading_topics if answers_unlocked else []
    response_topic_stability = topic_stability if answers_unlocked else {}

    return BulkSubmitResponse(
        score=attempt.score,
        total=len(questions),
        correct_count=correct_count,
        mistakes_count=len(questions) - correct_count,
        passed=passed,
        finished_at=attempt.finished_at.isoformat(),
        answers=response_answers,
        answers_unlocked=answers_unlocked,
        unlock_reason=unlock_reason,
        is_adaptive=(attempt.mode == "adaptive"),
        training_level=attempt.training_level,
        pass_prediction_label=pass_prediction_label,
        skill_messages=response_skill_messages,
        fading_topics=response_fading_topics,
        topic_stability=response_topic_stability,
        avg_response_time=avg_rt,
        cognitive_profile=cognitive_profile,
        pressure_mode=attempt.pressure_mode
    )
