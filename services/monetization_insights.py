"""Human-readable monetization insights and manual price recommendations."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.ext.asyncio import AsyncSession

from api.analytics.schemas import MonetizationInsightItem, SuggestedPriceRange
from services.feature_flags import ensure_feature_catalog
from services.monetization_analytics import get_feature_performance

DEFAULT_PRICE_BASELINE = Decimal("10.00")
PRICE_QUANTIZER = Decimal("0.01")


def _quantize(value: Decimal) -> Decimal:
    return value.quantize(PRICE_QUANTIZER, rounding=ROUND_HALF_UP)


def _resolve_current_price(value) -> Decimal:
    if value is None:
        return DEFAULT_PRICE_BASELINE

    current_price = value if isinstance(value, Decimal) else Decimal(str(value))
    if current_price <= 0:
        return DEFAULT_PRICE_BASELINE
    return _quantize(current_price)


def _suggested_range(current_price: Decimal, *, low_multiplier: Decimal, high_multiplier: Decimal) -> SuggestedPriceRange:
    minimum = _quantize(max(Decimal("1.00"), current_price * low_multiplier))
    maximum = _quantize(max(minimum, current_price * high_multiplier))
    return SuggestedPriceRange(min=float(minimum), max=float(maximum))


def _build_insight(
    *,
    feature_key: str,
    feature_name: str,
    current_price: Decimal,
    usage_count: int,
    lock_views: int,
    upgrade_clicks: int,
    purchases: int,
    conversion_rate: float,
    analyzed_at: datetime,
) -> MonetizationInsightItem:
    if usage_count >= 20 and conversion_rate < 3.0:
        return MonetizationInsightItem(
            feature=feature_key,
            feature_name=feature_name,
            problem="high_usage_low_conversion",
            message="Users interact with this feature often, but upgrades are not following.",
            recommendation="Consider lowering the manual price range or improving the paywall value explanation.",
            current_price=float(current_price),
            suggested_price_range=_suggested_range(
                current_price,
                low_multiplier=Decimal("0.55"),
                high_multiplier=Decimal("0.85"),
            ),
            last_price_analysis_at=analyzed_at,
        )

    if usage_count < 10 and upgrade_clicks < 3 and lock_views < 25:
        return MonetizationInsightItem(
            feature=feature_key,
            feature_name=feature_name,
            problem="low_usage_low_clicks",
            message="This feature is not getting enough user attention or upgrade intent yet.",
            recommendation="Keep pricing manual and focus on better placement, previews, and clearer value messaging.",
            current_price=float(current_price),
            suggested_price_range=_suggested_range(
                current_price,
                low_multiplier=Decimal("0.90"),
                high_multiplier=Decimal("1.00"),
            ),
            last_price_analysis_at=analyzed_at,
        )

    if purchases >= 5 and conversion_rate >= 8.0:
        return MonetizationInsightItem(
            feature=feature_key,
            feature_name=feature_name,
            problem="high_conversion",
            message="Users reaching this paywall are converting well.",
            recommendation="Test a higher manual price point or stronger packaging, but do not auto-apply any increase.",
            current_price=float(current_price),
            suggested_price_range=_suggested_range(
                current_price,
                low_multiplier=Decimal("1.10"),
                high_multiplier=Decimal("1.35"),
            ),
            last_price_analysis_at=analyzed_at,
        )

    return MonetizationInsightItem(
        feature=feature_key,
        feature_name=feature_name,
        problem="stable_signal",
        message="Usage and conversion are within a normal range for now.",
        recommendation="Keep the current price manually and gather more demand data before changing anything.",
        current_price=float(current_price),
        suggested_price_range=_suggested_range(
            current_price,
            low_multiplier=Decimal("0.95"),
            high_multiplier=Decimal("1.05"),
        ),
        last_price_analysis_at=analyzed_at,
    )


async def generate_monetization_insights(
    db: AsyncSession,
) -> list[MonetizationInsightItem]:
    features = await ensure_feature_catalog(db)
    performance_items = await get_feature_performance(db)
    performance_by_key = {item.feature_key: item for item in performance_items}
    analyzed_at = datetime.now(timezone.utc)

    insights: list[MonetizationInsightItem] = []
    dirty = False

    for feature in sorted(features, key=lambda item: item.key):
        performance = performance_by_key.get(feature.key)
        if performance is None:
            continue

        current_price = _resolve_current_price(feature.current_price)
        insight = _build_insight(
            feature_key=feature.key,
            feature_name=feature.name,
            current_price=current_price,
            usage_count=performance.usage_count,
            lock_views=performance.lock_views,
            upgrade_clicks=performance.upgrade_clicks,
            purchases=performance.purchases,
            conversion_rate=performance.conversion_rate,
            analyzed_at=analyzed_at,
        )
        insights.append(insight)

        suggested_min = Decimal(str(insight.suggested_price_range.min))
        suggested_max = Decimal(str(insight.suggested_price_range.max))
        if (
            feature.suggested_price_min != suggested_min
            or feature.suggested_price_max != suggested_max
            or feature.last_price_analysis_at != analyzed_at
        ):
            feature.suggested_price_min = suggested_min
            feature.suggested_price_max = suggested_max
            feature.last_price_analysis_at = analyzed_at
            dirty = True

    if dirty:
        await db.commit()

    return insights
