"""Admin analytics endpoints backed by canonical server-side aggregations."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.admin.router import get_current_admin
from database.session import get_db
from models.user import User
from modules.analytics.schemas import AdminAnalyticsSummary
from modules.analytics.service import get_admin_analytics_summary

router = APIRouter(prefix="/analytics/admin", tags=["analytics"])


@router.get("/summary", response_model=AdminAnalyticsSummary)
async def get_admin_summary(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> AdminAnalyticsSummary:
    """Backward-compatible admin analytics summary endpoint."""
    return await get_admin_analytics_summary(db)
