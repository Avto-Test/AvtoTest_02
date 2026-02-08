"""
AUTOTEST Public Test Router
Endpoints for browsing and viewing tests
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.tests.schemas import PublicTestDetail, PublicTestList
from database.session import get_db
from models.answer_option import AnswerOption
from models.question import Question
from models.test import Test

router = APIRouter(prefix="/tests", tags=["tests"])


@router.get("", response_model=list[PublicTestList])
async def get_tests(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """
    Get list of active tests.
    """
    # Query tests with question count
    stmt = (
        select(
            Test.id,
            Test.title,
            Test.description,
            Test.difficulty,
            Test.created_at,
            func.count(Question.id).label("question_count"),
        )
        .outerjoin(Question, Question.test_id == Test.id)
        .where(Test.is_active == True)
        .group_by(Test.id)
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Map to schema
    return [
        PublicTestList(
            id=row.id,
            title=row.title,
            description=row.description,
            difficulty=row.difficulty,
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
    Includes questions and answer options (hidden is_correct).
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
        
    return test
