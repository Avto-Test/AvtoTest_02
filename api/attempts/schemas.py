"""
AUTOTEST Attempts Schemas
Pydantic models for attempt endpoints
"""

from uuid import UUID

from pydantic import BaseModel

from api.tests.schemas import PublicQuestion


class StartAttempt(BaseModel):
    """Schema for starting a new attempt."""
    test_id: UUID
    pressure_mode: bool = False
    question_count: int | None = None


class SubmitAnswer(BaseModel):
    """Schema for submitting an answer."""
    attempt_id: UUID
    question_id: UUID
    selected_option_id: UUID


class FinishAttempt(BaseModel):
    """Schema for finishing an attempt."""
    attempt_id: UUID


class GuestStartAttempt(BaseModel):
    """Schema for starting a new guest attempt."""
    test_id: UUID


class GuestSubmitAnswer(BaseModel):
    """Schema for submitting a guest answer."""
    attempt_id: UUID
    question_id: UUID
    selected_option_id: UUID


class GuestFinishAttempt(BaseModel):
    """Schema for finishing a guest attempt."""
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


class StartAttemptResponse(AttemptResponse):
    """Schema for starting a standard attempt with selected questions."""
    question_count: int
    duration_minutes: int
    questions: list[PublicQuestion]


class AdaptiveStartResponse(StartAttemptResponse):
    """Schema for starting adaptive attempt with questions."""
    pass


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


class BulkSubmit(BaseModel):
    """Schema for bulk answer submission."""
    attempt_id: UUID
    answers: dict[UUID, UUID]  # question_id -> selected_option_id
    response_times: list[int] = [] # response time in ms per question


class DetailedAnswer(BaseModel):
    """Schema for detailed answer info in response."""
    question_id: UUID
    selected_option_id: UUID
    correct_option_id: UUID
    is_correct: bool
    dynamic_difficulty_score: float = 0.5


class BulkSubmitResponse(BaseModel):
    """Schema for rich bulk submission response."""
    score: int
    total: int
    correct_count: int
    mistakes_count: int
    passed: bool
    finished_at: str
    answers: list[DetailedAnswer]
    answers_unlocked: bool = True
    unlock_reason: str | None = None
    is_adaptive: bool = False
    training_level: str | None = None
    pass_prediction_label: str | None = None
    skill_messages: list[str] = []
    fading_topics: list[str] = []
    topic_stability: dict[str, str] = {}
    
    # Phase 11 Cognitive Metrics
    avg_response_time: float | None = None
    cognitive_profile: str | None = None
    pressure_mode: bool = False

