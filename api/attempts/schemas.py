"""
AUTOTEST Attempts Schemas
Pydantic models for attempt endpoints
"""

from uuid import UUID

from pydantic import BaseModel


class StartAttempt(BaseModel):
    """Schema for starting a new attempt."""
    test_id: UUID


class SubmitAnswer(BaseModel):
    """Schema for submitting an answer."""
    attempt_id: UUID
    question_id: UUID
    selected_option_id: UUID


class FinishAttempt(BaseModel):
    """Schema for finishing an attempt."""
    attempt_id: UUID


class AttemptResponse(BaseModel):
    """Schema for attempt response."""
    id: UUID
    test_id: UUID
    score: int
    started_at: str
    finished_at: str | None = None

    class Config:
        from_attributes = True


class AnswerResponse(BaseModel):
    """Schema for answer response."""
    id: UUID
    question_id: UUID
    selected_option_id: UUID
    is_correct: bool

    class Config:
        from_attributes = True


class ScoreResponse(BaseModel):
    """Schema for final score response."""
    attempt_id: UUID
    score: int
    total_questions: int
    finished_at: str
