"use client";

import { startAdaptive, startFreeRandom, startLearningSession } from "@/api/tests";
import type { DashboardAnalytics } from "@/types/analytics";
import type { FreeTestStatus, PublicQuestion } from "@/types/test";
import type { User } from "@/types/user";

export type PracticeSessionPayload = {
  attemptId: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  questions: PublicQuestion[];
  modeLabel: string;
};

type StartIntelligentPracticeOptions = {
  dashboard: DashboardAnalytics;
  user: User | null;
  freeStatus?: FreeTestStatus | null;
  topicHint?: string | null;
  topicPreferences?: string[];
};

function normalizeTopics(topics?: string[]) {
  const seen = new Set<string>();
  return (topics ?? []).filter((topic) => {
    const normalized = topic.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function buildSubtitle(dashboard: DashboardAnalytics, topicHint?: string | null, topicPreferences?: string[]) {
  const normalizedTopics = normalizeTopics(topicPreferences);
  if (normalizedTopics.length === 1) {
    return `${normalizedTopics[0]} mavzusiga e'tibor qaratilgan mashq`;
  }

  if (normalizedTopics.length > 1) {
    return `${normalizedTopics.length} ta tanlangan mavzu bilan mashq`;
  }

  return topicHint ?? dashboard.recommendation.topic ?? "Bugungi mashq";
}

function shouldUseLearningSession(
  dashboard: DashboardAnalytics,
  topicHint?: string | null,
  topicPreferences?: string[],
) {
  if (normalizeTopics(topicPreferences).length > 0) {
    return true;
  }

  if (topicHint) {
    return true;
  }

  if (dashboard.overview.total_due > 0) {
    return true;
  }

  if (dashboard.recommendation.topic) {
    return true;
  }

  return dashboard.topic_breakdown.some((topic) => topic.accuracy < 70);
}

export async function startIntelligentPracticeSession({
  dashboard,
  user,
  freeStatus,
  topicHint,
  topicPreferences,
}: StartIntelligentPracticeOptions): Promise<PracticeSessionPayload> {
  const subtitle = buildSubtitle(dashboard, topicHint, topicPreferences);
  const normalizedTopics = normalizeTopics(topicPreferences);

  if (shouldUseLearningSession(dashboard, topicHint, normalizedTopics)) {
    const response = await startLearningSession(20, normalizedTopics);
    return {
      attemptId: response.session_id,
      title: "Mashq",
      subtitle,
      durationMinutes: 25,
      questions: response.questions,
      modeLabel: "Mashq",
    };
  }

  if (user?.is_premium || freeStatus?.is_premium) {
    const response = await startAdaptive({
      question_count: 20,
      pressure_mode: false,
      ...(normalizedTopics.length ? { topic_preferences: normalizedTopics } : {}),
    });
    return {
      attemptId: response.id,
      title: "Mashq",
      subtitle,
      durationMinutes: response.duration_minutes,
      questions: response.questions,
      modeLabel: "Mashq",
    };
  }

  if (!freeStatus?.limit_reached) {
    const response = await startFreeRandom();
    return {
      attemptId: response.id,
      title: "Mashq",
      subtitle,
      durationMinutes: response.duration_minutes,
      questions: response.questions,
      modeLabel: "Mashq",
    };
  }

  const fallback = await startLearningSession(20, normalizedTopics);
  return {
    attemptId: fallback.session_id,
    title: "Mashq",
    subtitle,
    durationMinutes: 25,
    questions: fallback.questions,
    modeLabel: "Mashq",
  };
}
