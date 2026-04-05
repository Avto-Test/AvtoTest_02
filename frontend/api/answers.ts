import { apiRequest } from "@/api/client";
import type { LiveAnswerSubmission } from "@/types/practice";

type SubmitLockedAnswerPayload = {
  attempt_id: string;
  question_id: string;
  selected_option_id: string;
  response_time_ms?: number;
};

export function submitLockedAnswer(payload: SubmitLockedAnswerPayload) {
  return apiRequest<LiveAnswerSubmission>("/answers/submit", {
    method: "POST",
    body: payload,
    baseUrl: "/api",
  });
}
