from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.analytics_event import AnalyticsEvent
from models.feature import Feature


@pytest.mark.asyncio
async def test_track_event_accepts_strict_monetization_contract_for_anonymous_users(
    client: AsyncClient,
    db_session: AsyncSession,
):
    response = await client.post(
        "/analytics/track",
        json={
            "event_type": "upgrade_click",
            "feature_key": "analytics_view",
            "metadata": {
                "source": "analytics_page",
            },
        },
    )

    assert response.status_code == 204

    result = await db_session.execute(select(AnalyticsEvent).order_by(AnalyticsEvent.created_at.desc()))
    event = result.scalars().first()
    assert event is not None
    assert event.event_type == "upgrade_click"
    assert event.feature_key == "analytics_view"
    assert event.user_id is None
    assert event.metadata_json["source"] == "analytics_page"


@pytest.mark.asyncio
async def test_admin_feature_funnel_and_performance_are_feature_scoped(
    client: AsyncClient,
    admin_user_token: str,
    db_session: AsyncSession,
):
    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            AnalyticsEvent(
                event_type="premium_block_view",
                feature_key="analytics_view",
                created_at=now - timedelta(hours=3),
                metadata_json={"source": "analytics_lock"},
            ),
            AnalyticsEvent(
                event_type="premium_block_view",
                feature_key="analytics_view",
                created_at=now - timedelta(hours=2),
                metadata_json={"source": "analytics_lock"},
            ),
            AnalyticsEvent(
                event_type="upgrade_click",
                feature_key="analytics_view",
                created_at=now - timedelta(hours=2),
                metadata_json={"source": "analytics_lock"},
            ),
            AnalyticsEvent(
                event_type="feature_used",
                feature_key="analytics_view",
                created_at=now - timedelta(hours=1),
                metadata_json={"source": "feature_access_dependency"},
            ),
            AnalyticsEvent(
                event_type="feature_used",
                feature_key="analytics_view",
                created_at=now - timedelta(minutes=45),
                metadata_json={"source": "feature_access_dependency"},
            ),
            AnalyticsEvent(
                event_type="feature_used",
                feature_key="analytics_view",
                created_at=now - timedelta(minutes=15),
                metadata_json={"source": "feature_access_dependency"},
            ),
            AnalyticsEvent(
                event_type="upgrade_success",
                feature_key="analytics_view",
                created_at=now - timedelta(minutes=10),
                metadata_json={"provider": "promo", "payment_id": "pay_analytics_1"},
            ),
            AnalyticsEvent(
                event_type="upgrade_click",
                feature_key="simulation_run",
                created_at=now - timedelta(hours=1),
                metadata_json={"source": "simulation_lock"},
            ),
        ]
    )
    await db_session.commit()

    headers = {"Authorization": f"Bearer {admin_user_token}"}
    funnel_response = await client.get("/analytics/funnel?feature=analytics_view", headers=headers)
    features_response = await client.get("/analytics/features", headers=headers)

    assert funnel_response.status_code == 200
    assert funnel_response.json() == {
        "views": 2,
        "clicks": 1,
        "purchases": 1,
        "conversion_rate": 50.0,
    }

    assert features_response.status_code == 200
    analytics_feature = next(item for item in features_response.json() if item["feature_key"] == "analytics_view")
    assert analytics_feature["usage_count"] == 3
    assert analytics_feature["lock_views"] == 2
    assert analytics_feature["upgrade_clicks"] == 1
    assert analytics_feature["purchases"] == 1
    assert analytics_feature["last_7_days_clicks"] == 1
    assert analytics_feature["conversion_rate"] == 50.0


@pytest.mark.asyncio
async def test_feature_list_returns_trial_limit_snapshot_for_authenticated_user(
    client: AsyncClient,
    normal_user,
    normal_user_token: str,
    db_session: AsyncSession,
):
    await client.get("/features")

    result = await db_session.execute(select(Feature).where(Feature.key == "simulation_run"))
    feature = result.scalar_one()
    feature.feature_usage_limit = 2
    feature.rollout_percentage = 0
    feature.enabled_for_all_until = None
    db_session.add(
        AnalyticsEvent(
            user_id=normal_user.id,
            event_type="feature_used",
            feature_key="simulation_run",
            metadata_json={"source": "seeded_usage"},
            created_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        )
    )
    await db_session.commit()

    response = await client.get(
        "/features",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 200
    simulation_feature = next(item for item in response.json() if item["key"] == "simulation_run")
    assert simulation_feature["has_access"] is True
    assert simulation_feature["access_reason"] == "trial_remaining"
    assert simulation_feature["remaining_trial_uses"] == 1
    assert simulation_feature["trial_usage_count"] == 1


@pytest.mark.asyncio
async def test_admin_insights_endpoint_returns_feature_recommendations(
    client: AsyncClient,
    admin_user_token: str,
):
    response = await client.get(
        "/analytics/insights",
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 3
    analytics_insight = next(item for item in payload if item["feature"] == "analytics_view")
    assert "message" in analytics_insight
    assert "recommendation" in analytics_insight
    assert set(analytics_insight["suggested_price_range"]) == {"min", "max"}
