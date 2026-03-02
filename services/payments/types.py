"""
Payment domain types for provider abstraction and webhook processing.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class PaymentProviderError(RuntimeError):
    """Base error for payment provider operations."""


class PaymentSignatureError(PaymentProviderError):
    """Raised when webhook signature verification fails."""


class PaymentReplayError(PaymentSignatureError):
    """Raised when webhook request falls outside replay tolerance."""


class PaymentEventType(str, Enum):
    """Normalized payment event types."""

    PAYMENT_SUCCEEDED = "payment.succeeded"
    PAYMENT_FAILED = "payment.failed"
    CHECKOUT_COMPLETED = "checkout.session.completed"


@dataclass(slots=True, frozen=True)
class CreateCheckoutSessionRequest:
    """Request payload for checkout-session creation."""

    user_id: str
    email: str
    amount_cents: int
    currency: str
    success_url: str
    cancel_url: str
    idempotency_key: str
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class CreateCheckoutSessionResponse:
    """Provider response for checkout-session creation."""

    provider: str
    session_id: str
    checkout_url: str
    raw_response: dict[str, Any]


@dataclass(slots=True, frozen=True)
class VerifiedWebhookEvent:
    """Canonical webhook payload after signature verification."""

    provider: str
    provider_event_id: str
    event_type: str
    occurred_at: datetime
    session_id: str | None
    payment_id: str | None
    user_id: str | None
    status: str | None
    amount_cents: int | None
    currency: str | None
    metadata: dict[str, Any]
    raw_payload: dict[str, Any]

    @property
    def is_success(self) -> bool:
        event_type = self.event_type.lower()
        status = (self.status or "").lower()
        return event_type in {
            PaymentEventType.PAYMENT_SUCCEEDED.value,
            PaymentEventType.CHECKOUT_COMPLETED.value,
        } and status in {"success", "succeeded", "completed", "paid"}

    @property
    def is_failure(self) -> bool:
        event_type = self.event_type.lower()
        status = (self.status or "").lower()
        return event_type == PaymentEventType.PAYMENT_FAILED.value or status in {
            "failed",
            "canceled",
            "cancelled",
            "declined",
        }


def utc_now() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)
