"""
AUTOTEST Payment Tests
"""

from datetime import timedelta
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.analytics_event import AnalyticsEvent
from models.payment import Payment
from models.promo_code import PromoCode
from models.subscription import Subscription
from models.subscription_plan import SubscriptionPlan
from services.payments.types import (
    CreateCheckoutSessionResponse,
    GetTransactionStatusResponse,
    VerifiedWebhookEvent,
    utc_now,
)


@pytest.mark.asyncio
async def test_create_checkout_session(
    client: AsyncClient,
    normal_user_token: str,
):
    provider_response = CreateCheckoutSessionResponse(
        provider="tspay",
        session_id="sess_test_001",
        checkout_url="https://checkout.tspay.test/sess_test_001",
        raw_response={"id": "sess_test_001", "url": "https://checkout.tspay.test/sess_test_001"},
    )

    with patch(
        "api.payments.router.PAYMENT_PROVIDER.create_checkout_session",
        new=AsyncMock(return_value=provider_response),
    ):
        response = await client.post(
            "/api/payments/create-session",
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["checkout_url"] == provider_response.checkout_url
    assert body["session_id"] == provider_response.session_id
    assert body["provider"] == "tspay"


@pytest.mark.asyncio
async def test_create_checkout_session_persists_provider_cheque_id(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user_token: str,
):
    provider_response = CreateCheckoutSessionResponse(
        provider="tspay",
        session_id="sess_store_001",
        checkout_url="https://checkout.tspay.test/sess_store_001",
        raw_response={
            "transaction": {
                "id": "sess_store_001",
                "cheque_id": "cheque_store_001",
                "url": "https://checkout.tspay.test/sess_store_001",
            }
        },
    )

    with patch(
        "api.payments.router.PAYMENT_PROVIDER.create_checkout_session",
        new=AsyncMock(return_value=provider_response),
    ):
        response = await client.post(
            "/api/payments/create-session",
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )

    assert response.status_code == 200

    payment_result = await db_session.execute(
        select(Payment).where(Payment.provider_session_id == "sess_store_001")
    )
    payment = payment_result.scalar_one_or_none()
    assert payment is not None
    assert payment.provider_payment_id == "cheque_store_001"


@pytest.mark.asyncio
async def test_create_checkout_session_honors_allowed_redirect_urls(
    client: AsyncClient,
    normal_user_token: str,
):
    provider_response = CreateCheckoutSessionResponse(
        provider="tspay",
        session_id="sess_redirect_001",
        checkout_url="https://checkout.tspay.test/sess_redirect_001",
        raw_response={"id": "sess_redirect_001", "url": "https://checkout.tspay.test/sess_redirect_001"},
    )

    with patch(
        "api.payments.router.PAYMENT_PROVIDER.create_checkout_session",
        new=AsyncMock(return_value=provider_response),
    ) as mocked_create_session:
        response = await client.post(
            "/api/payments/create-session",
            json={
                "success_url": "http://localhost:3000/payment/success",
                "cancel_url": "http://localhost:3000/payment/cancel",
            },
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )

    assert response.status_code == 200
    awaited_call = mocked_create_session.await_args
    payload = awaited_call.kwargs.get("payload") if awaited_call.kwargs else None
    if payload is None:
        payload = awaited_call.args[0]
    assert payload.success_url == "http://localhost:3000/payment/success"
    assert payload.cancel_url == "http://localhost:3000/payment/cancel"


@pytest.mark.asyncio
async def test_create_checkout_session_with_plan_and_promo(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user_token: str,
):
    plan = SubscriptionPlan(
        code="premium_quarterly",
        name="Premium Quarterly",
        price_cents=3000,
        currency="USD",
        duration_days=90,
        is_active=True,
        sort_order=10,
    )
    db_session.add(plan)
    await db_session.flush()

    promo = PromoCode(
        code="QTR10",
        discount_type="percent",
        discount_value=10,
        is_active=True,
    )
    promo.applicable_plans = [plan]
    db_session.add(promo)
    await db_session.commit()

    provider_response = CreateCheckoutSessionResponse(
        provider="tspay",
        session_id="sess_test_plan_001",
        checkout_url="https://checkout.tspay.test/sess_test_plan_001",
        raw_response={"id": "sess_test_plan_001", "url": "https://checkout.tspay.test/sess_test_plan_001"},
    )

    with patch(
        "api.payments.router.PAYMENT_PROVIDER.create_checkout_session",
        new=AsyncMock(return_value=provider_response),
    ) as mocked_create_session:
        response = await client.post(
            "/api/payments/create-session",
            json={"plan_id": str(plan.id), "promo_code": "QTR10"},
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["checkout_url"] == provider_response.checkout_url

    awaited_call = mocked_create_session.await_args
    payload = awaited_call.kwargs.get("payload") if awaited_call.kwargs else None
    if payload is None:
        payload = awaited_call.args[0]
    assert payload.amount_cents == 35100000
    assert payload.metadata["plan"] == "premium_quarterly"
    assert payload.metadata["duration_days"] == "90"
    assert payload.metadata["promo_code"] == "QTR10"


@pytest.mark.asyncio
async def test_webhook_subscription_activation_idempotent(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user,
):
    event = VerifiedWebhookEvent(
        provider="tspay",
        provider_event_id="evt_tspay_001",
        event_type="payment.succeeded",
        occurred_at=utc_now(),
        session_id="sess_tspay_001",
        payment_id="pay_tspay_001",
        user_id=str(normal_user.id),
        status="succeeded",
        amount_cents=1000,
        currency="USD",
        metadata={"user_id": str(normal_user.id)},
        raw_payload={"id": "evt_tspay_001", "type": "payment.succeeded"},
    )

    with patch("api.payments.router.PAYMENT_PROVIDER.verify_webhook", return_value=event):
        first = await client.post(
            "/api/payments/webhook",
            content=b'{"id":"evt_tspay_001"}',
            headers={"x-tspay-signature": "t=1730000000,v1=test"},
        )
        second = await client.post(
            "/api/payments/webhook",
            content=b'{"id":"evt_tspay_001"}',
            headers={"x-tspay-signature": "t=1730000000,v1=test"},
        )

    assert first.status_code == 200
    assert first.json()["status"] == "success"
    assert second.status_code == 200
    assert second.json()["idempotent"] is True

    subscription_result = await db_session.execute(
        select(Subscription).where(Subscription.user_id == normal_user.id)
    )
    subscription = subscription_result.scalar_one_or_none()
    assert subscription is not None
    assert subscription.plan == "premium"
    assert subscription.status == "active"
    assert subscription.expires_at is not None
    assert subscription.expires_at > utc_now() + timedelta(days=29)

    analytics_result = await db_session.execute(
        select(AnalyticsEvent).where(
            AnalyticsEvent.user_id == normal_user.id,
            AnalyticsEvent.event_name == "upgrade_success",
        )
    )
    events = analytics_result.scalars().all()
    assert len(events) == 1


@pytest.mark.asyncio
async def test_webhook_does_not_double_activate_on_distinct_success_events(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user,
):
    first_event = VerifiedWebhookEvent(
        provider="tspay",
        provider_event_id="evt_tspay_success_1",
        event_type="payment.succeeded",
        occurred_at=utc_now(),
        session_id="sess_tspay_shared",
        payment_id="pay_tspay_shared",
        user_id=str(normal_user.id),
        status="succeeded",
        amount_cents=1000,
        currency="USD",
        metadata={"user_id": str(normal_user.id)},
        raw_payload={"id": "evt_tspay_success_1", "type": "payment.succeeded"},
    )
    second_event = VerifiedWebhookEvent(
        provider="tspay",
        provider_event_id="evt_tspay_success_2",
        event_type="checkout.session.completed",
        occurred_at=utc_now(),
        session_id="sess_tspay_shared",
        payment_id="pay_tspay_shared",
        user_id=str(normal_user.id),
        status="completed",
        amount_cents=1000,
        currency="USD",
        metadata={"user_id": str(normal_user.id)},
        raw_payload={"id": "evt_tspay_success_2", "type": "checkout.session.completed"},
    )

    with patch(
        "api.payments.router.PAYMENT_PROVIDER.verify_webhook",
        side_effect=[first_event, second_event],
    ):
        first = await client.post(
            "/api/payments/webhook",
            content=b'{"id":"evt_tspay_success_1"}',
            headers={"x-tspay-signature": "t=1730000000,v1=test"},
        )
        second = await client.post(
            "/api/payments/webhook",
            content=b'{"id":"evt_tspay_success_2"}',
            headers={"x-tspay-signature": "t=1730000000,v1=test"},
        )

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["idempotent"] is True

    subscription_result = await db_session.execute(
        select(Subscription).where(Subscription.user_id == normal_user.id)
    )
    subscription = subscription_result.scalar_one_or_none()
    assert subscription is not None
    assert subscription.expires_at is not None

    expected_floor = utc_now() + timedelta(days=29)
    expected_ceiling = utc_now() + timedelta(days=31)
    assert expected_floor < subscription.expires_at < expected_ceiling

    analytics_result = await db_session.execute(
        select(AnalyticsEvent).where(
            AnalyticsEvent.user_id == normal_user.id,
            AnalyticsEvent.event_name == "upgrade_success",
        )
    )
    events = analytics_result.scalars().all()
    assert len(events) == 1


@pytest.mark.asyncio
async def test_get_transaction_status(
    client: AsyncClient,
    normal_user_token: str,
):
    status_response = GetTransactionStatusResponse(
        provider="tspay",
        cheque_id="998877",
        transaction_id="998877",
        pay_status="paid",
        amount=50000,
        raw_response={"status": "success", "data": {"id": 998877, "pay_status": "paid"}},
    )

    with patch(
        "api.payments.router.PAYMENT_PROVIDER.get_transaction_status",
        new=AsyncMock(return_value=status_response),
    ):
        response = await client.get(
            "/api/payments/transactions/998877",
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "tspay"
    assert body["cheque_id"] == "998877"
    assert body["pay_status"] == "paid"


@pytest.mark.asyncio
async def test_get_transaction_status_resolves_cheque_id_from_local_payment(
    client: AsyncClient,
    db_session: AsyncSession,
    normal_user,
    normal_user_token: str,
):
    db_session.add(
        Payment(
            user_id=normal_user.id,
            provider="tspay",
            provider_session_id="6090",
            provider_payment_id=None,
            status="session_created",
            amount_cents=100000,
            currency="UZS",
            raw_payload={
                "provider_session": {
                    "transaction": {
                        "id": 6090,
                        "cheque_id": "uuid_cheque_6090",
                    }
                },
                "plan": {
                    "code": "premium",
                    "duration_days": 30,
                },
            },
        )
    )
    await db_session.commit()

    status_response = GetTransactionStatusResponse(
        provider="tspay",
        cheque_id="uuid_cheque_6090",
        transaction_id="6090",
        pay_status="success",
        amount=100000,
        raw_response={
            "id": 6090,
            "cheque_id": "uuid_cheque_6090",
            "status": "success",
            "amount": 1000,
        },
    )

    with patch(
        "api.payments.router.PAYMENT_PROVIDER.get_transaction_status",
        new=AsyncMock(return_value=status_response),
    ) as mocked_get_status:
        response = await client.get(
            "/api/payments/transactions/6090",
            headers={"Authorization": f"Bearer {normal_user_token}"},
        )

    assert response.status_code == 200
    mocked_get_status.assert_awaited_once_with(cheque_id="uuid_cheque_6090")

    refreshed_result = await db_session.execute(
        select(Payment).where(Payment.provider_session_id == "6090")
    )
    refreshed_payment = refreshed_result.scalar_one_or_none()
    assert refreshed_payment is not None
    assert refreshed_payment.provider_payment_id == "uuid_cheque_6090"
    assert refreshed_payment.status == "succeeded"
