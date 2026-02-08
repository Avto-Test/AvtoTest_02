"""
AUTOTEST Attempts Router
API endpoints for test attempts
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.attempts.schemas import (
    AnswerResponse,
    AttemptResponse,
    FinishAttempt,
    ScoreResponse,
    StartAttempt,
    SubmitAnswer,
)
from api.auth.router import get_current_user
from database.session import get_db
from models.answer_option import AnswerOption
from models.attempt import Attempt
from models.attempt_answer import AttemptAnswer
from models.question import Question
from models.test import Test
from models.user import User

router = APIRouter(prefix="/attempts", tags=["attempts"])

# Limits
FREE_MAX_ATTEMPTS_PER_DAY = 3


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


@router.post("/start", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED)
async def start_attempt(
    data: StartAttempt,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AttemptResponse:
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
        select(Test).where(Test.id == data.test_id, Test.is_active == True)
    )
    test = result.scalar_one_or_none()
    
    if test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found or inactive",
        )
    
    # Create new attempt
    attempt = Attempt(
        user_id=current_user.id,
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
    
    # Verify question belongs to the test
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
            is_correct=existing_answer.is_correct,
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
    
    # Get total questions count
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
