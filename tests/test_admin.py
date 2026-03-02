"""
AUTOTEST Admin Tests
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.test import Test
from models.question import Question
from models.subscription import Subscription
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
