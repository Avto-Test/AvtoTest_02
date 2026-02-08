"""
AUTOTEST Admin Analytics Router
Analytics endpoints for admins
"""

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.admin.router import get_current_admin
from api.analytics.schemas import AdminAnalyticsSummary, TopTestAnalytics
from database.session import get_db
from models.attempt import Attempt
from models.subscription import Subscription
from models.test import Test
from models.user import User

router = APIRouter(prefix="/analytics/admin", tags=["analytics"])


@router.get("/summary", response_model=AdminAnalyticsSummary)
async def get_admin_summary(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> AdminAnalyticsSummary:
    """
    Get global platform statistics.
    Returns counts of users, subscriptions, tests, and attempts.
    """
    # Total users
    total_users = await db.scalar(select(func.count(User.id))) or 0
    
    # Subscription stats
    # Note: Users without subscription record are effectively 'free', 
    # but strictly speaking we count explicit 'premium' vs 'free' records here.
    # Alternatively, we can query Subscription table directly.
    
    premium_users = await db.scalar(
        select(func.count(Subscription.id)).where(
            Subscription.plan == "premium",
            (Subscription.expires_at == None) | (Subscription.expires_at > func.now())
        )
    ) or 0
    
    # Calculate free users as Total - Premium (simplification)
    free_users = total_users - premium_users
    
    # Total tests
    total_tests = await db.scalar(select(func.count(Test.id))) or 0
    
    # Total attempts
    total_attempts = await db.scalar(select(func.count(Attempt.id))) or 0
    
    return AdminAnalyticsSummary(
        total_users=total_users,
        premium_users=premium_users,
        free_users=free_users,
        total_tests=total_tests,
        total_attempts=total_attempts,
    )


@router.get("/top-tests", response_model=list[TopTestAnalytics])
async def get_top_tests(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> list[TopTestAnalytics]:
    """
    Get top tests by attempt count.
    Ordered by attempts_count DESC.
    """
    stmt = (
        select(
            Attempt.test_id,
            Test.title,
            func.count(Attempt.id).label("attempts_count"),
            func.avg(Attempt.score).label("average_score"),
        )
        .join(Test, Attempt.test_id == Test.id)
        .group_by(Attempt.test_id, Test.title)
        .order_by(desc("attempts_count"))
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    analytics = []
    for row in rows:
        analytics.append(
            TopTestAnalytics(
                test_id=row.test_id,
                title=row.title,
                attempts_count=row.attempts_count,
                average_score=round(float(row.average_score or 0.0), 2),
            )
        )
        
    return analytics
