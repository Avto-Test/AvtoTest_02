"""Backend-driven admin growth funnel aggregations."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.analytics.schemas import (
    AdminGrowthConversionRates,
    AdminGrowthDropOffs,
    AdminGrowthSummary,
)
from models.analytics_event import AnalyticsEvent
from models.attempt import Attempt
from models.payment import Payment
from models.user import User

GrowthRange = Literal["all", "7d", "30d"]

PREMIUM_CLICK_EVENTS = ("upgrade_click", "premium_upgrade_click", "premium_click")
SUCCESSFUL_PAYMENT_STATUSES = ("succeeded",)


def _resolve_growth_window_start(range_value: GrowthRange) -> datetime | None:
    now_utc = datetime.now(timezone.utc)
    if range_value == "7d":
        return now_utc - timedelta(days=7)
    if range_value == "30d":
        return now_utc - timedelta(days=30)
    return None


def _safe_percent(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 1)


async def get_admin_growth_summary(
    db: AsyncSession,
    *,
    range_value: GrowthRange = "all",
) -> AdminGrowthSummary:
    """Return a simple growth funnel sourced only from persisted backend data."""

    window_start = _resolve_growth_window_start(range_value)

    registered_users_stmt = select(func.count(User.id))
    if window_start is not None:
        registered_users_stmt = registered_users_stmt.where(User.created_at >= window_start)
    registered_users_sq = registered_users_stmt.scalar_subquery()

    active_users_subquery_stmt = (
        select(Attempt.user_id)
        .where(Attempt.user_id.is_not(None))
        .group_by(Attempt.user_id)
    )
    if window_start is not None:
        active_users_subquery_stmt = active_users_subquery_stmt.where(Attempt.started_at >= window_start)
    active_users_sq = (
        select(func.count())
        .select_from(active_users_subquery_stmt.subquery())
        .scalar_subquery()
    )

    engaged_users_subquery_stmt = (
        select(Attempt.user_id)
        .where(Attempt.user_id.is_not(None))
        .group_by(Attempt.user_id)
        .having(func.count(Attempt.id) >= 2)
    )
    if window_start is not None:
        engaged_users_subquery_stmt = engaged_users_subquery_stmt.where(Attempt.started_at >= window_start)
    engaged_users_sq = (
        select(func.count())
        .select_from(engaged_users_subquery_stmt.subquery())
        .scalar_subquery()
    )

    premium_clicks_subquery_stmt = (
        select(AnalyticsEvent.user_id)
        .where(
            AnalyticsEvent.user_id.is_not(None),
            func.lower(AnalyticsEvent.event_name).in_(PREMIUM_CLICK_EVENTS),
        )
        .group_by(AnalyticsEvent.user_id)
    )
    if window_start is not None:
        premium_clicks_subquery_stmt = premium_clicks_subquery_stmt.where(AnalyticsEvent.created_at >= window_start)
    premium_clicks_sq = (
        select(func.count())
        .select_from(premium_clicks_subquery_stmt.subquery())
        .scalar_subquery()
    )

    successful_payments_subquery_stmt = (
        select(Payment.user_id)
        .where(
            Payment.user_id.is_not(None),
            func.lower(Payment.status).in_(SUCCESSFUL_PAYMENT_STATUSES),
        )
        .group_by(Payment.user_id)
    )
    if window_start is not None:
        successful_payments_subquery_stmt = successful_payments_subquery_stmt.where(Payment.created_at >= window_start)
    successful_payments_sq = (
        select(func.count())
        .select_from(successful_payments_subquery_stmt.subquery())
        .scalar_subquery()
    )

    result = await db.execute(
        select(
            registered_users_sq.label("registered_users"),
            active_users_sq.label("active_users"),
            engaged_users_sq.label("engaged_users"),
            premium_clicks_sq.label("premium_clicks"),
            successful_payments_sq.label("successful_payments"),
        )
    )
    row = result.mappings().one()

    registered_users = int(row["registered_users"] or 0)
    active_users = int(row["active_users"] or 0)
    engaged_users = int(row["engaged_users"] or 0)
    premium_clicks = int(row["premium_clicks"] or 0)
    successful_payments = int(row["successful_payments"] or 0)

    return AdminGrowthSummary(
        registered_users=registered_users,
        active_users=active_users,
        engaged_users=engaged_users,
        premium_clicks=premium_clicks,
        successful_payments=successful_payments,
        conversion_rates=AdminGrowthConversionRates(
            activation_rate=_safe_percent(active_users, registered_users),
            engagement_rate=_safe_percent(engaged_users, active_users),
            payment_rate=_safe_percent(successful_payments, engaged_users),
        ),
        drop_offs=AdminGrowthDropOffs(
            registration_to_activity=max(registered_users - active_users, 0),
            activity_to_engagement=max(active_users - engaged_users, 0),
            engagement_to_premium_click=max(engaged_users - premium_clicks, 0),
            engagement_to_payment=max(engaged_users - successful_payments, 0),
        ),
    )
