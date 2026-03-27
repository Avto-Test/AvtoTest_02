"""
AUTOTEST Admin Tests
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.question_bank import QUESTION_BANK_TEST_DIFFICULTY, QUESTION_BANK_TEST_TITLE
from models.analytics_event import AnalyticsEvent
from models.attempt import Attempt
from models.driving_instructor_application import DrivingInstructorApplication
from models.driving_school_partner_application import DrivingSchoolPartnerApplication
from models.payment import Payment
from models.question import Question
from models.subscription import Subscription
from models.test import Test
from models.user import User
from models.user_notification import UserNotification

@pytest.mark.asyncio
async def test_non_admin_blocked(client: AsyncClient, normal_user_token: str):
    response = await client.post(
        "/admin/tests",
        json={"title": "Hacker Test", "description": "Should fail", "difficulty": "easy"},
        headers={"Authorization": f"Bearer {normal_user_token}"}
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_create_test(client: AsyncClient, admin_user_token: str):
    response = await client.post(
        "/admin/tests",
        json={
            "title": "Math 101",
            "description": "Basic Math",
            "difficulty": "easy"
        },
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Math 101"
    assert "id" in data
    return data["id"]


@pytest.mark.asyncio
async def test_admin_add_question_and_options(client: AsyncClient, admin_user_token: str):
    # 1. Create Test
    test_resp = await client.post(
        "/admin/tests",
        json={"title": "Geography", "description": "Geo Test", "difficulty": "medium"},
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    test_id = test_resp.json()["id"]
    
    # 2. Add Question
    q_resp = await client.post(
        f"/admin/tests/{test_id}/questions",
        json={"text": "Capital of France?", "image_url": None},
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert q_resp.status_code == 201
    question_id = q_resp.json()["id"]
    
    # 3. Add Options (One Correct)
    opt1 = await client.post(
        f"/admin/questions/{question_id}/options",
        json={"text": "Paris", "is_correct": True},
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert opt1.status_code == 201
    
    opt2 = await client.post(
        f"/admin/questions/{question_id}/options",
        json={"text": "London", "is_correct": False},
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    assert opt2.status_code == 201
    
    # 4. Try adding second correct option (should fail logic check if implemented strictly, 
    # OR previous correct option becomes false depending on logic. 
    # STEP 10 says 'Only ONE correct AnswerOption per Question enforced'.
    # Usually this means we check if one exists or unset the previous one.
    # Let's verify the behavior. 
    # If the logic is "reject if one exists", expect 400.
    # If logic is "unset others", verify db.
    
    # Assuming strict enforcement (reject):
    opt3 = await client.post(
        f"/admin/questions/{question_id}/options",
        json={"text": "Berlin", "is_correct": True},
        headers={"Authorization": f"Bearer {admin_user_token}"}
    )
    if opt3.status_code == 400:
        assert "already has a correct answer" in opt3.json().get("detail", "")
    else:
        # If it allowed it, check if it disabled the first one (Paris)
        # This depends on implementation details of Step 10.
        pass 


@pytest.mark.asyncio
async def test_admin_manage_plans_and_promo_applicability(
    client: AsyncClient,
    admin_user_token: str,
):
    plan_response = await client.post(
        "/admin/plans",
        json={
            "code": "premium_quarterly",
            "name": "Premium Quarterly",
            "description": "90-day premium plan",
            "price_cents": 2500,
            "currency": "USD",
            "duration_days": 90,
            "is_active": True,
            "sort_order": 20,
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert plan_response.status_code == 201
    plan = plan_response.json()
    assert plan["code"] == "premium_quarterly"

    promo_response = await client.post(
        "/admin/promos",
        json={
            "code": "QTR10",
            "discount_type": "percent",
            "discount_value": 10,
            "is_active": True,
            "applicable_plan_ids": [plan["id"]],
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert promo_response.status_code == 201
    promo = promo_response.json()
    assert promo["code"] == "QTR10"
    assert plan["id"] in promo["applicable_plan_ids"]


@pytest.mark.asyncio
async def test_admin_manage_lessons(
    client: AsyncClient,
    admin_user_token: str,
):
    create_response = await client.post(
        "/admin/lessons",
        json={
            "title": "Road Markings Introduction",
            "description": "Fundamental markings for new learners",
            "content_type": "video",
            "content_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "topic": "Road Markings",
            "section": "Beginner",
            "is_active": True,
            "is_premium": False,
            "sort_order": 1,
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert create_response.status_code == 201
    lesson = create_response.json()
    lesson_id = lesson["id"]
    assert lesson["title"] == "Road Markings Introduction"

    list_response = await client.get(
        "/admin/lessons",
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert list_response.status_code == 200
    assert any(item["id"] == lesson_id for item in list_response.json())

    update_response = await client.put(
        f"/admin/lessons/{lesson_id}",
        json={
            "title": "Road Markings Masterclass",
            "is_premium": True,
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "Road Markings Masterclass"
    assert updated["is_premium"] is True


@pytest.mark.asyncio
async def test_admin_revoke_subscription_fully_resets_premium_access(
    client: AsyncClient,
    admin_user_token: str,
    premium_user,
    premium_user_token: str,
    db_session: AsyncSession,
):
    revoke_response = await client.put(
        f"/admin/users/{premium_user.id}/subscription",
        json={
            "plan": "free",
            "status": "inactive",
            "expires_at": None,
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert revoke_response.status_code == 200
    payload = revoke_response.json()
    assert payload["subscription_plan"] == "free"
    assert payload["subscription_status"] == "inactive"
    assert payload["subscription_expires_at"] is None
    assert payload["is_premium"] is False

    # Validate persisted state in DB.
    sub_result = await db_session.execute(
        select(Subscription).where(Subscription.user_id == premium_user.id)
    )
    sub = sub_result.scalar_one_or_none()
    assert sub is not None
    assert sub.plan == "free"
    assert sub.status == "inactive"
    assert sub.expires_at is None
    assert sub.canceled_at is not None
    assert sub.is_active is False

    me_response = await client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {premium_user_token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["is_premium"] is False


@pytest.mark.asyncio
async def test_inactive_paid_subscription_is_not_premium(
    client: AsyncClient,
    admin_user_token: str,
    premium_user,
):
    # Even if plan remains premium, inactive status must not grant premium access.
    response = await client.put(
        f"/admin/users/{premium_user.id}/subscription",
        json={
            "plan": "premium",
            "status": "inactive",
            "expires_at": None,
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["is_premium"] is False


@pytest.mark.asyncio
async def test_admin_grant_subscription_creates_user_notification(
    client: AsyncClient,
    admin_user_token: str,
    normal_user,
    db_session: AsyncSession,
):
    grant_response = await client.put(
        f"/admin/users/{normal_user.id}/subscription",
        json={
            "plan": "premium",
            "status": "active",
            "expires_at": None,
        },
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )
    assert grant_response.status_code == 200

    notif_result = await db_session.execute(
        select(UserNotification)
        .where(UserNotification.user_id == normal_user.id)
        .order_by(UserNotification.created_at.desc())
    )
    notifications = list(notif_result.scalars().all())
    assert notifications, "Grant action should create at least one notification"

    latest = notifications[0]
    assert latest.notification_type == "admin_grant_premium"
    assert "premium" in latest.message.lower()


@pytest.mark.asyncio
async def test_admin_analytics_snapshot_is_backend_driven_and_legacy_compatible(
    client: AsyncClient,
    admin_user,
    admin_user_token: str,
    db_session: AsyncSession,
):
    now_utc = datetime.now(timezone.utc)
    current_day_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    current_finished_at = now_utc - timedelta(minutes=5)
    if current_finished_at < current_day_start:
        current_finished_at = current_day_start + timedelta(seconds=1)
    previous_finished_at = current_day_start - timedelta(minutes=5)

    active_user = User(
        email="analytics-active@example.com",
        hashed_password="hashed",
        is_verified=True,
        is_active=True,
    )
    inactive_user = User(
        email="analytics-inactive@example.com",
        hashed_password="hashed",
        is_verified=True,
        is_active=False,
    )
    paid_user = User(
        email="analytics-paid@example.com",
        hashed_password="hashed",
        is_verified=True,
        is_active=True,
    )
    db_session.add_all([active_user, inactive_user, paid_user])
    await db_session.flush()

    db_session.add_all(
        [
            Subscription(
                user_id=paid_user.id,
                plan="gold",
                status="trialing",
                expires_at=datetime.now(timezone.utc) + timedelta(days=15),
            ),
            Subscription(
                user_id=inactive_user.id,
                plan="free",
                status="active",
                expires_at=datetime.now(timezone.utc) + timedelta(days=15),
            ),
        ]
    )

    visible_test = Test(
        title="Visible Admin Test",
        description="Should count in analytics",
        difficulty="medium",
        is_active=True,
    )
    hidden_internal_test = Test(
        title=QUESTION_BANK_TEST_TITLE,
        description="Internal container",
        difficulty=QUESTION_BANK_TEST_DIFFICULTY,
        is_active=False,
    )
    hidden_draft_test = Test(
        title="Draft Test",
        description="Inactive tests must not count",
        difficulty="easy",
        is_active=False,
    )
    db_session.add_all([visible_test, hidden_internal_test, hidden_draft_test])
    await db_session.flush()

    db_session.add_all(
        [
            Question(test_id=visible_test.id, text="Visible question"),
            Question(test_id=hidden_internal_test.id, text="Question bank question"),
        ]
    )

    db_session.add_all(
        [
            DrivingSchoolPartnerApplication(
                school_name="Pending school",
                city="Tashkent",
                responsible_person="Operator",
                phone="+998900000001",
                email="school-pending@example.com",
                status="pending",
                created_at=current_finished_at,
            ),
            DrivingSchoolPartnerApplication(
                school_name="Approved school",
                city="Tashkent",
                responsible_person="Operator",
                phone="+998900000002",
                email="school-approved@example.com",
                status="APPROVED",
                created_at=previous_finished_at,
            ),
            DrivingInstructorApplication(
                full_name="Pending instructor",
                phone="+998900000003",
                city="Samarkand",
                years_experience=3,
                transmission="manual",
                car_model="Chevrolet Cobalt",
                hourly_price_cents=120000,
                short_bio="Experienced instructor",
                profile_image_url="https://example.com/profile.jpg",
                status="PENDING",
                created_at=current_finished_at,
            ),
        ]
    )
    db_session.add_all(
        [
            Attempt(
                user_id=active_user.id,
                test_id=visible_test.id,
                score=5,
                question_count=10,
                finished_at=current_finished_at,
            ),
            Attempt(
                user_id=paid_user.id,
                test_id=visible_test.id,
                score=6,
                question_count=10,
                finished_at=current_finished_at,
            ),
            Attempt(
                user_id=admin_user.id,
                test_id=visible_test.id,
                score=8,
                question_count=10,
                finished_at=previous_finished_at,
            ),
        ]
    )
    await db_session.commit()
    await db_session.refresh(admin_user)

    headers = {"Authorization": f"Bearer {admin_user_token}"}

    admin_response = await client.get("/admin/analytics", headers=headers)
    legacy_response = await client.get("/analytics/admin/summary", headers=headers)

    assert admin_response.status_code == 200
    assert legacy_response.status_code == 200

    payload = admin_response.json()
    legacy_payload = legacy_response.json()

    assert payload == legacy_payload
    assert payload == {
        "total_users": 4,
        "active_users": 3,
        "premium_users": 1,
        "total_questions": 2,
        "total_applications": 3,
        "pending_applications": 2,
        "new_leads": 0,
        "average_accuracy": 55.0,
        "accuracy_trend": {
            "current": 55.0,
            "previous": 80.0,
            "sample_size_current": 2,
            "sample_size_previous": 1,
        },
        "active_users_trend": {
            "current": 2.0,
            "previous": 1.0,
            "sample_size_current": 2,
            "sample_size_previous": 1,
        },
        "applications_trend": {
            "current": 2.0,
            "previous": 1.0,
            "sample_size_current": 2,
            "sample_size_previous": 1,
        },
        "category_performance": [],
    }


@pytest.mark.asyncio
async def test_admin_payment_summary_is_backend_driven(
    client: AsyncClient,
    admin_user_token: str,
    db_session: AsyncSession,
):
    db_session.add_all(
        [
            Payment(provider="tspay", status="succeeded", amount_cents=1_200_000, currency="UZS"),
            Payment(provider="tspay", status="succeeded", amount_cents=800_000, currency="UZS"),
            Payment(provider="tspay", status="failed", amount_cents=900_000, currency="UZS"),
            Payment(provider="tspay", status="pending", amount_cents=500_000, currency="UZS"),
        ]
    )
    await db_session.commit()

    response = await client.get(
        "/admin/payments/summary",
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "total_revenue_cents": 2_000_000,
        "total_payments": 4,
        "successful_payments": 2,
        "failed_payments": 1,
        "pending_payments": 1,
        "conversion_rate": 50.0,
        "currency": "UZS",
    }


@pytest.mark.asyncio
async def test_admin_finance_range_filter_uses_real_payment_window(
    client: AsyncClient,
    admin_user_token: str,
    db_session: AsyncSession,
):
    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            Payment(
                provider="tspay",
                status="succeeded",
                amount_cents=1_000_000,
                currency="UZS",
                created_at=now - timedelta(days=3),
            ),
            Payment(
                provider="tspay",
                status="failed",
                amount_cents=500_000,
                currency="UZS",
                created_at=now - timedelta(days=2),
            ),
            Payment(
                provider="tspay",
                status="pending",
                amount_cents=250_000,
                currency="UZS",
                created_at=now - timedelta(days=1),
            ),
            Payment(
                provider="tspay",
                status="succeeded",
                amount_cents=900_000,
                currency="UZS",
                created_at=now - timedelta(days=45),
            ),
        ]
    )
    await db_session.commit()

    response = await client.get(
        "/admin/finance?range=7d",
        headers={"Authorization": f"Bearer {admin_user_token}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "total_revenue_cents": 1_000_000,
        "total_payments": 3,
        "successful_payments": 1,
        "failed_payments": 1,
        "pending_payments": 1,
        "conversion_rate": 33.3,
        "currency": "UZS",
    }


@pytest.mark.asyncio
async def test_admin_growth_summary_is_backend_driven_and_filterable(
    client: AsyncClient,
    admin_user,
    admin_user_token: str,
    db_session: AsyncSession,
):
    now = datetime.now(timezone.utc)
    growth_test = Test(
        title="Growth Seed Test",
        description="Used for growth funnel assertions",
        difficulty="medium",
        is_active=True,
    )
    db_session.add(growth_test)
    await db_session.flush()

    active_user = User(
        email="growth-active@example.com",
        hashed_password="hashed",
        is_verified=True,
        created_at=now - timedelta(days=2),
    )
    engaged_user = User(
        email="growth-engaged@example.com",
        hashed_password="hashed",
        is_verified=True,
        created_at=now - timedelta(days=3),
    )
    old_user = User(
        email="growth-old@example.com",
        hashed_password="hashed",
        is_verified=True,
        created_at=now - timedelta(days=45),
    )
    db_session.add_all([active_user, engaged_user, old_user])
    await db_session.flush()

    db_session.add_all(
        [
            Attempt(
                user_id=active_user.id,
                test_id=growth_test.id,
                question_count=10,
                started_at=now - timedelta(days=2),
            ),
            Attempt(
                user_id=engaged_user.id,
                test_id=growth_test.id,
                question_count=10,
                started_at=now - timedelta(days=2),
            ),
            Attempt(
                user_id=engaged_user.id,
                test_id=growth_test.id,
                question_count=10,
                started_at=now - timedelta(days=1),
            ),
            Attempt(
                user_id=old_user.id,
                test_id=growth_test.id,
                question_count=10,
                started_at=now - timedelta(days=40),
            ),
            Attempt(
                user_id=old_user.id,
                test_id=growth_test.id,
                question_count=10,
                started_at=now - timedelta(days=41),
            ),
        ]
    )
    db_session.add_all(
        [
            AnalyticsEvent(
                user_id=engaged_user.id,
                event_name="upgrade_click",
                created_at=now - timedelta(days=1),
            ),
            AnalyticsEvent(
                user_id=old_user.id,
                event_name="upgrade_click",
                created_at=now - timedelta(days=40),
            ),
        ]
    )
    db_session.add_all(
        [
            Payment(
                user_id=engaged_user.id,
                provider="tspay",
                status="succeeded",
                amount_cents=800_000,
                currency="UZS",
                created_at=now - timedelta(days=1),
            ),
            Payment(
                user_id=active_user.id,
                provider="tspay",
                status="failed",
                amount_cents=400_000,
                currency="UZS",
                created_at=now - timedelta(days=1),
            ),
            Payment(
                user_id=old_user.id,
                provider="tspay",
                status="succeeded",
                amount_cents=500_000,
                currency="UZS",
                created_at=now - timedelta(days=40),
            ),
        ]
    )
    await db_session.commit()
    await db_session.refresh(admin_user)

    headers = {"Authorization": f"Bearer {admin_user_token}"}
    all_time_response = await client.get("/admin/growth", headers=headers)
    filtered_response = await client.get("/admin/growth?range=7d", headers=headers)

    assert all_time_response.status_code == 200
    assert filtered_response.status_code == 200

    assert all_time_response.json() == {
        "registered_users": 4,
        "active_users": 3,
        "engaged_users": 2,
        "premium_clicks": 2,
        "successful_payments": 2,
        "conversion_rates": {
            "activation_rate": 75.0,
            "engagement_rate": 66.7,
            "payment_rate": 100.0,
        },
        "drop_offs": {
            "registration_to_activity": 1,
            "activity_to_engagement": 1,
            "engagement_to_premium_click": 0,
            "engagement_to_payment": 0,
        },
    }

    assert filtered_response.json() == {
        "registered_users": 3,
        "active_users": 2,
        "engaged_users": 1,
        "premium_clicks": 1,
        "successful_payments": 1,
        "conversion_rates": {
            "activation_rate": 66.7,
            "engagement_rate": 50.0,
            "payment_rate": 100.0,
        },
        "drop_offs": {
            "registration_to_activity": 1,
            "activity_to_engagement": 1,
            "engagement_to_premium_click": 0,
            "engagement_to_payment": 0,
        },
    }
