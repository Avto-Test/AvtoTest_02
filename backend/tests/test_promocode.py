"""
AUTOTEST Promocode Linking Tests
"""

from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.rbac import STUDENT_ROLE
from models.driving_school import DrivingSchool
from models.promo_code import PromoCode
from models.promo_redemption import PromoRedemption
from models.role import Role
from models.school_membership import SchoolMembership
from models.subscription_plan import SubscriptionPlan
from services.payments.types import utc_now


async def _seed_student_role(db_session: AsyncSession) -> Role:
    result = await db_session.execute(select(Role).where(Role.name == STUDENT_ROLE))
    role = result.scalar_one_or_none()
    if role is None:
        role = Role(name=STUDENT_ROLE, description="Standard student role")
        db_session.add(role)
        await db_session.commit()
        await db_session.refresh(role)
    return role


@pytest.mark.asyncio
async def test_apply_valid_promocode_returns_discount_and_reserves_usage(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user,
    normal_user_token: str,
):
    promo = PromoCode(
        code="ABC123",
        discount_type="percent",
        discount_value=20,
        is_active=True,
        max_uses=5,
    )
    db_session.add(promo)
    await db_session.commit()

    response = await client.post(
        "/api/promocode/apply",
        json={"code": "ABC123"},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "success": True,
        "discount_percent": 20,
        "school_linked": False,
        "group_assigned": False,
    }

    refreshed_promo = await db_session.get(PromoCode, promo.id)
    assert refreshed_promo is not None
    assert refreshed_promo.current_uses == 1

    redemption_result = await db_session.execute(
        select(PromoRedemption).where(
            PromoRedemption.promo_code_id == promo.id,
            PromoRedemption.user_id == normal_user.id,
        )
    )
    redemption = redemption_result.scalar_one_or_none()
    assert redemption is not None
    assert redemption.payment_id is None


