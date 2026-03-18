"""
AUTOTEST Leaderboard Schemas
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

LeaderboardPeriod = Literal["daily", "weekly", "monthly"]


class LeaderboardEntryResponse(BaseModel):
    rank: int
    user_id: UUID
    display_name: str
    xp_gained: int
    is_current_user: bool = False


class LeaderboardResponse(BaseModel):
    period: LeaderboardPeriod
    captured_at: datetime
    users: list[LeaderboardEntryResponse]


class MyLeaderboardResponse(BaseModel):
    period: LeaderboardPeriod
    captured_at: datetime
    rank: int | None
    xp_gained: int
