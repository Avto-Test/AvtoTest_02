"""
AUTOTEST User Schemas
Pydantic models for user profile
"""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserMeResponse(BaseModel):
    """Schema for current user profile."""
    id: UUID
    email: EmailStr
    full_name: str | None = None
    is_verified: bool
    is_active: bool
    is_admin: bool
    roles: list[str] = []
    is_premium: bool
    has_instructor_profile: bool = False
    has_school_profile: bool = False
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class XPSummaryResponse(BaseModel):
    total_xp: int
    level: int
    current_level_xp: int
    next_level_xp: int
    xp_to_next_level: int
    progress_percent: int


class CoinBalanceResponse(BaseModel):
    balance: int
    last_updated: datetime | None = None


class ActiveXPBoostResponse(BaseModel):
    multiplier: float
    source: str
    activated_at: datetime
    expires_at: datetime
    remaining_seconds: int


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_activity_date: date | None = None


class AchievementItemResponse(BaseModel):
    id: UUID
    name: str
    description: str
    icon: str
    trigger_rule: str
    awarded_at: datetime


class AchievementListResponse(BaseModel):
    achievements: list[AchievementItemResponse]


class GamificationSummaryResponse(BaseModel):
    xp: XPSummaryResponse
    coins: CoinBalanceResponse
    streak: StreakResponse
    active_xp_boost: ActiveXPBoostResponse | None = None
    recent_achievements: list[AchievementItemResponse]
