"""
Legacy analytics endpoints for frontend clients expecting /analytics/* paths.
"""

from datetime import datetime, timezone, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.admin.router import get_current_admin
from api.analytics.schemas import DashboardResponse, UserAnalyticsSummary
from api.analytics.user_router import get_dashboard, get_user_summary
from api.auth.router import get_current_user, resolve_user_from_access_token
from database.session import get_db
from models.analytics_event import AnalyticsEvent
from models.user import User
from services.experiments import record_experiment_event

router = APIRouter(prefix="/analytics", tags=["analytics"])
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

EVENT_NAMES = (
    "premium_block_view",
    "upgrade_click",
    "premium_click",
    "upgrade_page_view",
    "upgrade_success",
    "payment_success",
    "upgrade_failed",
)

SUPPORTED_PERIODS = {"today", "yesterday", "7d", "30d"}


class TrackEventRequest(BaseModel):
    event: str = Field(min_length=1, max_length=100)
    metadata: dict[str, Any] = Field(default_factory=dict)


def _start_of_utc_day(value: datetime) -> datetime:
    return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)


def _end_of_utc_day(value: datetime) -> datetime:
    return datetime(value.year, value.month, value.day, 23, 59, 59, 999999, tzinfo=timezone.utc)


def _resolve_period_range(period: str) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    if period == "today":
        return _start_of_utc_day(now), _end_of_utc_day(now)
    if period == "yesterday":
        yesterday = now - timedelta(days=1)
        return _start_of_utc_day(yesterday), _end_of_utc_day(yesterday)
    if period == "7d":
        start = _start_of_utc_day(now - timedelta(days=6))
        return start, _end_of_utc_day(now)
    start = _start_of_utc_day(now - timedelta(days=29))
    return start, _end_of_utc_day(now)


def _safe_rate(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 6)


async def _resolve_optional_user_id(
    token: str | None,
    db: AsyncSession,
) -> UUID | None:
    if not token:
        return None

    user = await resolve_user_from_access_token(token, db=db, include_subscription=False)
    if not user or not user.is_active:
        return None
    return user.id


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


@router.post("/track", status_code=status.HTTP_204_NO_CONTENT)
async def track_event(
    payload: TrackEventRequest,
    db: AsyncSession = Depends(get_db),
    token: str | None = Depends(oauth2_scheme_optional),
) -> None:
    event_name = payload.event.strip()
    if not event_name:
        return None

    user_id = await _resolve_optional_user_id(token, db)
    await record_experiment_event(
        db,
        user_id=user_id,
        event_name=event_name,
        metadata=payload.metadata or {},
    )
    await db.commit()
    return None


@router.get("/funnel")
async def get_funnel(
    period: str | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> dict[str, Any]:
    if period is not None and period not in SUPPORTED_PERIODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid period. Supported values: today, yesterday, 7d, 30d.",
        )

    start_at: datetime | None = None
    end_at: datetime | None = None
    if period:
        start_at, end_at = _resolve_period_range(period)

    stmt = (
        select(AnalyticsEvent.event_name, func.count(AnalyticsEvent.id))
        .where(AnalyticsEvent.event_name.in_(EVENT_NAMES))
        .group_by(AnalyticsEvent.event_name)
    )
    if start_at:
        stmt = stmt.where(AnalyticsEvent.created_at >= start_at)
    if end_at:
        stmt = stmt.where(AnalyticsEvent.created_at <= end_at)

    result = await db.execute(stmt)
    counts = {name: 0 for name in EVENT_NAMES}
    for event_name, count in result.all():
        if event_name in counts:
            counts[event_name] = int(count or 0)

    premium_views = counts["premium_block_view"]
    upgrade_clicks = counts["upgrade_click"] + counts["premium_click"]
    upgrade_page_views = counts["upgrade_page_view"]
    upgrade_success = counts["upgrade_success"] + counts["payment_success"]

    return {
        "premium_block_view": premium_views,
        "upgrade_click": upgrade_clicks,
        "upgrade_page_view": upgrade_page_views,
        "upgrade_success": upgrade_success,
        "ctr": _safe_rate(upgrade_clicks, premium_views),
        "conversion_rate": _safe_rate(upgrade_success, premium_views),
        "pass_probability": 0,
    }
