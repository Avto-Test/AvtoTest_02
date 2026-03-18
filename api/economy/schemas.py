"""
AUTOTEST economy schemas.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from api.tests.schemas import PublicQuestion


class ActiveXPBoostResponse(BaseModel):
    multiplier: float
    source: str
    activated_at: datetime
    expires_at: datetime
    remaining_seconds: int


class XPBoostOfferResponse(BaseModel):
    cost: int
    multiplier: float
    duration_minutes: int
    active: ActiveXPBoostResponse | None = None


class SimulationCooldownOfferResponse(BaseModel):
    cost_per_day: int
    max_days: int
    available_days: int
    days_used: int
    cooldown_remaining_seconds: int
    next_available_at: datetime | None = None


class FocusPackOfferResponse(BaseModel):
    cost: int
    question_count: int


class SimulationFastUnlockOfferResponse(BaseModel):
    cost: int
    duration_hours: int
    active: bool = False
    expires_at: datetime | None = None


class EconomyOverviewResponse(BaseModel):
    coin_balance: int
    active_xp_boost: ActiveXPBoostResponse | None = None
    xp_boost_offer: XPBoostOfferResponse
    simulation_cooldown_offer: SimulationCooldownOfferResponse
    focus_pack_offer: FocusPackOfferResponse
    simulation_fast_unlock_offer: SimulationFastUnlockOfferResponse


class CooldownReductionRequest(BaseModel):
    days: int = Field(ge=1, le=5)


class CooldownReductionResponse(BaseModel):
    coin_balance: int
    coins_spent: int
    days_applied: int
    cooldown_remaining_seconds: int
    next_available_at: datetime | None = None


class XPBoostActivationResponse(BaseModel):
    coin_balance: int
    coins_spent: int
    boost: ActiveXPBoostResponse


class FocusPackRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=120)
    question_count: int = Field(default=20, ge=10, le=50)


class FocusPackResponse(BaseModel):
    session_id: UUID
    topic: str
    question_count: int
    coin_balance: int
    coins_spent: int
    questions: list[PublicQuestion]


class SimulationFastUnlockResponse(BaseModel):
    coin_balance: int
    coins_spent: int
    expires_at: datetime
    active: bool = True
    already_active: bool = False
