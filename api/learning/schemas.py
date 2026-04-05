"""
AUTOTEST Learning API schemas.
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from api.tests.schemas import PublicQuestion


class CreateLearningSessionRequest(BaseModel):
    question_count: Literal[20, 30, 40] = Field(default=20)
    topic_preferences: list[str] = Field(default_factory=list, max_length=6)


class LearningSessionResponse(BaseModel):
    session_id: UUID
    question_count: int
    duration_minutes: int
    questions: list[PublicQuestion]

    model_config = ConfigDict(from_attributes=True)
