"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/store/useAuth";

type RawOverview = {
  pass_probability_final?: number | null;
  pass_probability?: number | null;
  readiness_score?: number | null;
  best_score?: number | null;
  training_level?: string | null;
  current_training_level?: string | null;
  cognitive_stability?: string | null;
  average_score?: number | null;
  improvement_delta?: number | null;
  total_attempts?: number | null;
};

type RawCategory = {
  category?: string | null;
  topic?: string | null;
  accuracy?: number | null;
};

type RawDifficultyPoint = {
  test_index?: number | null;
  average_difficulty?: number | null;
  difficulty?: number | null;
  value?: number | null;
};

type RawDashboardResponse = {
  overview?: RawOverview | null;
  recommendation?: {
    topic?: string | null;
    accuracy?: number | null;
    action_label?: string | null;
  } | null;
  lesson_recommendations?:
    | Array<{
        lesson_id?: string | null;
        title?: string | null;
        reason?: string | null;
        topic?: string | null;
        content_type?: string | null;
      }>
    | null;
  question_bank_mastery?: {
    total_questions?: number | null;
    seen_questions?: number | null;
    correct_questions?: number | null;
    mastered_questions?: number | null;
    needs_review_questions?: number | null;
  } | null;
  pass_probability_breakdown?: {
    explanation?: string | null;
    factors?:
      | Array<{
          key?: string | null;
          label?: string | null;
          weight?: number | null;
          score?: number | null;
          weighted_score?: number | null;
        }>
      | null;
  } | null;
  category_performance?: RawCategory[] | null;
  topic_breakdown?: RawCategory[] | null;
  recent_scores?: Array<number | null> | null;
  difficulty_progression?: RawDifficultyPoint[] | null;
  weak_topics?: RawCategory[] | null;
  progress_trend?: Array<{ label?: string | null; value?: number | null }> | null;
};

type RawFunnelResponse = {
  pass_probability?: number | null;
};

type RawSummaryResponse = {
  total_attempts?: number | null;
  average_score?: number | null;
};

export type ScoreTrendPoint = {
  testIndex: number;
  score: number;
};

export type CategoryPoint = {
  category: string;
  accuracy: number;
};

export type DifficultyPoint = {
  testIndex: number;
  averageDifficulty: number;
};

export type WeakTopicPoint = {
  category: string;
  accuracy: number;
};

export type DashboardAnalyticsViewModel = {
  passProbability: number;
  readinessScore: number;
  bestScore: number;
  trainingLevel: string;
  cognitiveStability: string;
  averageScore: number;
  improvementDelta: number;
  totalAttempts: number;
  scoreTrend: ScoreTrendPoint[];
  categoryPerformance: CategoryPoint[];
  difficultyProgression: DifficultyPoint[];
  weakTopics: WeakTopicPoint[];
  recommendation: {
    topic: string | null;
    accuracy: number | null;
    actionLabel: string | null;
  };
  lessonRecommendations: Array<{
    lessonId: string;
    title: string;
    reason: string;
    topic: string | null;
    contentType: string | null;
  }>;
  questionBankMastery: {
    totalQuestions: number;
    seenQuestions: number;
    correctQuestions: number;
    masteredQuestions: number;
    needsReviewQuestions: number;
  };
  passBreakdown: {
    explanation: string;
    factors: Array<{
      key: string;
      label: string;
      weight: number;
      score: number;
      weightedScore: number;
    }>;
  };
};

