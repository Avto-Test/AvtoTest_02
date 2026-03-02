"""
AUTOTEST Payment Schemas
Pydantic schemas for payment operations
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    """Checkout session request payload."""

    plan_id: UUID | None = None
    promo_code: str | None = Field(default=None, max_length=50)


class RedeemPromoRequest(BaseModel):
    """Instant redeem payload for fully discounted promo codes."""

    plan_id: UUID
    promo_code: str = Field(..., min_length=1, max_length=50)


class PublicSubscriptionPlanResponse(BaseModel):
    """Public subscription plan metadata used by checkout UI."""

    id: UUID
    code: str
    name: str
    description: str | None
    price_cents: int
    currency: str
    duration_days: int
    is_active: bool
    sort_order: int

    model_config = {"from_attributes": True}


class CreateSessionResponse(BaseModel):
    """Response model for payment session creation."""

    checkout_url: str
    session_id: str
    provider: str = "tspay"


class CheckoutPromoQuoteResponse(BaseModel):
    """Applied promo metadata for checkout quote response."""

    id: UUID
    code: str
    discount_type: str
    discount_value: int
    savings_cents: int


class CheckoutQuoteResponse(BaseModel):
    """Price quote response before checkout session creation."""

    plan_id: UUID | None = None
    plan_name: str | None = None
    duration_days: int
    currency: str
    base_amount_cents: int
    final_amount_cents: int
    promo: CheckoutPromoQuoteResponse | None = None


class RedeemPromoResponse(BaseModel):
    """Response after successful zero-cost promo redemption."""

    activated: bool
    plan_code: str
    plan_name: str
    promo_code: str
    expires_at: datetime | None


class CheckoutResponse(BaseModel):
    """
    Legacy response shape retained for compatibility.
    New integrations should use CreateSessionResponse.
    """

    checkout_url: str
    session_id: str | None = None
    provider: str | None = None


class WebhookResponse(BaseModel):
    """Webhook acknowledgement payload."""

    status: str
    idempotent: bool = False


class TransactionStatusResponse(BaseModel):
    """TsPay cheque status lookup response."""

    cheque_id: str
    transaction_id: str | None = None
    pay_status: str | None = None
    amount: int | None = None
    provider: str = "tspay"
    raw: dict | None = None
