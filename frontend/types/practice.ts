import type { GamificationSummary } from "@/types/gamification";
import type { AttemptRewardAchievement } from "@/types/test";

export interface LiveAnswerSubmission {
  answer_id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string;
  correct_option_id: string;
  is_correct: boolean;
  locked: boolean;
  already_answered: boolean;
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
