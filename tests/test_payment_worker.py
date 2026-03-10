from __future__ import annotations

from datetime import timedelta
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select

from core.security import get_password_hash
from models.payment import Payment
from models.user import User
from services.payments.payment_worker import PaymentWorker, PaymentWorkerConfig
from services.payments.types import GetTransactionStatusResponse, PaymentProviderError, utc_now
from tests.conftest import TestingSessionLocal


@pytest.mark.asyncio
async def test_payment_worker_schedules_retry_with_metadata() -> None:
    async with TestingSessionLocal() as session:
        user = User(
            email="worker-retry@example.com",
            hashed_password=get_password_hash("password123"),
            is_verified=True,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        payment = Payment(
            user_id=user.id,
            provider="tspay",
            provider_session_id="worker-retry-001",
            status="pending",
            amount_cents=100000,
            currency="UZS",
            created_at=utc_now() - timedelta(minutes=5),
            raw_payload={"plan": {"code": "premium", "duration_days": 30}},
        )
        session.add(payment)
        await session.commit()
        payment_id = payment.id

    provider = AsyncMock()
    provider.provider_name = "tspay"
    provider.get_transaction_status = AsyncMock(side_effect=PaymentProviderError("provider temporarily unavailable"))

    worker = PaymentWorker(
        session_maker=TestingSessionLocal,
        provider=provider,
        config=PaymentWorkerConfig(max_retries=5, base_retry_delay_seconds=30, poll_interval_seconds=1),
    )

    processed = await worker.process_pending_payments()
    assert processed == 1

    async with TestingSessionLocal() as verify_session:
        refreshed = (
            await verify_session.execute(select(Payment).where(Payment.id == payment_id))
        ).scalar_one()
        metadata = refreshed.raw_payload.get("_payment_worker")
        assert refreshed.status == "pending"
        assert isinstance(metadata, dict)
        assert metadata["retry_count"] == 1
        assert metadata["last_error"] == "provider temporarily unavailable"
        assert metadata["next_retry_at"]


@pytest.mark.asyncio
async def test_payment_worker_marks_reconciliation_failed_after_max_retries() -> None:
    async with TestingSessionLocal() as session:
        user = User(
            email="worker-exhaust@example.com",
            hashed_password=get_password_hash("password123"),
            is_verified=True,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        payment = Payment(
            user_id=user.id,
            provider="tspay",
            provider_session_id="worker-exhaust-001",
            status="pending",
            amount_cents=100000,
            currency="UZS",
            created_at=utc_now() - timedelta(minutes=5),
            raw_payload={
                "plan": {"code": "premium", "duration_days": 30},
                "_payment_worker": {
                    "retry_count": 4,
                },
            },
        )
        session.add(payment)
        await session.commit()
        payment_id = payment.id

    provider = AsyncMock()
    provider.provider_name = "tspay"
    provider.get_transaction_status = AsyncMock(side_effect=PaymentProviderError("provider still unavailable"))

    worker = PaymentWorker(
        session_maker=TestingSessionLocal,
        provider=provider,
        config=PaymentWorkerConfig(max_retries=5, base_retry_delay_seconds=30, poll_interval_seconds=1),
    )

    processed = await worker.process_pending_payments()
    assert processed == 1

    async with TestingSessionLocal() as verify_session:
        refreshed = (
            await verify_session.execute(select(Payment).where(Payment.id == payment_id))
        ).scalar_one()
        metadata = refreshed.raw_payload.get("_payment_worker")
        assert refreshed.status == "reconciliation_failed"
        assert isinstance(metadata, dict)
        assert metadata["retry_count"] == 5
        assert metadata["exhausted_at"]
