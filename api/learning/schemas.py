"""
AUTOTEST Learning API schemas.
"""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from api.tests.schemas import PublicQuestion


class CreateLearningSessionRequest(BaseModel):
    question_count: int = Field(default=20, ge=10, le=50)


class LearningSessionResponse(BaseModel):
    session_id: UUID
    questions: list[PublicQuestion]

    model_config = ConfigDict(from_attributes=True)
