"""Schemas for live gamification rewards."""

from uuid import UUID

from pydantic import BaseModel

from api.attempts.schemas import RewardAchievement
from api.users.schemas import GamificationSummaryResponse


class RewardQuestionRequest(BaseModel):
    attempt_id: UUID
    question_id: UUID


class RewardQuestionResponse(BaseModel):
    question_id: UUID
    xp_awarded: int = 0
    coins_awarded: int = 0
    achievements: list[RewardAchievement] = []
    gamification: GamificationSummaryResponse
