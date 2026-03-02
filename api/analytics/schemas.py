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


class AnalyticsOverview(BaseModel):
    total_attempts: int
    average_score: float
    best_score: float
    improvement_delta: float
    improvement_direction: str  # "up" | "down" | "stable"
    current_training_level: str # "beginner" | "intermediate" | "advanced"
    readiness_score: float = 0.0 # 0-100
    pass_probability: float = 0.0 # 0-100
    pass_prediction_label: str = "High Risk of Failing"
    adaptive_intelligence_strength: float = 0.0 # 0-100
    total_due: int = 0
    
    # Phase 11 Cognitive Metrics
    avg_response_time: float | None = None
    cognitive_stability: str | None = None
    pressure_resilience: float = 0.0
    
    # Phase 12 Hybrid ML Metrics
    pass_probability_ml: float | None = None
    pass_probability_rule: float | None = None
    pass_probability_final: float | None = None
    confidence_score: float | None = None
    model_version: str | None = None
    ml_status: str | None = None # "active" | "fallback" | "insufficient_data"

    model_config = {"protected_namespaces": ()}


class TopicAccuracy(BaseModel):
    topic: str
    accuracy: float


class Recommendation(BaseModel):
    topic: str | None = None
    accuracy: float | None = None
    action_label: str | None = None


class LessonRecommendation(BaseModel):
    lesson_id: UUID
    title: str
    content_type: str
    content_url: str
    topic: str | None = None
    section: str | None = None
    reason: str
    match_score: float


class TopicSkill(BaseModel):
    topic: str
    skill: float # 0-100


class KnowledgeMastery(BaseModel):
    topic: str
    probability: float # 0-100


class TopicRetention(BaseModel):
    topic: str
    retention: float # 0.0-1.0


class DueTopic(BaseModel):
    topic: str
    next_review_at: str
    retention_score: float
    bkt_prob: float


class ReviewQueueResponse(BaseModel):
    due_topics: list[DueTopic]
    total_due: int


class IntelligenceSnapshot(BaseModel):
    """Historical intelligence data for an attempt."""
    attempt_id: UUID
    date: datetime
    score: float
    pass_probability: float  # Clamped [0,1]
    probability_source: str  # "ml" | "rule"
    confidence: float
    readiness_score: float
    cognitive_stability: float
    retention_score: float
    drift_state: str  # "stable" | "monitoring" | "severe"
    model_version: str | None

    model_config = {"from_attributes": True, "protected_namespaces": ()}


class DashboardResponse(BaseModel):
    overview: AnalyticsOverview
    recommendation: Recommendation
    recent_scores: list[int]
    topic_breakdown: list[TopicAccuracy]
    skill_vector: list[TopicSkill] = []
    knowledge_mastery: list[KnowledgeMastery] = []
    retention_vector: list[TopicRetention] = []
    lesson_recommendations: list[LessonRecommendation] = []


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
