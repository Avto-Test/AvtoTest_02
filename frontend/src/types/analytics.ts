import type { UserAttemptSummary } from "@/schemas/analytics.schema";

export interface AnalyticsOverview {
    total_attempts: number;
    passed_attempts: number;
    failed_attempts: number;
    pass_rate?: number;
    average_score: number;
    best_score: number;
    last_5_scores?: number[];
    improvement_delta: number;
    improvement_direction: "up" | "down" | "stable";
    current_training_level: "beginner" | "intermediate" | "advanced";
    readiness_score: number;
    pass_probability: number;
    pass_prediction_label: string;
    adaptive_intelligence_strength: number;
    total_due: number;
    confidence_score?: number;
    ml_status?: string;
    drift_status?: string;
    model_version?: string;
    last_retrained?: string;
    inference_latency?: number;
    cognitive_stability?: string | null;
    avg_response_time?: number | null;
    pressure_resilience?: number;
    last_attempts?: UserAttemptSummary[];
}

export interface TopicAccuracy {
    topic: string;
    total: number;
    correct: number;
    accuracy: number;
}

export interface Recommendation {
    topic: string;
    accuracy: number;
    action_label: string;
}

export type TopicRecommendation = Recommendation;

export interface TopicSkill {
    topic: string;
    skill: number;
}

export interface KnowledgeMastery {
    topic: string;
    probability: number;
}

export interface TopicRetention {
    topic: string;
    retention: number; // 0.0 - 1.0
}

export interface DueTopic {
    topic: string;
    next_review_at: string;
    retention_score: number;
    bkt_prob: number;
}

export interface ReviewQueueResponse {
    due_topics: DueTopic[];
    total_due: number;
}

export interface DashboardResponse {
    overview: AnalyticsOverview;
    recommendation: Recommendation;
    recent_scores: number[];
    topic_breakdown: TopicAccuracy[];
    skill_vector: TopicSkill[];
    knowledge_mastery: KnowledgeMastery[];
    retention_vector: TopicRetention[];
    lesson_recommendations: LessonRecommendation[];
}

export interface LessonRecommendation {
    lesson_id: string;
    title: string;
    content_type: string;
    content_url: string;
    topic?: string | null;
    section?: string | null;
    reason: string;
    match_score: number;
}

