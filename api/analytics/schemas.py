"""
AUTOTEST Analytics Schemas
Pydantic schemas for analytics endpoints
"""

from __future__ import annotations

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
    readiness_label: str | None = None
    pass_probability: float = 0.0 # 0-100
    pass_prediction_label: str = "Xavf yuqori"
    signal_kind: str | None = None
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
    kind: str = "general_practice"
    reason: str | None = None
    question_count: int = 8


class RewardRange(BaseModel):
    min_coins: int
    max_coins: int


class RewardPolicyPreview(BaseModel):
    learning_path_answer: RewardRange
    learning_path_step: RewardRange
    learning_path_perfect_bonus: int
    regular_test_answer: RewardRange
    regular_test_completion_bonus: int = 0


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


class TrendPoint(BaseModel):
    label: str
    value: float


class ActivityPoint(BaseModel):
    label: str
    tests_count: int


class TestBankMastery(BaseModel):
    total_questions: int = 0
    seen_questions: int = 0
    correct_questions: int = 0
    mastered_questions: int = 0
    needs_review_questions: int = 0


class SimulationStatus(BaseModel):
    cooldown_days: int
    cooldown_progress: float
    cooldown_remaining_seconds: int
    next_available_at: datetime | None = None
    last_simulation_at: datetime | None = None
    readiness_gate_score: float
    readiness_ready: bool
    cooldown_ready: bool
    launch_ready: bool
    fast_unlock_active: bool = False
    fast_unlock_expires_at: datetime | None = None
    unlock_source: str | None = None
    recommended_question_count: int = 40
    recommended_pressure_mode: bool = True
    label: str
    readiness_threshold: float = 70.0
    pass_threshold: float = 65.0
    lock_reasons: list[str] = []
    warning_message: str | None = None


class PassProbabilityFactor(BaseModel):
    key: str
    label: str
    weight: float = Field(ge=0, le=100)
    score: float = Field(ge=0, le=100)
    weighted_score: float = Field(ge=0, le=100)


class PassProbabilityBreakdown(BaseModel):
    explanation: str
    factors: list[PassProbabilityFactor]


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
    pass_probability: float  # 0-100
    probability_source: str  # compatibility field; now returns non-ML readiness source
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
    progress_trend: list[TrendPoint] = []
    test_activity: list[ActivityPoint] = []
    question_bank_mastery: TestBankMastery = Field(default_factory=TestBankMastery)
    simulation_status: SimulationStatus | None = None
    pass_probability_breakdown: PassProbabilityBreakdown | None = None
    reward_policy: RewardPolicyPreview


# ========== Admin Analytics ==========

class AdminMetricTrendSnapshot(BaseModel):
    """Simple current-vs-previous metric window snapshot for lightweight trend analysis."""

    current: float = Field(..., description="Metric value in the current UTC day window.")
    previous: float = Field(..., description="Metric value in the previous UTC day window.")
    sample_size_current: int | None = Field(
        default=None,
        description="Optional sample size supporting the current window value.",
    )
    sample_size_previous: int | None = Field(
        default=None,
        description="Optional sample size supporting the previous window value.",
    )


class AdminCategoryPerformanceItem(BaseModel):
    category: str
    accuracy: float = Field(..., ge=0, le=100)
    attempts: int = Field(..., ge=0)
    question_count: int = Field(..., ge=0)


class AdminGrowthConversionRates(BaseModel):
    """Core funnel conversion rates expressed in percent on a 0-100 scale."""

    activation_rate: float = Field(
        ...,
        ge=0,
        le=100,
        description="Active users divided by registered users.",
    )
    engagement_rate: float = Field(
        ...,
        ge=0,
        le=100,
        description="Engaged users divided by active users.",
    )
    payment_rate: float = Field(
        ...,
        ge=0,
        le=100,
        description="Successful payers divided by engaged users.",
    )


class AdminGrowthDropOffs(BaseModel):
    """Raw user-count drop-offs between key funnel stages."""

    registration_to_activity: int = Field(..., ge=0)
    activity_to_engagement: int = Field(..., ge=0)
    engagement_to_premium_click: int = Field(..., ge=0)
    engagement_to_payment: int = Field(..., ge=0)


class AdminGrowthSummary(BaseModel):
    """Backend-driven growth funnel snapshot for admin conversion analysis."""

    registered_users: int = Field(
        ...,
        ge=0,
        description="Count of users created in the selected window.",
    )
    active_users: int = Field(
        ...,
        ge=0,
        description="Distinct users with at least one session attempt started in the selected window.",
    )
    engaged_users: int = Field(
        ...,
        ge=0,
        description="Distinct users with two or more session attempts started in the selected window.",
    )
    premium_clicks: int = Field(
        ...,
        ge=0,
        description="Distinct signed-in users who triggered an upgrade click in the selected window.",
    )
    successful_payments: int = Field(
        ...,
        ge=0,
        description="Distinct users with at least one successful payment in the selected window.",
    )
    conversion_rates: AdminGrowthConversionRates
    drop_offs: AdminGrowthDropOffs


