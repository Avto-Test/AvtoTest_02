"""
Background payment worker.

Processes pending payment records outside the web process, reconciles provider
status, schedules retries with exponential backoff, and records structured logs.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from core.logging import get_logger
from core.monitoring import capture_exception, capture_message, init_monitoring, start_span
from database.session import async_session_maker
from models.payment import Payment
from models.subscription import Subscription
from services.experiments import record_experiment_event
from services.payments.tspay import TSPayProvider
from services.payments.types import GetTransactionStatusResponse, PaymentProviderError, utc_now
from services.subscriptions.lifecycle import _activate_subscription

logger = get_logger(__name__)

DEFAULT_PENDING_STATUSES = ("pending", "session_created")
WORKER_METADATA_KEY = "_payment_worker"


@dataclass(slots=True)
class PaymentWorkerConfig:
    max_retries: int = 5
    base_retry_delay_seconds: int = 30
    max_retry_delay_seconds: int = 60 * 30
    stale_after_minutes: int = 2
    batch_size: int = 50
    poll_interval_seconds: int = 60


def _first_non_empty_string(*values: object | None) -> str | None:
    for value in values:
        if value is None:
            continue
        normalized = str(value).strip()
        if normalized:
            return normalized
    return None


def _iter_payment_payload_candidates(payload: dict | None) -> tuple[dict, ...]:
    if not isinstance(payload, dict):
        return ()

    candidates: list[dict] = []
    seen: set[int] = set()

    def add_candidate(value: object | None) -> None:
        if not isinstance(value, dict):
            return
        value_id = id(value)
        if value_id in seen:
            return
        seen.add(value_id)
        candidates.append(value)

    add_candidate(payload)

    data_payload = payload.get("data")
    add_candidate(data_payload)

    provider_session = payload.get("provider_session")
    add_candidate(provider_session)

    for candidate in (
        payload.get("transaction"),
        data_payload.get("transaction") if isinstance(data_payload, dict) else None,
        provider_session.get("transaction") if isinstance(provider_session, dict) else None,
    ):
        add_candidate(candidate)

    return tuple(candidates)


def _amount_matches_reference(
    event_amount: int | None,
    reference_amount: int | None,
) -> bool:
    if event_amount is None or reference_amount is None:
        return True
    event_value = int(event_amount)
    reference_value = int(reference_amount)
    if event_value == reference_value:
        return True
    return event_value * 100 == reference_value or event_value == reference_value * 100


def _extract_provider_cheque_id_from_payment(payment: Payment) -> str | None:
    raw_payload = payment.raw_payload if isinstance(payment.raw_payload, dict) else {}
    provider_session = raw_payload.get("provider_session")
    payload_candidates = _iter_payment_payload_candidates(provider_session)

    return _first_non_empty_string(
        payment.provider_payment_id,
        *[candidate.get("cheque_id") for candidate in payload_candidates],
    )


def _ensure_payment_payload(payment: Payment) -> dict[str, Any]:
    if isinstance(payment.raw_payload, dict):
        return dict(payment.raw_payload)
    return {}


def _parse_iso_datetime(value: object | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        try:
            if raw.endswith("Z"):
                raw = raw[:-1] + "+00:00"
            parsed = datetime.fromisoformat(raw)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return None


def _log_worker_event(
    level: int,
    *,
    event: str,
    payment_id: str | None = None,
    status: str | None = None,
    retry_count: int | None = None,
    error: str | None = None,
    extra_fields: dict[str, object] | None = None,
) -> None:
    payload: dict[str, object] = {"event": event}
    if payment_id is not None:
        payload["payment_id"] = payment_id
    if status is not None:
        payload["status"] = status
    if retry_count is not None:
        payload["retry_count"] = retry_count
    if error is not None:
        payload["error"] = error
    if extra_fields:
        payload.update(extra_fields)
    logger.log(level, "payment_worker %s", json.dumps(payload, sort_keys=True, default=str))


class PaymentWorker:
    def __init__(
        self,
        *,
        session_maker: async_sessionmaker[AsyncSession] | Callable[[], AsyncSession] = async_session_maker,
        provider: TSPayProvider | None = None,
        config: PaymentWorkerConfig | None = None,
    ) -> None:
        self.session_maker = session_maker
        self.provider = provider or TSPayProvider()
        self.config = config or PaymentWorkerConfig()
        init_monitoring()

    def _worker_metadata(self, payment: Payment) -> dict[str, Any]:
        raw_payload = _ensure_payment_payload(payment)
        metadata = raw_payload.get(WORKER_METADATA_KEY)
        if isinstance(metadata, dict):
            return dict(metadata)
        return {}

    def _replace_worker_metadata(self, payment: Payment, metadata: dict[str, Any] | None) -> None:
        raw_payload = _ensure_payment_payload(payment)
        if metadata:
            raw_payload[WORKER_METADATA_KEY] = metadata
        else:
            raw_payload.pop(WORKER_METADATA_KEY, None)
        payment.raw_payload = raw_payload

    def _retry_count(self, payment: Payment) -> int:
        metadata = self._worker_metadata(payment)
        try:
            return max(int(metadata.get("retry_count", 0)), 0)
        except (TypeError, ValueError):
            return 0

    def _next_retry_at(self, payment: Payment) -> datetime | None:
        metadata = self._worker_metadata(payment)
        return _parse_iso_datetime(metadata.get("next_retry_at"))

    def _is_due_for_processing(self, payment: Payment, *, now: datetime) -> bool:
        next_retry_at = self._next_retry_at(payment)
        if next_retry_at is None:
            return True
        return next_retry_at <= now

    def _calculate_retry_delay_seconds(self, retry_count: int) -> int:
        base_delay = max(int(self.config.base_retry_delay_seconds), 1)
        max_delay = max(int(self.config.max_retry_delay_seconds), base_delay)
        exponent = max(retry_count - 1, 0)
        return min(base_delay * (2 ** exponent), max_delay)

    def _clear_retry_state(self, payment: Payment) -> None:
        self._replace_worker_metadata(payment, None)

    async def _schedule_retry(
        self,
        *,
        db: AsyncSession,
        payment: Payment,
        error_message: str,
    ) -> None:
        payment_id = str(payment.id)
        current_retry_count = self._retry_count(payment)
        next_retry_count = current_retry_count + 1
        exhausted = next_retry_count >= self.config.max_retries
        now = utc_now()

        metadata = {
            "retry_count": next_retry_count,
            "last_error": error_message,
            "last_attempt_at": now.isoformat(),
        }

        if exhausted:
            payment.status = "reconciliation_failed"
            payment.processed_at = now
            metadata["exhausted_at"] = now.isoformat()
            metadata["next_retry_at"] = None
            self._replace_worker_metadata(payment, metadata)
            await db.commit()
            _log_worker_event(
                40,
                event="retry_exhausted",
                payment_id=payment_id,
                status=payment.status,
                retry_count=next_retry_count,
                error=error_message,
            )
            capture_message(
                "payment_worker retry exhausted",
                level="warning",
                tags={
                    "component": "payment_worker",
                    "event": "retry_exhausted",
                    "payment_status": payment.status,
                },
                extras={
                    "payment_id": payment_id,
                    "retry_count": next_retry_count,
                    "error": error_message,
                },
            )
            return

        delay_seconds = self._calculate_retry_delay_seconds(next_retry_count)
        next_retry_at = now + timedelta(seconds=delay_seconds)
        metadata["next_retry_at"] = next_retry_at.isoformat()
        self._replace_worker_metadata(payment, metadata)
        await db.commit()
        _log_worker_event(
            30,
            event="retry_scheduled",
            payment_id=payment_id,
            status=payment.status,
            retry_count=next_retry_count,
            error=error_message,
            extra_fields={"next_retry_at": next_retry_at.isoformat()},
        )

    async def _mark_succeeded(
        self,
        *,
        db: AsyncSession,
        payment: Payment,
        provider_status: GetTransactionStatusResponse,
    ) -> None:
        plan_info = payment.raw_payload.get("plan", {}) if isinstance(payment.raw_payload, dict) else {}
        plan_code = plan_info.get("code", "premium")
        try:
            duration_days = int(plan_info.get("duration_days", 30))
        except (ValueError, TypeError):
            duration_days = 30

        provider_sub_id = provider_status.cheque_id or provider_status.transaction_id

        if payment.user_id:
            result_sub = await db.execute(select(Subscription).where(Subscription.user_id == payment.user_id))
            existing_sub = result_sub.scalar_one_or_none()

            if not existing_sub or existing_sub.provider_subscription_id != provider_sub_id:
                await _activate_subscription(
                    user_id=payment.user_id,
                    db=db,
                    provider=self.provider.provider_name,
                    provider_subscription_id=provider_sub_id,
                    plan_code=plan_code,
                    duration_days=duration_days,
                    payment=payment,
                )

                metadata = {
                    "provider": payment.provider,
                    "payment_id": payment.provider_payment_id,
                    "session_id": payment.provider_session_id,
                    "provider_event_id": f"payment_worker_{uuid.uuid4()}",
                    "event_type": "reconciliation_sync",
                    "amount_cents": payment.amount_cents,
                    "currency": payment.currency,
                    "plan": plan_code,
                    "source": "payment_worker",
                }
                await record_experiment_event(
                    db,
                    user_id=payment.user_id,
                    event_name="upgrade_success",
                    metadata=metadata,
                )
                await record_experiment_event(
                    db,
                    user_id=payment.user_id,
                    event_name="payment_success",
                    metadata=metadata,
                )

        payment.status = "succeeded"
        payment.processed_at = utc_now()
        self._clear_retry_state(payment)
        await db.commit()
        _log_worker_event(
            20,
            event="payment_completed",
            payment_id=str(payment.id),
            status=payment.status,
            retry_count=self._retry_count(payment),
        )
        _log_worker_event(
            20,
            event="payment_succeeded",
            payment_id=str(payment.id),
            status=payment.status,
            retry_count=self._retry_count(payment),
        )

    async def _mark_failed(self, *, db: AsyncSession, payment: Payment, status_value: str) -> None:
        payment.status = status_value
        payment.processed_at = utc_now()
        self._clear_retry_state(payment)
        await db.commit()
        _log_worker_event(
            20,
            event="payment_failed",
            payment_id=str(payment.id),
            status=payment.status,
            retry_count=self._retry_count(payment),
        )

    async def _reconcile_payment(self, *, db: AsyncSession, payment: Payment) -> None:
        payment_id = str(payment.id)
        retry_count = self._retry_count(payment)

        _log_worker_event(
            20,
            event="reconcile_started",
            payment_id=payment_id,
            status=payment.status,
            retry_count=retry_count,
        )

        cheque_id = _first_non_empty_string(
            _extract_provider_cheque_id_from_payment(payment),
            payment.provider_session_id,
        )
        if cheque_id is None:
            await self._schedule_retry(
                db=db,
                payment=payment,
                error_message="missing_provider_cheque_id",
            )
            return

        try:
            provider_status = await self.provider.get_transaction_status(cheque_id)
        except PaymentProviderError as exc:
            await self._schedule_retry(
                db=db,
                payment=payment,
                error_message=str(exc),
            )
            return
        except Exception as exc:
            await self._schedule_retry(
                db=db,
                payment=payment,
                error_message=f"unexpected:{exc}",
            )
            return

        payment_record_changed = False

        resolved_provider_payment_id = _first_non_empty_string(provider_status.cheque_id)
        if (
            resolved_provider_payment_id is not None
            and payment.provider_payment_id != resolved_provider_payment_id
        ):
            payment.provider_payment_id = resolved_provider_payment_id
            payment_record_changed = True

        resolved_provider_session_id = _first_non_empty_string(
            payment.provider_session_id,
            provider_status.transaction_id,
        )
        if (
            resolved_provider_session_id is not None
            and payment.provider_session_id != resolved_provider_session_id
        ):
            payment.provider_session_id = resolved_provider_session_id
            payment_record_changed = True

        pay_status = (provider_status.pay_status or "").strip().lower()
        provider_amount = provider_status.amount

        if pay_status in {"success", "paid", "succeeded"}:
            if not _amount_matches_reference(
                event_amount=provider_amount,
                reference_amount=payment.amount_cents,
            ):
                payment.status = "suspicious"
                payment.processed_at = utc_now()
                self._clear_retry_state(payment)
                await db.commit()
                _log_worker_event(
                    40,
                    event="amount_mismatch",
                    payment_id=payment_id,
                    status=payment.status,
                    retry_count=retry_count,
                    error=f"expected={payment.amount_cents},provider={provider_amount}",
                )
                return

            await self._mark_succeeded(db=db, payment=payment, provider_status=provider_status)
            return

        if pay_status in {"canceled", "cancelled", "failed", "error"}:
            await self._mark_failed(db=db, payment=payment, status_value="failed")
            return

        if payment_record_changed:
            self._clear_retry_state(payment)
            await db.commit()

        _log_worker_event(
            20,
            event="payment_still_pending",
            payment_id=payment_id,
            status=payment.status,
            retry_count=retry_count,
            extra_fields={"provider_status": pay_status or "unknown"},
        )

    async def process_pending_payments(self, *, limit: int | None = None) -> int:
        now = utc_now()
        threshold = now - timedelta(minutes=self.config.stale_after_minutes)
        batch_limit = max(int(limit or self.config.batch_size), 1)

        processed = 0
        try:
            with start_span(
                op="payment.reconciliation.batch",
                name="payment_worker.process_pending_payments",
                attributes={"batch_limit": batch_limit},
            ):
                async with self.session_maker() as db:
                    stmt = (
                        select(Payment)
                        .where(
                            and_(
                                Payment.status.in_(DEFAULT_PENDING_STATUSES),
                                Payment.created_at < threshold,
                                Payment.provider == self.provider.provider_name,
                            )
                        )
                        .order_by(Payment.created_at.asc())
                        .limit(batch_limit * 5)
                    )
                    bind = db.get_bind()
                    if bind is not None and bind.dialect.name == "postgresql":
                        stmt = stmt.with_for_update(skip_locked=True)

                    result = await db.execute(stmt)
                    candidates = result.scalars().all()

                    due_payments = [
                        payment for payment in candidates if self._is_due_for_processing(payment, now=now)
                    ][:batch_limit]

                    if not due_payments:
                        return 0

                    _log_worker_event(
                        20,
                        event="batch_started",
                        status="pending",
                        extra_fields={"batch_size": len(due_payments)},
                    )

                    for payment in due_payments:
                        with start_span(
                            op="payment.reconciliation.item",
                            name="payment_worker.reconcile_payment",
                            attributes={"payment_id": str(payment.id)},
                        ):
                            await self._reconcile_payment(db=db, payment=payment)
                        processed += 1

        except Exception as exc:
            _log_worker_event(
                40,
                event="batch_failed",
                status="error",
                error=str(exc),
            )
            capture_exception(
                exc,
                tags={
                    "component": "payment_worker",
                    "event": "worker_cycle_failed",
                },
                extras={"processed_count": processed},
            )
            raise

        _log_worker_event(
            20,
            event="batch_completed",
            status="ok",
            extra_fields={"processed_count": processed},
        )
        return processed

    async def reconcile_pending_payments(self, *, limit: int | None = None) -> int:
        return await self.process_pending_payments(limit=limit)

    async def run_forever(self) -> None:
        _log_worker_event(
            20,
            event="worker_started",
            status="running",
            retry_count=0,
            extra_fields={"poll_interval_seconds": self.config.poll_interval_seconds},
        )

        while True:
            try:
                await self.process_pending_payments()
                await asyncio.sleep(self.config.poll_interval_seconds)
            except asyncio.CancelledError:
                _log_worker_event(
                    20,
                    event="worker_stopped",
                    status="stopped",
                    retry_count=0,
                )
                raise
            except Exception as exc:
                _log_worker_event(
                    40,
                    event="worker_cycle_failed",
                    status="error",
                    retry_count=0,
                    error=str(exc),
                )
                await asyncio.sleep(min(self.config.poll_interval_seconds, 60))
