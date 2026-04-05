"""Aggregations for premium monetization analytics and feature performance."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.analytics.schemas import (
    AdminMonetizationSummary,
    FeatureAnalyticsTimeSeriesPoint,
    FeatureFunnelResponse,
    FeaturePerformanceItem,
    PricingInsight,
)
from models.analytics_event import AnalyticsEvent
from services.analytics_events import MonetizationEventType
from services.feature_flags import ensure_feature_catalog

DAYS_IN_TIME_SERIES = 14


def _safe_percent(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 2)


def _feature_expr():
    return func.coalesce(
        AnalyticsEvent.feature_key,
        AnalyticsEvent.metadata_json["feature_key"].astext,
        AnalyticsEvent.metadata_json["feature"].astext,
    )


def _is_confirmed_purchase_expr():
    return and_(
        AnalyticsEvent.event_type == MonetizationEventType.UPGRADE_SUCCESS.value,
        or_(
            AnalyticsEvent.metadata_json["provider"].astext.is_not(None),
            AnalyticsEvent.metadata_json["payment_id"].astext.is_not(None),
            AnalyticsEvent.metadata_json["session_id"].astext.is_not(None),
        ),
    )


def _pricing_insight(
    *,
    usage_count: int,
    lock_views: int,
    upgrade_clicks: int,
    purchases: int,
    conversion_rate: float,
) -> PricingInsight:
    if usage_count < 10 and upgrade_clicks < 3 and lock_views < 25:
        return PricingInsight(
            signal="keep_price",
            reason="Demand is still too low to justify a price move; improve feature visibility and value framing first.",
        )
    if lock_views >= 25 and purchases == 0 and upgrade_clicks >= 8:
        return PricingInsight(
            signal="reduce_price",
            reason="Strong interest but weak purchase follow-through suggests pricing or offer friction.",
        )
    if purchases >= 8 and conversion_rate >= 8.0:
        return PricingInsight(
            signal="raise_price",
            reason="High conversion with repeated purchases suggests the feature may sustain a higher price point.",
        )
    if usage_count >= 40 and conversion_rate < 3.0:
        return PricingInsight(
            signal="reduce_price",
            reason="Heavy usage with low monetization indicates conversion pressure is too high for demand.",
        )
    return PricingInsight(
        signal="keep_price",
        reason="Current usage and conversion levels do not justify a pricing change yet.",
    )


async def get_feature_funnel(
    db: AsyncSession,
    *,
    feature_key: str,
) -> FeatureFunnelResponse:
    normalized_feature_key = feature_key.strip().lower()
    feature_key_expr = _feature_expr()

    stmt = select(
        func.sum(
            case(
                (AnalyticsEvent.event_type == MonetizationEventType.PREMIUM_BLOCK_VIEW.value, 1),
                else_=0,
            )
        ).label("views"),
        func.sum(
            case(
                (AnalyticsEvent.event_type == MonetizationEventType.UPGRADE_CLICK.value, 1),
                else_=0,
            )
        ).label("clicks"),
        func.sum(
            case(
                (_is_confirmed_purchase_expr(), 1),
                else_=0,
            )
        ).label("purchases"),
    ).where(feature_key_expr == normalized_feature_key)

    row = (await db.execute(stmt)).mappings().one()
    views = int(row["views"] or 0)
    clicks = int(row["clicks"] or 0)
    purchases = int(row["purchases"] or 0)
    return FeatureFunnelResponse(
        views=views,
        clicks=clicks,
        purchases=purchases,
        conversion_rate=_safe_percent(purchases, views),
    )


async def get_feature_performance(
    db: AsyncSession,
) -> list[FeaturePerformanceItem]:
    features = await ensure_feature_catalog(db)
    feature_key_expr = _feature_expr()
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    stmt = (
        select(
            feature_key_expr.label("feature_key"),
            func.sum(
                case(
                    (AnalyticsEvent.event_type == MonetizationEventType.FEATURE_USED.value, 1),
                    else_=0,
                )
            ).label("usage_count"),
            func.sum(
                case(
                    (AnalyticsEvent.event_type == MonetizationEventType.PREMIUM_BLOCK_VIEW.value, 1),
                    else_=0,
                )
            ).label("lock_views"),
            func.sum(
                case(
                    (AnalyticsEvent.event_type == MonetizationEventType.UPGRADE_CLICK.value, 1),
                    else_=0,
                )
            ).label("upgrade_clicks"),
            func.sum(
                case(
                    (_is_confirmed_purchase_expr(), 1),
                    else_=0,
                )
            ).label("purchases"),
            func.sum(
                case(
                    (
                        and_(
                            AnalyticsEvent.event_type == MonetizationEventType.UPGRADE_CLICK.value,
                            AnalyticsEvent.created_at >= seven_days_ago,
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("last_7_days_clicks"),
        )
        .where(feature_key_expr.is_not(None))
        .group_by(feature_key_expr)
    )
    rows = (await db.execute(stmt)).mappings().all()
    metrics_by_feature = {
        str(row["feature_key"]): {
            "usage_count": int(row["usage_count"] or 0),
            "lock_views": int(row["lock_views"] or 0),
            "upgrade_clicks": int(row["upgrade_clicks"] or 0),
            "purchases": int(row["purchases"] or 0),
            "last_7_days_clicks": int(row["last_7_days_clicks"] or 0),
        }
        for row in rows
        if row["feature_key"]
    }

    items: list[FeaturePerformanceItem] = []
    for feature in sorted(features, key=lambda item: item.key):
        metrics = metrics_by_feature.get(
            feature.key,
            {
                "usage_count": 0,
                "lock_views": 0,
                "upgrade_clicks": 0,
                "purchases": 0,
                "last_7_days_clicks": 0,
            },
        )
        conversion_rate = _safe_percent(metrics["purchases"], metrics["lock_views"])
        items.append(
            FeaturePerformanceItem(
                feature_key=feature.key,
                feature_name=feature.name,
                usage_count=metrics["usage_count"],
                lock_views=metrics["lock_views"],
                upgrade_clicks=metrics["upgrade_clicks"],
                purchases=metrics["purchases"],
                last_7_days_clicks=metrics["last_7_days_clicks"],
                conversion_rate=conversion_rate,
                current_price=float(feature.current_price) if feature.current_price is not None else None,
                suggested_price_min=(
                    float(feature.suggested_price_min) if feature.suggested_price_min is not None else None
                ),
                suggested_price_max=(
                    float(feature.suggested_price_max) if feature.suggested_price_max is not None else None
                ),
                last_price_analysis_at=feature.last_price_analysis_at,
                pricing_insight=_pricing_insight(
                    usage_count=metrics["usage_count"],
                    lock_views=metrics["lock_views"],
                    upgrade_clicks=metrics["upgrade_clicks"],
                    purchases=metrics["purchases"],
                    conversion_rate=conversion_rate,
                ),
            )
        )

    return items


async def get_admin_monetization_summary(
    db: AsyncSession,
) -> AdminMonetizationSummary:
    feature_performance = await get_feature_performance(db)
    feature_key_expr = _feature_expr()
    time_series_start = datetime.now(timezone.utc) - timedelta(days=DAYS_IN_TIME_SERIES - 1)

    global_stmt = select(
        func.sum(
            case(
                (AnalyticsEvent.event_type == MonetizationEventType.PREMIUM_BLOCK_VIEW.value, 1),
                else_=0,
            )
        ).label("views"),
        func.sum(
            case(
                (AnalyticsEvent.event_type == MonetizationEventType.UPGRADE_CLICK.value, 1),
                else_=0,
            )
        ).label("clicks"),
        func.sum(
            case(
                (_is_confirmed_purchase_expr(), 1),
                else_=0,
            )
        ).label("purchases"),
    ).where(
        or_(
            feature_key_expr.is_not(None),
            _is_confirmed_purchase_expr(),
        )
    )
    global_row = (await db.execute(global_stmt)).mappings().one()

    views = int(global_row["views"] or 0)
    clicks = int(global_row["clicks"] or 0)
    purchases = int(global_row["purchases"] or 0)

    time_series_stmt = (
        select(
            func.date_trunc("day", AnalyticsEvent.created_at).label("bucket"),
            func.sum(
                case(
                    (AnalyticsEvent.event_type == MonetizationEventType.PREMIUM_BLOCK_VIEW.value, 1),
                    else_=0,
                )
            ).label("views"),
            func.sum(
                case(
                    (AnalyticsEvent.event_type == MonetizationEventType.UPGRADE_CLICK.value, 1),
                    else_=0,
                )
            ).label("clicks"),
            func.sum(
                case(
                    (_is_confirmed_purchase_expr(), 1),
                    else_=0,
                )
            ).label("purchases"),
        )
        .where(AnalyticsEvent.created_at >= time_series_start)
        .group_by(func.date_trunc("day", AnalyticsEvent.created_at))
        .order_by(func.date_trunc("day", AnalyticsEvent.created_at).asc())
    )
    time_series_rows = (await db.execute(time_series_stmt)).all()
    metrics_by_day = {
        row.bucket.date() if hasattr(row.bucket, "date") else row.bucket: {
            "views": int(row.views or 0),
            "clicks": int(row.clicks or 0),
            "purchases": int(row.purchases or 0),
        }
        for row in time_series_rows
    }

    daily_conversions: list[FeatureAnalyticsTimeSeriesPoint] = []
    start_date = time_series_start.date()
    for offset in range(DAYS_IN_TIME_SERIES):
        bucket = start_date + timedelta(days=offset)
        metrics = metrics_by_day.get(bucket, {"views": 0, "clicks": 0, "purchases": 0})
        daily_conversions.append(
            FeatureAnalyticsTimeSeriesPoint(
                date=bucket.isoformat(),
                views=metrics["views"],
                clicks=metrics["clicks"],
                purchases=metrics["purchases"],
            )
        )

    top_feature_item = max(
        feature_performance,
        key=lambda item: (item.conversion_rate, item.purchases, item.upgrade_clicks, item.usage_count),
        default=None,
    )

    return AdminMonetizationSummary(
        total_premium_conversions=purchases,
        overall_conversion_rate=_safe_percent(purchases, views),
        top_performing_feature=top_feature_item.feature_key if top_feature_item and top_feature_item.lock_views > 0 else None,
        drop_off_rate=_safe_percent(max(views - clicks, 0), views),
        funnel=FeatureFunnelResponse(
            views=views,
            clicks=clicks,
            purchases=purchases,
            conversion_rate=_safe_percent(purchases, views),
        ),
        daily_conversions=daily_conversions,
        feature_performance=feature_performance,
    )
