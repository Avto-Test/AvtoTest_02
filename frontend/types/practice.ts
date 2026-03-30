import type { GamificationSummary } from "@/types/gamification";
import type { AiCoachFeedback, AttemptRewardAchievement, PublicAnswerOption } from "@/types/test";

export interface LiveAnswerSubmission {
  answer_id: string;
  attempt_id: string;
  question_id: string;
  question: string;
  options: PublicAnswerOption[];
  selected_option_id: string;
  correct_option_id: string;
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  ai_coach: AiCoachFeedback;
  recommendations: string[];
  locked: boolean;
  already_answered: boolean;
  mistake_count: number;
  mistake_limit: number;
  violation_count: number;
  violation_limit: number;
  attempt_finished: boolean;
  passed?: boolean | null;
  disqualified: boolean;
  disqualification_reason?: string | null;
}

export interface LiveRewardResponse {
  question_id: string;
  xp_awarded: number;
  coins_awarded: number;
  achievements: AttemptRewardAchievement[];
  gamification: GamificationSummary;
}

export interface CoachExplanation {
  title: string;
  explanation: string;
  selected_feedback?: string | null;
  driving_tip: string;
  motivation: string;
}
