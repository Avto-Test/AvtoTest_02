import type {
  AttemptResult,
  FreeTestStatus,
  LearningSession,
  TestDetail,
  TestListItem,
  TestSession,
} from "@/types/test";

import { apiRequest } from "@/api/client";

type SubmitPayload = {
  attempt_id: string;
  answers: Record<string, string>;
  response_times: number[];
  visited_question_ids?: string[];
};

export function getTests() {
  return apiRequest<TestListItem[]>("/tests", { method: "GET" });
}

export function getTestDetail(testId: string) {
  return apiRequest<TestDetail>(`/tests/${testId}`, { method: "GET" });
}

export function getFreeTestStatus() {
  return apiRequest<FreeTestStatus>("/tests/free-status", { method: "GET" });
}

export function startAttempt(payload: {
  test_id: string;
  pressure_mode?: boolean;
  question_count?: number | null;
}) {
  return apiRequest<TestSession>("/attempts/start", {
    method: "POST",
    body: payload,
  });
}

export function startAdaptive(payload: {
  question_count: number;
  pressure_mode?: boolean;
  topic_preferences?: string[];
}) {
  return apiRequest<TestSession>("/tests/adaptive/start", {
    method: "POST",
    body: payload,
  });
}

export function startFreeRandom() {
  return apiRequest<TestSession>("/tests/free-random", { method: "GET" });
}

export function startLearningSession(questionCount = 20, topicPreferences?: string[]) {
  return apiRequest<LearningSession>("/learning/session", {
    method: "POST",
    body: {
      question_count: questionCount,
      ...(topicPreferences?.length ? { topic_preferences: topicPreferences } : {}),
    },
  });
}

export function submitAttempt(payload: SubmitPayload) {
  return apiRequest<AttemptResult>("/attempts/submit", {
    method: "POST",
    body: payload,
    baseUrl: "/api",
  });
}
