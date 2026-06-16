from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.analytics_event import AnalyticsEvent
from models.feature import Feature
from models.user import User


@pytest.mark.asyncio
async def test_features_catalog_is_public_and_seeded(client: AsyncClient):
    response = await client.get("/features")

    assert response.status_code == 200
    payload = response.json()
    keys = {item["key"] for item in payload}
    assert {"analytics_view", "ai_prediction", "simulation_run"} <= keys


@pytest.mark.asyncio
async def test_simulation_history_requires_feature_access(
    client: AsyncClient,
    normal_user: User,
    normal_user_token: str,
    db_session: AsyncSession,
):
    normal_user.created_at = datetime.now(timezone.utc) - timedelta(days=7)
    await db_session.commit()

    response = await client.get(
        "/simulation/history",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 403
    assert response.json() == {"error": "premium_required", "feature": "simulation_run"}


@pytest.mark.asyncio
async def test_new_user_gets_default_trial_segment_and_uses(
    client: AsyncClient,
    normal_user_token: str,
):
    response = await client.get(
        "/features",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 200
    simulation_feature = next(item for item in response.json() if item["key"] == "simulation_run")
    assert simulation_feature["has_access"] is True
    assert simulation_feature["access_reason"] == "trial_remaining"
    assert simulation_feature["remaining_trial_uses"] == 2
    assert simulation_feature["effective_trial_limit"] == 2
    assert simulation_feature["user_segment"] == "new_user"


@pytest.mark.asyncio
async def test_active_user_receives_aggressive_prompt_signal(
    client: AsyncClient,
    normal_user: User,
    normal_user_token: str,
    db_session: AsyncSession,
):
    normal_user.created_at = datetime.now(timezone.utc) - timedelta(days=10)
    db_session.add_all(
        [
            AnalyticsEvent(
                user_id=normal_user.id,
                event_type="feature_used",
                feature_key="analytics_view",
                metadata_json={"source": "seeded_usage"},
            )
            for _ in range(6)
        ]
    )
    await db_session.commit()

    response = await client.get(
        "/features",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 200
    analytics_feature = next(item for item in response.json() if item["key"] == "analytics_view")
    assert analytics_feature["has_access"] is False
    assert analytics_feature["user_segment"] == "active_user"
    assert analytics_feature["recommended_prompt_intensity"] == "aggressive"


@pytest.mark.asyncio
async def test_admin_can_temporarily_open_feature_for_everyone(
    client: AsyncClient,
    admin_user_token: str,
    normal_user_token: str,
    db_session: AsyncSession,
):
    await client.get("/features")

    result = await db_session.execute(
        select(Feature).where(Feature.key == "simulation_run")
    )
    feature = result.scalar_one()
    enabled_until = datetime.now(timezone.utc) + timedelta(days=2)

    update_response = await client.patch(
        f"/features/{feature.id}",
        json={"enabled_for_all_until": enabled_until.isoformat()},
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["enabled_for_all_until"] is not None

    simulation_response = await client.get(
        "/simulation/history",
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert simulation_response.status_code == 200
    assert simulation_response.json() == {"items": []}
