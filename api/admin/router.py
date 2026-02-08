"""
AUTOTEST Admin Router
Admin CRUD endpoints for Tests, Questions, and AnswerOptions
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.admin.schemas import (
    AnswerOptionCreate,
    AnswerOptionResponse,
    AnswerOptionUpdate,
    QuestionCreate,
    QuestionResponse,
    QuestionUpdate,
    TestCreate,
    TestResponse,
    TestUpdate,
)
from api.auth.router import get_current_user
from database.session import get_db
from models.answer_option import AnswerOption
from models.question import Question
from models.test import Test
from models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to verify the current user is an admin.
    
    Args:
        current_user: The authenticated user
    
    Returns:
        The admin User object
    
    Raises:
        HTTPException: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ========== Test CRUD ==========

@router.post("/tests", response_model=TestResponse, status_code=status.HTTP_201_CREATED)
async def create_test(
    test_data: TestCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Test:
    """Create a new test."""
    new_test = Test(
        title=test_data.title,
        description=test_data.description,
        difficulty=test_data.difficulty,
        is_active=test_data.is_active,
    )
    db.add(new_test)
    await db.commit()
    await db.refresh(new_test)
    return new_test


@router.get("/tests", response_model=list[TestResponse])
async def get_tests(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[Test]:
    """Get all tests."""
    result = await db.execute(select(Test).order_by(Test.created_at.desc()))
    return list(result.scalars().all())


@router.put("/tests/{test_id}", response_model=TestResponse)
async def update_test(
    test_id: UUID,
    test_data: TestUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Test:
    """Update a test."""
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    
    if test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found",
        )
    
    if test_data.title is not None:
        test.title = test_data.title
    if test_data.description is not None:
        test.description = test_data.description
    if test_data.difficulty is not None:
        test.difficulty = test_data.difficulty
    if test_data.is_active is not None:
        test.is_active = test_data.is_active
    
    await db.commit()
    await db.refresh(test)
    return test


@router.delete("/tests/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(
    test_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    """Delete a test (cascades to questions and options)."""
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    
    if test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found",
        )
    
    await db.delete(test)
    await db.commit()


# ========== Question CRUD ==========

@router.post(
    "/tests/{test_id}/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_question(
    test_id: UUID,
    question_data: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Question:
    """Create a new question for a test."""
    # Verify test exists
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    
    if test is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found",
        )
    
    new_question = Question(
        test_id=test_id,
        text=question_data.text,
        image_url=question_data.image_url,
    )
    db.add(new_question)
    await db.commit()
    await db.refresh(new_question)
    return new_question


@router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: UUID,
    question_data: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> Question:
    """Update a question."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    
    if question_data.text is not None:
        question.text = question_data.text
    if question_data.image_url is not None:
        question.image_url = question_data.image_url
    
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    """Delete a question (cascades to options)."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    
    await db.delete(question)
    await db.commit()


# ========== AnswerOption CRUD ==========

@router.post(
    "/questions/{question_id}/options",
    response_model=AnswerOptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_answer_option(
    question_id: UUID,
    option_data: AnswerOptionCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> AnswerOption:
    """
    Create a new answer option for a question.
    Enforces only ONE correct answer per question.
    """
    # Verify question exists
    result = await db.execute(
        select(Question)
        .where(Question.id == question_id)
        .options(selectinload(Question.answer_options))
    )
    question = result.scalar_one_or_none()
    
    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )
    
    # Enforce only ONE correct answer per question
    if option_data.is_correct:
        for existing_option in question.answer_options:
            if existing_option.is_correct:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Question already has a correct answer. Update existing option first.",
                )
    
    new_option = AnswerOption(
        question_id=question_id,
        text=option_data.text,
        is_correct=option_data.is_correct,
    )
    db.add(new_option)
    await db.commit()
    await db.refresh(new_option)
    return new_option


@router.put("/options/{option_id}", response_model=AnswerOptionResponse)
async def update_answer_option(
    option_id: UUID,
    option_data: AnswerOptionUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> AnswerOption:
    """
    Update an answer option.
    Enforces only ONE correct answer per question.
    """
    result = await db.execute(
        select(AnswerOption).where(AnswerOption.id == option_id)
    )
    option = result.scalar_one_or_none()
    
    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer option not found",
        )
    
    # Enforce only ONE correct answer per question if setting is_correct=True
    if option_data.is_correct is True and not option.is_correct:
        result = await db.execute(
            select(AnswerOption).where(
                AnswerOption.question_id == option.question_id,
                AnswerOption.is_correct == True,
                AnswerOption.id != option_id,
            )
        )
        existing_correct = result.scalar_one_or_none()
        if existing_correct:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question already has a correct answer. Set the other option to is_correct=False first.",
            )
    
    if option_data.text is not None:
        option.text = option_data.text
    if option_data.is_correct is not None:
        option.is_correct = option_data.is_correct
    
    await db.commit()
    await db.refresh(option)
    return option


@router.delete("/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_answer_option(
    option_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> None:
    """Delete an answer option."""
    result = await db.execute(
        select(AnswerOption).where(AnswerOption.id == option_id)
    )
    option = result.scalar_one_or_none()
    
    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer option not found",
        )
    
    await db.delete(option)
    await db.commit()
