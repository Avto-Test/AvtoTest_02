from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.analytics_event import AnalyticsEvent
from models.feature import Feature
from services.feature_flags import ensure_feature_catalog
from services.monetization_insights import generate_monetization_insights


@pytest.mark.asyncio
async def test_generate_monetization_insights_persists_lower_price_recommendation(
    db_session: AsyncSession,
):
    features = await ensure_feature_catalog(db_session)
    analytics_feature = next(feature for feature in features if feature.key == "analytics_view")
    analytics_feature.current_price = Decimal("10.00")
    now = datetime.now(timezone.utc)

    db_session.add_all(
        [
            *[
                AnalyticsEvent(
                    event_type="feature_used",
                    feature_key="analytics_view",
                    created_at=now - timedelta(minutes=index),
                    metadata_json={"source": "seeded_usage"},
                )
                for index in range(25)
            ],
            *[
                AnalyticsEvent(
                    event_type="premium_block_view",
                    feature_key="analytics_view",
                    created_at=now - timedelta(minutes=30 + index),
                    metadata_json={"source": "seeded_lock"},
                )
                for index in range(12)
            ],
            *[
                AnalyticsEvent(
                    event_type="upgrade_click",
                    feature_key="analytics_view",
                    created_at=now - timedelta(minutes=45 + index),
                    metadata_json={"source": "seeded_lock"},
                )
                for index in range(2)
            ],
        ]
    )
    await db_session.commit()

    insights = await generate_monetization_insights(db_session)
    analytics_insight = next(item for item in insights if item.feature == "analytics_view")

    assert analytics_insight.problem == "high_usage_low_conversion"
    assert analytics_insight.suggested_price_range.min == 5.5
    assert analytics_insight.suggested_price_range.max == 8.5

    refreshed_feature = (
        await db_session.execute(select(Feature).where(Feature.key == "analytics_view"))
    ).scalar_one()
    assert refreshed_feature.suggested_price_min == Decimal("5.50")
    assert refreshed_feature.suggested_price_max == Decimal("8.50")
    assert refreshed_feature.last_price_analysis_at is not None


@pytest.mark.asyncio
async def test_generate_monetization_insights_recommends_higher_range_for_high_conversion(
    db_session: AsyncSession,
):
    features = await ensure_feature_catalog(db_session)
    simulation_feature = next(feature for feature in features if feature.key == "simulation_run")
    simulation_feature.current_price = Decimal("10.00")
    now = datetime.now(timezone.utc)

    db_session.add_all(
        [
            *[
                AnalyticsEvent(
                    event_type="feature_used",
                    feature_key="simulation_run",
                    created_at=now - timedelta(minutes=index),
                    metadata_json={"source": "seeded_usage"},
                )
                for index in range(12)
            ],
            *[
                AnalyticsEvent(
                    event_type="premium_block_view",
                    feature_key="simulation_run",
                    created_at=now - timedelta(minutes=20 + index),
                    metadata_json={"source": "seeded_lock"},
                )
                for index in range(50)
            ],
            *[
                AnalyticsEvent(
                    event_type="upgrade_click",
                    feature_key="simulation_run",
                    created_at=now - timedelta(minutes=80 + index),
                    metadata_json={"source": "seeded_lock"},
                )
                for index in range(15)
            ],
            *[
                AnalyticsEvent(
                    event_type="upgrade_success",
                    feature_key="simulation_run",
                    created_at=now - timedelta(minutes=120 + index),
                    metadata_json={"provider": "promo", "payment_id": f"pay_{index}"},
                )
                for index in range(5)
            ],
        ]
    )
    await db_session.commit()

    insights = await generate_monetization_insights(db_session)
    simulation_insight = next(item for item in insights if item.feature == "simulation_run")

    assert simulation_insight.problem == "high_conversion"
    assert simulation_insight.suggested_price_range.min == 11.0
    assert simulation_insight.suggested_price_range.max == 13.5
