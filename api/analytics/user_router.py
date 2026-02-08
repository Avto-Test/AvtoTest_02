"""
AUTOTEST User Analytics Router
Analytics endpoints for authenticated users
"""

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.analytics.schemas import (
    UserAnalyticsSummary,
    UserAttemptSummary,
    UserTestAnalytics,
)
from api.auth.router import get_current_user
from database.session import get_db
from models.attempt import Attempt
from models.test import Test
from models.user import User

router = APIRouter(prefix="/analytics/me", tags=["analytics"])


@router.get("/summary", response_model=UserAnalyticsSummary)
async def get_user_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserAnalyticsSummary:
    """
    Get summary of current user's performance.
    Returns total attempts, average score, and last 5 attempts.
    """
    # Total attempts
    total_attempts = await db.scalar(
        select(func.count(Attempt.id)).where(Attempt.user_id == current_user.id)
    ) or 0
    
    # Average score
    average_score = await db.scalar(
        select(func.avg(Attempt.score)).where(Attempt.user_id == current_user.id)
    ) or 0.0
    
    # Last 5 attempts
    result = await db.execute(
        select(Attempt)
        .where(Attempt.user_id == current_user.id)
        .order_by(Attempt.finished_at.desc().nulls_last())
        .limit(5)
        .options(selectinload(Attempt.test))
    )
    attempts = result.scalars().all()
    
    last_attempts = [
        UserAttemptSummary(
            id=attempt.id,
            test_title=attempt.test.title,
            score=attempt.score,
            finished_at=attempt.finished_at,
        )
        for attempt in attempts
    ]
    
    return UserAnalyticsSummary(
        total_attempts=total_attempts,
        average_score=round(float(average_score), 2),
        last_attempts=last_attempts,
    )


@router.get("/tests", response_model=list[UserTestAnalytics])
async def get_user_test_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserTestAnalytics]:
    """
    Get user's performance grouped by test.
    Returns attempts count, best score, and average score per test.
    """
    # Group attempts by test_id
    stmt = (
        select(
            Attempt.test_id,
            Test.title,
            func.count(Attempt.id).label("attempts_count"),
            func.max(Attempt.score).label("best_score"),
            func.avg(Attempt.score).label("average_score"),
        )
        .join(Test, Attempt.test_id == Test.id)
        .where(Attempt.user_id == current_user.id)
        .group_by(Attempt.test_id, Test.title, Test.created_at)
        .order_by(Test.created_at.desc())
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    analytics = []
    for row in rows:
        analytics.append(
            UserTestAnalytics(
                test_id=row.test_id,
                title=row.title,
                attempts_count=row.attempts_count,
                best_score=row.best_score,
                average_score=round(float(row.average_score or 0.0), 2),
            )
        )
        
    return analytics
