export interface AnalyticsOverview {
  total_attempts: number;
  average_score: number;
  best_score: number;
  improvement_delta: number;
  improvement_direction: "up" | "down" | "stable";
  current_training_level: string;
  readiness_score: number;
  pass_probability: number;
  pass_prediction_label: string;
  adaptive_intelligence_strength: number;
  total_due: number;
  avg_response_time?: number | null;
  cognitive_stability?: string | null;
  pressure_resilience?: number;
  pass_probability_ml?: number | null;
  pass_probability_rule?: number | null;
  pass_probability_final?: number | null;
  confidence_score?: number | null;
  model_version?: string | null;
  ml_status?: string | null;
}

export interface TopicAccuracy {
  topic: string;
  accuracy: number;
}

export interface Recommendation {
  topic?: string | null;
  accuracy?: number | null;
  action_label?: string | null;
  kind: "repeated_mistake" | "weak_topic" | "general_practice";
  reason?: string | null;
  question_count: number;
}

export interface RewardRange {
  min_coins: number;
  max_coins: number;
}

export interface RewardPolicyPreview {
  learning_path_answer: RewardRange;
  learning_path_step: RewardRange;
  learning_path_perfect_bonus: number;
  regular_test_answer: RewardRange;
  regular_test_completion_bonus: number;
}

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
  retention: number;
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

export interface TrendPoint {
  label: string;
  value: number;
}

export interface ActivityPoint {
  label: string;
  tests_count: number;
}

export interface TestBankMastery {
  total_questions: number;
  seen_questions: number;
  correct_questions: number;
  mastered_questions: number;
  needs_review_questions: number;
}

export interface SimulationStatus {
  cooldown_days: number;
  cooldown_progress: number;
  cooldown_remaining_seconds: number;
  next_available_at?: string | null;
  last_simulation_at?: string | null;
  readiness_gate_score: number;
  readiness_ready: boolean;
  cooldown_ready: boolean;
  launch_ready: boolean;
  fast_unlock_active: boolean;
  fast_unlock_expires_at?: string | null;
  unlock_source?: "learning_path" | "coins" | null;
  recommended_question_count: number;
  recommended_pressure_mode: boolean;
  label: string;
  readiness_threshold: number;
  pass_threshold: number;
  lock_reasons: string[];
  warning_message?: string | null;
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

export interface DashboardAnalytics {
  overview: AnalyticsOverview;
  recommendation: Recommendation;
  recent_scores: number[];
  topic_breakdown: TopicAccuracy[];
  skill_vector: TopicSkill[];
  knowledge_mastery: KnowledgeMastery[];
  retention_vector: TopicRetention[];
  lesson_recommendations: LessonRecommendation[];
  progress_trend: TrendPoint[];
  test_activity: ActivityPoint[];
  question_bank_mastery: TestBankMastery;
  simulation_status?: SimulationStatus | null;
  reward_policy: RewardPolicyPreview;
}

export interface AttemptSummary {
  id: string;
  test_title: string;
  score: number;
  finished_at: string | null;
}

export interface AnalyticsSummary {
  total_attempts: number;
  average_score: number;
  last_attempts: AttemptSummary[];
}

export interface IntelligenceHistoryEntry {
  attempt_id: string;
  date: string;
  score: number;
  pass_probability: number;
  probability_source?: string;
  confidence: number;
  readiness_score: number;
  cognitive_stability: number;
  retention_score: number;
  drift_state: string;
  model_version?: string | null;
}