type UseDashboardAnalyticsResult = {
  data: DashboardAnalyticsViewModel | null;
  loading: boolean;
  error: string | null;
  hasEnoughAttempts: boolean;
  refetch: () => Promise<void>;
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizePercent(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (raw <= 1) return clampPercent(raw * 100);
  return clampPercent(raw);
}

function normalizePassProbability(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (raw <= 1) return clampPercent(raw * 100);
  return clampPercent(raw);
}

function normalizeCategoryLabel(raw: string): string {
  const value = raw.trim();
  if (!value) return "Noma'lum";

  const lower = value.toLowerCase();
  if (lower.includes("sign") || lower.includes("belgi")) return "Yo'l belgilari";
  if (lower.includes("rule") || lower.includes("qoida") || lower.includes("harakat")) return "Yo'l harakati qoidalari";
  if (lower.includes("intersection") || lower.includes("chorraha")) return "Chorrahalar";
  if (lower.includes("mark") || lower.includes("chiziq")) return "Yo'l chiziqlari";
  if (lower.includes("culture") || lower.includes("madaniyat")) return "Haydovchi madaniyati";

  return value;
}

function normalizeDashboardPayload(
  payload: RawDashboardResponse,
  funnel?: RawFunnelResponse | null,
  summary?: RawSummaryResponse | null
): DashboardAnalyticsViewModel {
  const overview = payload.overview ?? {};
  const fallbackPass = normalizePassProbability(toNumber(funnel?.pass_probability, 0));
  const dashboardPass = normalizePassProbability(
    toNumber(overview.pass_probability_final ?? overview.pass_probability, fallbackPass)
  );

  const recentScoresRaw = Array.isArray(payload.recent_scores) ? payload.recent_scores : [];
  const scoreTrend: ScoreTrendPoint[] =
    recentScoresRaw.length > 0
      ? recentScoresRaw.map((value, index) => ({
          testIndex: index + 1,
          score: normalizePercent(toNumber(value, 0)),
        }))
      : (payload.progress_trend ?? [])
          .map((point, index) => ({
            testIndex: index + 1,
            score: normalizePercent(toNumber(point?.value, 0)),
          }))
          .filter((point) => Number.isFinite(point.score));

  const categoriesRaw = Array.isArray(payload.category_performance)
    ? payload.category_performance
    : Array.isArray(payload.topic_breakdown)
    ? payload.topic_breakdown
    : [];

  const categoryPerformance: CategoryPoint[] = categoriesRaw
    .map((category) => ({
      category: normalizeCategoryLabel(String(category.category ?? category.topic ?? "")),
      accuracy: normalizePercent(toNumber(category.accuracy, 0)),
    }))
    .filter((item) => item.category.length > 0);

  const difficultyRaw = Array.isArray(payload.difficulty_progression) ? payload.difficulty_progression : [];
  const difficultyProgression: DifficultyPoint[] = difficultyRaw
    .map((item, index) => ({
      testIndex: Math.max(1, Math.round(toNumber(item.test_index, index + 1))),
      averageDifficulty: normalizePercent(toNumber(item.average_difficulty ?? item.difficulty ?? item.value, 0)),
    }))
    .filter((item) => Number.isFinite(item.averageDifficulty));

  const weakRaw = Array.isArray(payload.weak_topics) ? payload.weak_topics : [];
  const weakTopicsFromApi: WeakTopicPoint[] = weakRaw
    .map((item) => ({
      category: normalizeCategoryLabel(String(item.category ?? item.topic ?? "")),
      accuracy: normalizePercent(toNumber(item.accuracy, 0)),
    }))
    .filter((item) => item.category.length > 0);

  const weakTopics =
    weakTopicsFromApi.length > 0
      ? weakTopicsFromApi.sort((a, b) => a.accuracy - b.accuracy)
      : [...categoryPerformance].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);

  const recommendation = {
    topic: payload.recommendation?.topic ? String(payload.recommendation.topic) : null,
    accuracy:
      payload.recommendation?.accuracy === null || payload.recommendation?.accuracy === undefined
        ? null
        : clampPercent(toNumber(payload.recommendation?.accuracy, 0)),
    actionLabel: payload.recommendation?.action_label ? String(payload.recommendation.action_label) : null,
  };

  const lessonRecommendations = (payload.lesson_recommendations ?? [])
    .map((item) => ({
      lessonId: String(item?.lesson_id ?? ""),
      title: String(item?.title ?? "").trim(),
      reason: String(item?.reason ?? "").trim(),
      topic: item?.topic ? String(item.topic) : null,
      contentType: item?.content_type ? String(item.content_type) : null,
    }))
    .filter((item) => item.lessonId.length > 0 && item.title.length > 0);

  const questionBankMastery = {
    totalQuestions: Math.max(0, Math.round(toNumber(payload.question_bank_mastery?.total_questions, 0))),
    seenQuestions: Math.max(0, Math.round(toNumber(payload.question_bank_mastery?.seen_questions, 0))),
    correctQuestions: Math.max(0, Math.round(toNumber(payload.question_bank_mastery?.correct_questions, 0))),
    masteredQuestions: Math.max(0, Math.round(toNumber(payload.question_bank_mastery?.mastered_questions, 0))),
    needsReviewQuestions: Math.max(0, Math.round(toNumber(payload.question_bank_mastery?.needs_review_questions, 0))),
  };

  const passBreakdown = {
    explanation:
      String(payload.pass_probability_breakdown?.explanation ?? "").trim() ||
      "O'tish ehtimoli natijalar va o'zlashtirish ko'rsatkichlari asosida hisoblanadi.",
    factors: (payload.pass_probability_breakdown?.factors ?? [])
      .map((item) => ({
        key: String(item?.key ?? "").trim() || "factor",
        label: String(item?.label ?? "").trim() || "Omil",
        weight: clampPercent(toNumber(item?.weight, 0)),
        score: clampPercent(toNumber(item?.score, 0)),
        weightedScore: clampPercent(toNumber(item?.weighted_score, 0)),
      }))
      .filter((item) => item.label.length > 0),
  };

  const derivedAttemptsFromTrend = scoreTrend.length;
  const totalAttempts = Math.max(
    0,
    Math.round(
      toNumber(
        summary?.total_attempts ??
          overview.total_attempts ??
          (derivedAttemptsFromTrend > 0 ? derivedAttemptsFromTrend : 0),
        0
      )
    )
  );

  const avgScore = normalizePercent(toNumber(summary?.average_score ?? overview.average_score, 0));
  const bestScore = normalizePercent(toNumber(overview.best_score, 0));

  return {
    passProbability: dashboardPass,
    readinessScore: normalizePercent(toNumber(overview.readiness_score, 0)),
    bestScore,
    trainingLevel: String(overview.training_level ?? overview.current_training_level ?? "beginner"),
    cognitiveStability: String(overview.cognitive_stability ?? "n/a"),
    averageScore: avgScore,
    improvementDelta: toNumber(overview.improvement_delta, 0),
    totalAttempts,
    scoreTrend,
    categoryPerformance,
    difficultyProgression,
    weakTopics,
    recommendation,
    lessonRecommendations,
    questionBankMastery,
    passBreakdown,
  };
}

