import { apiRequest } from "@/api/client";
import type { CoachExplanation } from "@/types/practice";

export function getCoachExplanation(attemptId: string, questionId: string) {
  return apiRequest<CoachExplanation>("/ai-coach/explanation", {
    method: "GET",
    query: {
      attempt_id: attemptId,
      question_id: questionId,
    },
    baseUrl: "/api",
  });
}