class AdminExperimentVariantSummary(BaseModel):
    """Variant-level experiment outcome summary."""

    assigned_users: int = Field(..., ge=0)
    clicks: int = Field(..., ge=0)
    payments: int = Field(..., ge=0)
    conversion_rate: float = Field(..., ge=0, le=100)


class AdminExperimentSummary(BaseModel):
    """Admin-facing A/B experiment performance snapshot."""

    experiment: str = Field(..., min_length=1)
    winner: str | None = Field(default=None, description="Winning variant when significance rules are met.")
    confidence_level: str = Field(..., min_length=1)
    recommendation: str = Field(..., min_length=1)
    days_running: int = Field(..., ge=0)
    minimum_duration_met: bool
    minimum_sample_met: bool
    variant_A: AdminExperimentVariantSummary
    variant_B: AdminExperimentVariantSummary


class AdminAnalyticsSummary(BaseModel):
    """Canonical admin KPI snapshot sourced only from backend database aggregations."""

    total_users: int = Field(..., description="Count of all rows in the users table.")
    active_users: int = Field(
        ...,
        description="Count of users where users.is_active = TRUE.",
    )
    premium_users: int = Field(
        ...,
        description="Count of distinct users with an active paid subscription where plan != free.",
    )
    total_questions: int = Field(
        ...,
        description="Count of all question-bank rows in the questions table.",
    )
    total_applications: int = Field(
        ...,
        description="Combined count of driving school partner applications and instructor applications.",
    )
    pending_applications: int = Field(
        ...,
        description="Combined count of marketplace applications currently in PENDING status.",
    )
    new_leads: int = Field(
        ...,
        description="Combined count of school and instructor leads created in the last 7 days.",
    )
    average_accuracy: float | None = Field(
        default=None,
        description=(
            "Average percentage score across completed learning attempts in the current UTC day window."
        ),
    )
    accuracy_trend: AdminMetricTrendSnapshot | None = Field(
        default=None,
        description="Current UTC day accuracy snapshot compared with the previous UTC day.",
    )
    active_users_trend: AdminMetricTrendSnapshot | None = Field(
        default=None,
        description=(
            "Distinct users with completed learning activity in the current UTC day compared with the previous UTC day."
        ),
    )
    applications_trend: AdminMetricTrendSnapshot | None = Field(
        default=None,
        description="Combined application inflow in the current UTC day compared with the previous UTC day.",
    )
    category_performance: list[AdminCategoryPerformanceItem] = Field(
        default_factory=list,
        description="Weakest question-bank categories by answer accuracy.",
    )
    monetization: "AdminMonetizationSummary | None" = Field(
        default=None,
        description="Premium conversion and feature monetization KPIs.",
    )


class AnalyticsTrackRequest(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100)
    feature_key: str | None = Field(default=None, max_length=100)
    metadata: dict = Field(default_factory=dict)


class FeatureFunnelResponse(BaseModel):
    views: int = Field(..., ge=0)
    clicks: int = Field(..., ge=0)
    purchases: int = Field(..., ge=0)
    conversion_rate: float = Field(..., ge=0, le=100)


class FeatureAnalyticsTimeSeriesPoint(BaseModel):
    date: str = Field(..., min_length=1)
    views: int = Field(..., ge=0)
    clicks: int = Field(..., ge=0)
    purchases: int = Field(..., ge=0)


class PricingInsight(BaseModel):
    signal: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)


class SuggestedPriceRange(BaseModel):
    min: float = Field(..., ge=0)
    max: float = Field(..., ge=0)


class MonetizationInsightItem(BaseModel):
    feature: str = Field(..., min_length=1)
    feature_name: str = Field(..., min_length=1)
    problem: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    recommendation: str = Field(..., min_length=1)
    current_price: float | None = Field(default=None, ge=0)
    suggested_price_range: SuggestedPriceRange
    last_price_analysis_at: datetime | None = None


class FeaturePerformanceItem(BaseModel):
    feature_key: str = Field(..., min_length=1)
    feature_name: str = Field(..., min_length=1)
    usage_count: int = Field(..., ge=0)
    lock_views: int = Field(..., ge=0)
    upgrade_clicks: int = Field(..., ge=0)
    purchases: int = Field(..., ge=0)
    last_7_days_clicks: int = Field(..., ge=0)
    conversion_rate: float = Field(..., ge=0, le=100)
    current_price: float | None = Field(default=None, ge=0)
    suggested_price_min: float | None = Field(default=None, ge=0)
    suggested_price_max: float | None = Field(default=None, ge=0)
    last_price_analysis_at: datetime | None = None
    pricing_insight: PricingInsight


class AdminMonetizationSummary(BaseModel):
    total_premium_conversions: int = Field(..., ge=0)
    overall_conversion_rate: float = Field(..., ge=0, le=100)
    top_performing_feature: str | None = None
    drop_off_rate: float = Field(..., ge=0, le=100)
    funnel: FeatureFunnelResponse
    daily_conversions: list[FeatureAnalyticsTimeSeriesPoint] = Field(default_factory=list)
    feature_performance: list[FeaturePerformanceItem] = Field(default_factory=list)


AdminAnalyticsSummary.model_rebuild()
AdminGrowthSummary.model_rebuild()
AdminExperimentSummary.model_rebuild()
