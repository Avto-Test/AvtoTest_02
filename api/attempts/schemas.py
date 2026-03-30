"""
AUTOTEST Attempts Schemas
Pydantic models for attempt endpoints
"""

from uuid import UUID

from pydantic import BaseModel, Field

from api.ai_coach.schemas import AiCoachPayload
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
    attempt_mode: str = "standard"
    attempts_used_today: int | None = None
    attempts_limit: int | None = None
    attempts_remaining: int | None = None


class AdaptiveStartResponse(StartAttemptResponse):
    """Schema for starting adaptive attempt with questions."""
    pass


class AnswerResponse(BaseModel):
    """Schema for answer response."""
    id: UUID
    question_id: UUID
    selected_option_id: UUID
    accepted: bool = True

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
    visited_question_ids: list[UUID] | None = None


class DetailedAnswer(BaseModel):
    """Schema for detailed answer info in response."""
    question_id: UUID
    selected_option_id: UUID
    correct_option_id: UUID
    is_correct: bool
    dynamic_difficulty_score: float = 0.5
    correct_answer: str | None = None
    explanation: str | None = None
    ai_coach: AiCoachPayload | None = None
    recommendations: list[str] = Field(default_factory=list)


class RewardAchievement(BaseModel):
    """Schema for unlocked achievements returned with attempt rewards."""
    id: UUID | None = None
    name: str
    icon: str | None = None


class RewardSummary(BaseModel):
    """Schema for reward deltas granted after an attempt."""
    xp_awarded: int = 0
    coins_awarded: int = 0
    achievements: list[RewardAchievement] = []


class BulkSubmitResponse(BaseModel):
    """Schema for rich bulk submission response."""
    score: int
    total: int
    reviewed_count: int
    answered_count: int
    unanswered_count: int
    correct_count: int
    mistakes_count: int
    completed_all: bool = True
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
    mistake_limit: int | None = None
    violation_count: int | None = None
    violation_limit: int | None = None
    disqualified: bool = False
    disqualification_reason: str | None = None
    reward_summary: RewardSummary | None = None

