"""Schemas for locked answer submission."""

from uuid import UUID

from pydantic import BaseModel, Field


class SubmitLockedAnswerRequest(BaseModel):
    attempt_id: UUID
    question_id: UUID
    selected_option_id: UUID
    response_time_ms: int | None = Field(default=None, ge=0)


class SubmitLockedAnswerResponse(BaseModel):
    answer_id: UUID
    attempt_id: UUID
    question_id: UUID
    selected_option_id: UUID
    correct_option_id: UUID
    is_correct: bool
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
