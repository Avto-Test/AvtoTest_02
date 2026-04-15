"""
Promocode domain schemas.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ApplyPromocodeRequest(BaseModel):
    """Request payload for applying a promocode."""

    code: str = Field(..., min_length=1, max_length=50)


class ApplyPromocodeResponse(BaseModel):
    """Response payload after a successful promocode application."""

    success: bool
    discount_percent: int | None = None
    school_linked: bool
    group_assigned: bool


class PromoCodeCreate(BaseModel):
    """Schema for creating a promo code."""

    code: str = Field(..., min_length=3, max_length=50)
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    discount_type: str = Field(default="percent", max_length=20)
    discount_value: int = Field(default=0, ge=0)
    school_id: UUID | None = None
    group_id: UUID | None = None
    max_redemptions: int | None = Field(default=None, ge=1)
    max_uses: int | None = Field(default=None, ge=1)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool = True
    applicable_plan_ids: list[UUID] = Field(default_factory=list)


class PromoCodeUpdate(BaseModel):
    """Schema for updating a promo code."""

    code: str | None = Field(default=None, min_length=3, max_length=50)
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    discount_type: str | None = Field(default=None, max_length=20)
    discount_value: int | None = Field(default=None, ge=0)
    school_id: UUID | None = None
    group_id: UUID | None = None
    max_redemptions: int | None = Field(default=None, ge=1)
    max_uses: int | None = Field(default=None, ge=1)
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool | None = None
    applicable_plan_ids: list[UUID] | None = None


class PromoCodeResponse(BaseModel):
    """Promo code response."""

    id: UUID
    code: str
    name: str | None
    description: str | None
    discount_type: str
    discount_value: int
    school_id: UUID | None = None
    group_id: UUID | None = None
    max_redemptions: int | None
    max_uses: int | None = None
    redeemed_count: int
    current_uses: int = 0
    starts_at: datetime | None
    expires_at: datetime | None
    is_active: bool
    applicable_plan_ids: list[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


__all__ = [
    "ApplyPromocodeRequest",
    "ApplyPromocodeResponse",
    "PromoCodeCreate",
    "PromoCodeResponse",
    "PromoCodeUpdate",
]
