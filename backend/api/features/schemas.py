"""
Feature catalog schemas.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class FeatureResponse(BaseModel):
    id: UUID
    key: str
    name: str
    is_premium: bool
    enabled_for_all_until: datetime | None = None
    experiment_group: str | None = None
    rollout_percentage: int = Field(default=0, ge=0, le=100)
    feature_usage_limit: int | None = Field(default=None, ge=1)
    current_price: float | None = Field(default=None, ge=0)
    suggested_price_min: float | None = Field(default=None, ge=0)
    suggested_price_max: float | None = Field(default=None, ge=0)
    last_price_analysis_at: datetime | None = None
    has_access: bool | None = None
    access_reason: str | None = None
    remaining_trial_uses: int | None = Field(default=None, ge=0)
    trial_usage_count: int | None = Field(default=None, ge=0)
    effective_trial_limit: int | None = Field(default=None, ge=0)
    rollout_eligible: bool | None = None
    experiment_variant: str | None = None
    user_segment: str | None = None
    recommended_prompt_intensity: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FeatureUpdateRequest(BaseModel):
    is_premium: bool | None = None
    enabled_for_all_until: datetime | None = Field(default=None)
    experiment_group: str | None = Field(default=None, max_length=100)
    rollout_percentage: int | None = Field(default=None, ge=0, le=100)
    feature_usage_limit: int | None = Field(default=None, ge=1)
    current_price: float | None = Field(default=None, ge=0)
