"""
Abstract provider interface for payment integrations.
"""

from __future__ import annotations

from typing import Protocol

from services.payments.types import (
    CreateCheckoutSessionRequest,
    CreateCheckoutSessionResponse,
    VerifiedWebhookEvent,
)


class PaymentProvider(Protocol):
    """Protocol for pluggable payment providers."""

    provider_name: str

    async def create_checkout_session(
        self,
        payload: CreateCheckoutSessionRequest,
    ) -> CreateCheckoutSessionResponse:
        """Create a hosted checkout/payment session."""

    def verify_webhook(
        self,
        payload: bytes,
        signature_header: str | None,
    ) -> VerifiedWebhookEvent:
        """Verify webhook authenticity and return normalized event."""
