"""Experiment assignment and analytics tests."""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.analytics_event import AnalyticsEvent
from models.user import User
from models.user_experiment import UserExperiment
from services.experiments import ensure_default_experiment_exists


@pytest.mark.asyncio
async def test_experiment_assignment_is_stable(
    client: AsyncClient,
    normal_user,
    normal_user_token: str,
    db_session: AsyncSession,
):
    headers = {"Authorization": f"Bearer {normal_user_token}"}

    first_response = await client.get("/experiments", headers=headers)
    second_response = await client.get("/experiments", headers=headers)

    assert first_response.status_code == 200
    assert second_response.status_code == 200

    first_payload = first_response.json()
    second_payload = second_response.json()

    assert first_payload == second_payload
    assert first_payload["upgrade_button"] in {"A", "B"}

    result = await db_session.execute(
        select(UserExperiment).where(UserExperiment.user_id == normal_user.id)
    )
    assignments = list(result.scalars().all())
    assert len(assignments) == 1
    assert assignments[0].variant == first_payload["upgrade_button"]


@pytest.mark.asyncio
async def test_track_event_enriches_metadata_with_experiment_assignment(
    client: AsyncClient,
    normal_user,
    normal_user_token: str,
    db_session: AsyncSession,
):
    response = await client.post(
        "/analytics/track",
        json={
            "event": "premium_click",
            "metadata": {
                "source": "test_case",
            },
        },
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert response.status_code == 204

    result = await db_session.execute(
        select(AnalyticsEvent)
        .where(AnalyticsEvent.user_id == normal_user.id)
        .order_by(AnalyticsEvent.created_at.desc())
    )
    event = result.scalars().first()
    assert event is not None
    assert event.event_name == "premium_click"
    assert event.metadata_json["source"] == "test_case"
    assert event.metadata_json["experiment"] == "upgrade_button"
    assert event.metadata_json["variant"] in {"A", "B"}
    assert event.metadata_json["experiments"]["upgrade_button"] == event.metadata_json["variant"]


@pytest.mark.asyncio
async def test_admin_experiments_summary_is_backend_driven(
    client: AsyncClient,
    admin_user_token: str,
    db_session: AsyncSession,
):
    experiment = await ensure_default_experiment_exists(db_session)
    variant_a_user = User(
        email="variant-a@example.com",
        hashed_password="hashed",
        is_verified=True,
        is_active=True,
    )
    variant_b_user = User(
        email="variant-b@example.com",
        hashed_password="hashed",
        is_verified=True,
        is_active=True,
    )
    db_session.add_all([variant_a_user, variant_b_user])
    await db_session.flush()
    experiment.created_at = datetime(2026, 3, 20, tzinfo=timezone.utc)

    db_session.add_all(
        [
            UserExperiment(
                user_id=variant_b_user.id,
                experiment_id=experiment.id,
                variant="B",
                assigned_at=datetime(2026, 3, 20, tzinfo=timezone.utc),
            ),
            UserExperiment(
                user_id=variant_a_user.id,
                experiment_id=experiment.id,
                variant="A",
                assigned_at=datetime(2026, 3, 20, tzinfo=timezone.utc),
            ),
        ]
    )

    db_session.add_all(
        [
            AnalyticsEvent(
                user_id=variant_b_user.id,
                event_name="premium_click",
                metadata_json={"experiment": "upgrade_button", "variant": "B"},
                created_at=datetime.now(timezone.utc),
            ),
            AnalyticsEvent(
                event_name="premium_click",
                metadata_json={"source": "legacy_without_variant"},
                created_at=datetime.now(timezone.utc),
            ),
            AnalyticsEvent(
                event_name="premium_click",
                metadata_json={"experiment": "other_experiment", "variant": "A"},
                created_at=datetime.now(timezone.utc),
            ),
            AnalyticsEvent(
                event_name="premium_click",
                metadata_json={"experiment": "upgrade_button", "variant": "A"},
                created_at=datetime.now(timezone.utc),
            ),
            AnalyticsEvent(
                event_name="payment_success",
                metadata_json={"experiment": "upgrade_button", "variant": "A"},
                created_at=datetime.now(timezone.utc),
            ),
        ]
    )
    await db_session.commit()

    response = await client.get(
        "/admin/experiments",
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )

    expected_days_running = max(
        0,
        (datetime.now(timezone.utc) - datetime(2026, 3, 20, tzinfo=timezone.utc)).days,
    )

    assert response.status_code == 200
    assert response.json() == {
        "experiment": "upgrade_button",
        "winner": None,
        "confidence_level": "insufficient_data",
        "recommendation": "Har bir variant uchun kamida 100 foydalanuvchi to'plang.",
        "days_running": expected_days_running,
        "minimum_duration_met": True,
        "minimum_sample_met": False,
        "variant_A": {
            "assigned_users": 1,
            "clicks": 1,
            "payments": 1,
            "conversion_rate": 100.0,
        },
        "variant_B": {
            "assigned_users": 1,
            "clicks": 1,
            "payments": 0,
            "conversion_rate": 0.0,
        },
    }


@pytest.mark.asyncio
async def test_admin_experiments_summary_marks_winner_when_rules_are_met(
    client: AsyncClient,
    admin_user_token: str,
    db_session: AsyncSession,
):
    experiment = await ensure_default_experiment_exists(db_session)
    experiment.created_at = datetime(2026, 3, 20, tzinfo=timezone.utc)

    users_a = [
        User(
            email=f"winner-a-{index}@example.com",
            hashed_password="hashed",
            is_verified=True,
            is_active=True,
        )
        for index in range(120)
    ]
    users_b = [
        User(
            email=f"winner-b-{index}@example.com",
            hashed_password="hashed",
            is_verified=True,
            is_active=True,
        )
        for index in range(120)
    ]
    db_session.add_all([*users_a, *users_b])
    await db_session.flush()

    db_session.add_all(
        [
            *[
                UserExperiment(
                    user_id=user.id,
                    experiment_id=experiment.id,
                    variant="A",
                    assigned_at=datetime(2026, 3, 20, tzinfo=timezone.utc),
                )
                for user in users_a
            ],
            *[
                UserExperiment(
                    user_id=user.id,
                    experiment_id=experiment.id,
                    variant="B",
                    assigned_at=datetime(2026, 3, 20, tzinfo=timezone.utc),
                )
                for user in users_b
            ],
        ]
    )

    db_session.add_all(
        [
            *[
                AnalyticsEvent(
                    user_id=user.id,
                    event_name="payment_success",
                    metadata_json={"experiment": "upgrade_button", "variant": "A"},
                    created_at=datetime.now(timezone.utc),
                )
                for user in users_a[:12]
            ],
            *[
                AnalyticsEvent(
                    user_id=user.id,
                    event_name="payment_success",
                    metadata_json={"experiment": "upgrade_button", "variant": "B"},
                    created_at=datetime.now(timezone.utc),
                )
                for user in users_b[:26]
            ],
        ]
    )
    await db_session.commit()

    response = await client.get(
        "/admin/experiments",
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["winner"] == "B"
    assert payload["confidence_level"] == "medium"
    assert payload["minimum_duration_met"] is True
    assert payload["minimum_sample_met"] is True
    assert payload["variant_A"]["assigned_users"] == 120
    assert payload["variant_B"]["assigned_users"] == 120
    assert payload["variant_A"]["conversion_rate"] == 10.0
    assert payload["variant_B"]["conversion_rate"] == 21.7
    assert "B varianti yaxshiroq" in payload["recommendation"]