export function useDashboardAnalytics(): UseDashboardAnalyticsResult {
  const token = useAuth((state) => state.token);
  const [data, setData] = useState<DashboardAnalyticsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const [dashboardResult, summaryResult, funnelResult] = await Promise.allSettled([
        fetch("/api/analytics/dashboard", {
          method: "GET",
          credentials: "include",
          headers,
          cache: "no-store",
        }),
        fetch("/api/analytics/summary", {
          method: "GET",
          credentials: "include",
          headers,
          cache: "no-store",
        }),
        fetch("/api/analytics/funnel", {
          method: "GET",
          credentials: "include",
          headers,
          cache: "no-store",
        }),
      ]);

      if (dashboardResult.status !== "fulfilled") {
        throw dashboardResult.reason;
      }
      if (!dashboardResult.value.ok) {
        throw new Error(`Dashboard API failed: ${dashboardResult.value.status}`);
      }

      const dashboardPayload = (await dashboardResult.value.json()) as RawDashboardResponse;

      let summaryPayload: RawSummaryResponse | null = null;
      if (summaryResult.status === "fulfilled" && summaryResult.value.ok) {
        try {
          summaryPayload = (await summaryResult.value.json()) as RawSummaryResponse;
        } catch {
          summaryPayload = null;
        }
      }

      let funnelPayload: RawFunnelResponse | null = null;
      if (funnelResult.status === "fulfilled" && funnelResult.value.ok) {
        try {
          funnelPayload = (await funnelResult.value.json()) as RawFunnelResponse;
        } catch {
          funnelPayload = null;
        }
      }

      const normalized = normalizeDashboardPayload(dashboardPayload, funnelPayload, summaryPayload);
      setData(normalized);
    } catch (err) {
      console.error("Dashboard analytics yuklanmadi", err);
      setError("Analitika ma'lumotlari yuklanmadi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const hasEnoughAttempts = useMemo(() => (data?.totalAttempts ?? 0) >= 5, [data?.totalAttempts]);

  return {
    data,
    loading,
    error,
    hasEnoughAttempts,
    refetch: fetchData,
  };
}
