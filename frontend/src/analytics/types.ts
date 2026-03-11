export type RawOverview = {
  pass_probability_final?: number | null;
  pass_probability?: number | null;
  pass_probability_ml?: number | null;
  ml_status?: "rule_only" | "ml_active" | null;
  readiness_score?: number | null;
  best_score?: number | null;
  training_level?: string | null;
  current_training_level?: string | null;
  cognitive_stability?: string | null;
  average_score?: number | null;
  improvement_delta?: number | null;
  total_attempts?: number | null;
};

export type RawCategory = {
  id?: string | null;
  category_id?: string | null;
  category?: string | null;
  topic?: string | null;
  accuracy?: number | null;
  total?: number | null;
  total_questions?: number | null;
  seen_questions?: number | null;
  question_count?: number | null;
  attempts?: number | null;
  attempts_count?: number | null;
  covered_questions?: number | null;
  coverage?: number | null;
};

export type RawDifficultyPoint = {
  test_index?: number | null;
  average_difficulty?: number | null;
  difficulty?: number | null;
  value?: number | null;
};

export type RawDashboardResponse = {
  overview?: RawOverview | null;
  recommendation?: {
    topic?: string | null;
    accuracy?: number | null;
    action_label?: string | null;
  } | null;
  lesson_recommendations?:
  | Array<{
    lesson_id?: string | null;
    title?: string | null;
    reason?: string | null;
    topic?: string | null;
    content_type?: string | null;
  }>
  | null;
  question_bank_mastery?: {
    total_questions?: number | null;
    seen_questions?: number | null;
    correct_questions?: number | null;
    mastered_questions?: number | null;
    needs_review_questions?: number | null;
  } | null;
  pass_probability_breakdown?: {
    explanation?: string | null;
    factors?:
    | Array<{
      key?: string | null;
      label?: string | null;
      weight?: number | null;
      score?: number | null;
      weighted_score?: number | null;
    }>
    | null;
  } | null;
  category_performance?: RawCategory[] | null;
  topic_breakdown?: RawCategory[] | null;
  recent_scores?: Array<number | null> | null;
  difficulty_progression?: RawDifficultyPoint[] | null;
  weak_topics?: RawCategory[] | null;
  progress_trend?: Array<{ label?: string | null; value?: number | null }> | null;
  test_activity?: Array<{ label?: string | null; tests_count?: number | null }> | null;
};

export type RawFunnelResponse = {
  pass_probability?: number | null;
};

export type RawSummaryResponse = {
  total_attempts?: number | null;
  average_score?: number | null;
};

export type ScoreTrendPoint = {
  testIndex: number;
  score: number;
};

export type DifficultyPoint = {
  testIndex: number;
  averageDifficulty: number;
};

export type CategoryMetric = {
  id?: string;
  category: string;
  accuracy: number;
  coverage: number | null;
  attempts: number | null;
};

export type RecommendationReasoning =
  | "lowest_accuracy"
  | "low_coverage"
  | "practice_recommended";

export type RecommendationInsight = {
  topic: string | null;
  accuracy: number | null;
  coverage: number | null;
  attempts: number | null;
  reasoning: RecommendationReasoning | null;
  priorityScore: number | null;
  explanation: string;
  categoryId: string | null;
  normalizedTopicKey: string | null;
  actionLabel: string | null;
};

export type ActivityPoint = {
  label: string;
  tests_count: number;
};

export type DashboardAnalyticsViewModel = {
  passProbability: number;
  passProbabilityMl: number | null;
  mlStatus: "rule_only" | "ml_active";
  readinessScore: number;
  bestScore: number;
  trainingLevel: string;
  cognitiveStability: string;
  averageScore: number;
  improvementDelta: number;
  totalAttempts: number;
  scoreTrend: ScoreTrendPoint[];
  categoryMetrics: CategoryMetric[];
  weakTopicMetrics: CategoryMetric[];
  difficultyProgression: DifficultyPoint[];
  recommendation: RecommendationInsight;
  lessonRecommendations: Array<{
    lessonId: string;
    title: string;
    reason: string;
    topic: string | null;
    contentType: string | null;
  }>;
  questionBankMastery: {
    totalQuestions: number;
    seenQuestions: number;
    correctQuestions: number;
    masteredQuestions: number;
    needsReviewQuestions: number;
  };
  passBreakdown: {
    explanation: string;
    factors: Array<{
      key: string;
      label: string;
      weight: number;
      score: number;
      weightedScore: number;
    }>;
  };
  testActivity: ActivityPoint[];
  isEmptyState: boolean;
};
