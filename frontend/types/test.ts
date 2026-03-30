export interface PublicAnswerOption {
  id: string;
  text: string;
}

export interface AiCoachFeedback {
  tip: string;
  mistake_analysis: string;
  recommendation: string;
}

export interface AnswerReviewFields {
  correct_answer?: string | null;
  explanation?: string | null;
  ai_coach?: AiCoachFeedback | null;
  recommendations?: string[];
}

export interface PublicQuestion {
  id: string;
  text: string;
  difficulty_percent?: number | null;
  image_url?: string | null;
  video_url?: string | null;
  media_type?: string | null;
  topic?: string | null;
  category?: string | null;
  difficulty?: string | null;
  answer_options: PublicAnswerOption[];
}

export interface TestListItem {
  id: string;
  title: string;
  description?: string | null;
  difficulty: string;
  is_premium: boolean;
  duration?: number | null;
  question_count: number;
  created_at: string;
}

export interface TestDetail extends TestListItem {
  questions: PublicQuestion[];
}

export interface TestSession {
  id: string;
  test_id: string;
  score: number;
  started_at: string;
  finished_at: string | null;
  questions: PublicQuestion[];
  question_count: number;
  duration_minutes: number;
  attempt_mode?: string;
  attempts_used_today?: number | null;
  attempts_limit?: number | null;
  attempts_remaining?: number | null;
}

export interface LearningSession {
  session_id: string;
  question_count: number;
  duration_minutes: number;
  questions: PublicQuestion[];
}

export interface DetailedAnswer extends AnswerReviewFields {
  question_id: string;
  selected_option_id: string;
  correct_option_id: string;
  is_correct: boolean;
  dynamic_difficulty_score?: number;
}

export interface AttemptRewardAchievement {
  id?: string | null;
  name: string;
  icon?: string | null;
}

export interface AttemptRewardSummary {
  xp_awarded: number;
  coins_awarded: number;
  achievements: AttemptRewardAchievement[];
}

export interface AttemptResult {
  score: number;
  total: number;
  reviewed_count?: number;
  answered_count?: number;
  unanswered_count?: number;
  correct_count: number;
  mistakes_count: number;
  completed_all?: boolean;
  passed: boolean;
  finished_at: string;
  answers: DetailedAnswer[];
  answers_unlocked: boolean;
  unlock_reason?: string | null;
  is_adaptive?: boolean;
  training_level?: string | null;
  pass_prediction_label?: string | null;
  skill_messages: string[];
  fading_topics: string[];
  topic_stability: Record<string, string>;
  avg_response_time?: number | null;
  cognitive_profile?: string | null;
  pressure_mode?: boolean;
  mistake_limit?: number | null;
  violation_count?: number | null;
  violation_limit?: number | null;
  disqualified?: boolean;
  disqualification_reason?: string | null;
  reward_summary?: AttemptRewardSummary | null;
}

export interface FreeTestStatus {
  attempts_used_today: number;
  attempts_limit: number;
  attempts_remaining: number;
  limit_reached: boolean;
  is_premium: boolean;
}