@pytest.mark.asyncio
async def test_apply_expired_promocode_returns_standardized_error(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user_token: str,
):
    promo = PromoCode(
        code="OLD123",
        discount_type="percent",
        discount_value=15,
        is_active=True,
        expires_at=utc_now() - timedelta(minutes=1),
    )
    db_session.add(promo)
    await db_session.commit()

    response = await client.post(
        "/api/promocode/apply",
        json={"code": "OLD123"},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["error_code"] == "PROMOCODE_INVALID"
    assert payload["message"] == "Promocode has expired"
    assert isinstance(payload["request_id"], str)
    assert payload["request_id"]


@pytest.mark.asyncio
async def test_apply_promocode_rejects_when_max_usage_reached(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user_token: str,
):
    promo = PromoCode(
        code="FULL123",
        discount_type="percent",
        discount_value=10,
        is_active=True,
        max_uses=1,
        current_uses=1,
    )
    db_session.add(promo)
    await db_session.commit()

    response = await client.post(
        "/api/promocode/apply",
        json={"code": "FULL123"},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["error_code"] == "PROMOCODE_INVALID"
    assert payload["message"] == "Promocode usage limit reached"


@pytest.mark.asyncio
async def test_apply_promocode_links_user_to_school_as_student(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user,
    normal_user_token: str,
):
    student_role = await _seed_student_role(db_session)
    school = DrivingSchool(
        slug="promo-school",
        name="Promo School",
        city="Tashkent",
        phone="+998900000001",
        referral_code="PROMOSCHOOL",
        is_active=True,
    )
    db_session.add(school)
    await db_session.flush()

    promo = PromoCode(
        code="SCHOOL1",
        discount_type="percent",
        discount_value=0,
        school_id=school.id,
        is_active=True,
        max_uses=10,
    )
    db_session.add(promo)
    await db_session.commit()

    response = await client.post(
        "/api/promocode/apply",
        json={"code": "SCHOOL1"},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["school_linked"] is True
    assert payload["group_assigned"] is False
    assert payload["discount_percent"] is None

    membership_result = await db_session.execute(
        select(SchoolMembership).where(
            SchoolMembership.user_id == normal_user.id,
            SchoolMembership.school_id == school.id,
        )
    )
    membership = membership_result.scalar_one_or_none()
    assert membership is not None
    assert membership.role_id == student_role.id
    assert membership.group_id is None


@pytest.mark.asyncio
async def test_apply_promocode_assigns_group_when_present(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user,
    normal_user_token: str,
):
    await _seed_student_role(db_session)
    school = DrivingSchool(
        slug="promo-school-group",
        name="Promo School Group",
        city="Samarkand",
        phone="+998900000002",
        referral_code="PROMOGROUP",
        is_active=True,
    )
    db_session.add(school)
    await db_session.flush()

    group_id = uuid.uuid4()
    promo = PromoCode(
        code="GROUP1",
        discount_type="percent",
        discount_value=5,
        school_id=school.id,
        group_id=group_id,
        is_active=True,
        max_uses=10,
    )
    db_session.add(promo)
    await db_session.commit()

    response = await client.post(
        "/api/promocode/apply",
        json={"code": "GROUP1"},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["school_linked"] is True
    assert payload["group_assigned"] is True

    membership_result = await db_session.execute(
        select(SchoolMembership).where(
            SchoolMembership.user_id == normal_user.id,
            SchoolMembership.school_id == school.id,
        )
    )
    membership = membership_result.scalar_one_or_none()
    assert membership is not None
    assert membership.group_id == group_id


@pytest.mark.asyncio
async def test_apply_promocode_prevents_duplicate_usage_and_memberships(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user,
    normal_user_token: str,
):
    await _seed_student_role(db_session)
    school = DrivingSchool(
        slug="promo-school-dup",
        name="Promo School Dup",
        city="Bukhara",
        phone="+998900000003",
        referral_code="PROMODUP",
        is_active=True,
    )
    db_session.add(school)
    await db_session.flush()

    promo = PromoCode(
        code="DUPL1",
        discount_type="percent",
        discount_value=25,
        school_id=school.id,
        is_active=True,
        max_uses=10,
    )
    db_session.add(promo)
    await db_session.commit()

    first_response = await client.post(
        "/api/promocode/apply",
        json={"code": "DUPL1"},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    second_response = await client.post(
        "/api/promocode/apply",
        json={"code": "DUPL1"},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 400
    assert second_response.json()["error_code"] == "PROMOCODE_INVALID"
    assert second_response.json()["message"] == "Promocode already used by this user"

    membership_result = await db_session.execute(
        select(SchoolMembership).where(
            SchoolMembership.user_id == normal_user.id,
            SchoolMembership.school_id == school.id,
        )
    )
    memberships = list(membership_result.scalars().all())
    assert len(memberships) == 1

    refreshed_promo = await db_session.get(PromoCode, promo.id)
    assert refreshed_promo is not None
    assert refreshed_promo.current_uses == 1


@pytest.mark.asyncio
async def test_applied_promocode_can_still_be_used_for_checkout_quote(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user_token: str,
):
    promo = PromoCode(
        code="QUOTE20",
        discount_type="percent",
        discount_value=20,
        is_active=True,
        max_uses=5,
    )
    plan = SubscriptionPlan(
        code="premium_monthly",
        name="Premium Monthly",
        price_cents=100000,
        currency="UZS",
        duration_days=30,
        is_active=True,
        sort_order=1,
    )
    promo.applicable_plans = [plan]
    db_session.add_all([plan, promo])
    await db_session.commit()

    apply_response = await client.post(
        "/api/promocode/apply",
        json={"code": "QUOTE20"},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert apply_response.status_code == 200

    quote_response = await client.post(
        "/api/payments/quote",
        json={"plan_id": str(plan.id), "promo_code": "QUOTE20"},
        headers={"Authorization": f"Bearer {normal_user_token}"},
    )
    assert quote_response.status_code == 200
    payload = quote_response.json()
    assert payload["promo"]["code"] == "QUOTE20"
    assert payload["final_amount_cents"] == 80000
