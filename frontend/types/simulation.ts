import type { PublicQuestion } from "@/types/test";

export interface SimulationStartResponse {
  id: string;
  question_count: number;
  duration_minutes: number;
  questions: PublicQuestion[];
  scheduled_at: string;
  started_at?: string | null;
  attempt_mode: "simulation";
}

export interface SimulationHistoryItem {
  attempt_id: string;
  date: string;
  score: number;
  mistakes: number;
  pass_probability_snapshot: number;
  passed: boolean;
}

export interface SimulationHistoryResponse {
  items: SimulationHistoryItem[];
}
