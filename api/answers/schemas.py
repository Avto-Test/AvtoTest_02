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
