"""
AUTOTEST Analytics Schemas
Pydantic schemas for analytics endpoints
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ========== User Analytics ==========

class UserAttemptSummary(BaseModel):
    """Summary of a user's attempt."""
    id: UUID
    test_title: str
    score: int
    finished_at: datetime | None

    model_config = {"from_attributes": True}


class UserAnalyticsSummary(BaseModel):
    """Summary of user's overall performance."""
    total_attempts: int
    average_score: float
    last_attempts: list[UserAttemptSummary]


class UserTestAnalytics(BaseModel):
    """User's performance on a specific test."""
    test_id: UUID
    title: str
    attempts_count: int
    best_score: int
    average_score: float


# ========== Admin Analytics ==========

class AdminAnalyticsSummary(BaseModel):
    """Global platform statistics."""
    total_users: int
    premium_users: int
    free_users: int
    total_tests: int
    total_attempts: int


class TopTestAnalytics(BaseModel):
    """Analytics for a specific test (admin view)."""
    test_id: UUID
    title: str
    attempts_count: int
    average_score: float
