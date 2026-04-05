import type { DetailedAnswer, PublicQuestion } from "@/types/test";

export interface SimulationStartResponse {
  id: string;
  question_count: number;
  duration_minutes: number;
  questions: PublicQuestion[];
  scheduled_at: string;
  started_at?: string | null;
  attempt_mode: "simulation";
  pressure_mode: boolean;
  mistake_limit: number;
  mistake_count: number;
  violation_limit: number;
  violation_count: number;
  disqualified: boolean;
  disqualification_reason?: string | null;
  saved_answers: DetailedAnswer[];
}

export interface SimulationHistoryItem {
  attempt_id: string;
  date: string;
  question_count: number;
  score: number;
  mistakes: number;
  violation_count: number;
  pass_probability_snapshot: number;
  passed: boolean;
  disqualified: boolean;
  disqualification_reason?: string | null;
}

export interface SimulationHistoryResponse {
  items: SimulationHistoryItem[];
}
