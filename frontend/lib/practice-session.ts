"use client";

import { startLearningSession } from "@/api/tests";
import type { PublicQuestion } from "@/types/test";

export type PracticeSessionPayload = {
  attemptId: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  questions: PublicQuestion[];
  modeLabel: string;
};

type StartPracticeOptions = {
  questionCount: 20 | 30 | 40;
  topicPreferences?: string[];
};

export async function startIntelligentPracticeSession({
  questionCount,
  topicPreferences,
}: StartPracticeOptions): Promise<PracticeSessionPayload> {
  const normalizedTopics = Array.from(
    new Set((topicPreferences ?? []).map((topic) => topic.trim()).filter(Boolean)),
  );
  const response = await startLearningSession(questionCount, normalizedTopics);

  return {
    attemptId: response.session_id,
    title: "Mashq",
    subtitle: `${response.question_count} savol`,
    durationMinutes: response.duration_minutes,
    questions: response.questions,
    modeLabel: normalizedTopics.length > 0 ? "Tanlangan mashq" : "Mashq",
  };
}
