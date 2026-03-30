"""Schemas for locked answer submission."""

from uuid import UUID

from pydantic import BaseModel, Field

from api.ai_coach.schemas import AiCoachPayload
from api.tests.schemas import PublicAnswerOption


class SubmitLockedAnswerRequest(BaseModel):
    attempt_id: UUID
    question_id: UUID
    selected_option_id: UUID
    response_time_ms: int | None = Field(default=None, ge=0)


class SubmitLockedAnswerResponse(BaseModel):
    answer_id: UUID
    attempt_id: UUID
    question_id: UUID
    question: str
    options: list[PublicAnswerOption]
    selected_option_id: UUID
    correct_option_id: UUID
    is_correct: bool
    correct_answer: str
    explanation: str
    ai_coach: AiCoachPayload
    recommendations: list[str] = Field(default_factory=list)
    locked: bool = True
    already_answered: bool = False
    mistake_count: int = 0
    mistake_limit: int = 0
    violation_count: int = 0
    violation_limit: int = 0
    attempt_finished: bool = False
    passed: bool | None = None
    disqualified: bool = False
    disqualification_reason: str | None = None
