"""
Legacy analytics endpoints for frontend clients expecting /analytics/* paths.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.analytics.schemas import DashboardResponse, UserAnalyticsSummary
from api.analytics.user_router import get_dashboard, get_user_summary
from api.auth.router import get_current_user
from database.session import get_db
from models.user import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=UserAnalyticsSummary)
async def get_user_summary_legacy(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserAnalyticsSummary:
    return await get_user_summary(current_user=current_user, db=db)


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_legacy(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardResponse:
    return await get_dashboard(current_user=current_user, db=db)
