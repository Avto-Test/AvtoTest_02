"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";

type RawOverview = {
  pass_probability_final?: number | null;
  pass_probability?: number | null;
  readiness_score?: number | null;
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
  trainingLevel: string;
  cognitiveStability: string;
  averageScore: number;
  improvementDelta: number;
  totalAttempts: number;
  scoreTrend: ScoreTrendPoint[];
  categoryPerformance: CategoryPoint[];
  difficultyProgression: DifficultyPoint[];
  weakTopics: WeakTopicPoint[];
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

function normalizeDashboardPayload(payload: RawDashboardResponse, funnel?: RawFunnelResponse | null): DashboardAnalyticsViewModel {
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
          score: clampPercent(toNumber(value, 0)),
        }))
      : (payload.progress_trend ?? [])
          .map((point, index) => ({
            testIndex: index + 1,
            score: clampPercent(toNumber(point?.value, 0)),
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
      accuracy: clampPercent(toNumber(category.accuracy, 0)),
    }))
    .filter((item) => item.category.length > 0);

  const difficultyRaw = Array.isArray(payload.difficulty_progression) ? payload.difficulty_progression : [];
  const difficultyProgression: DifficultyPoint[] = difficultyRaw
    .map((item, index) => ({
      testIndex: Math.max(1, Math.round(toNumber(item.test_index, index + 1))),
      averageDifficulty: clampPercent(toNumber(item.average_difficulty ?? item.difficulty ?? item.value, 0)),
    }))
    .filter((item) => Number.isFinite(item.averageDifficulty));

  const weakRaw = Array.isArray(payload.weak_topics) ? payload.weak_topics : [];
  const weakTopicsFromApi: WeakTopicPoint[] = weakRaw
    .map((item) => ({
      category: normalizeCategoryLabel(String(item.category ?? item.topic ?? "")),
      accuracy: clampPercent(toNumber(item.accuracy, 0)),
    }))
    .filter((item) => item.category.length > 0);

  const weakTopics =
    weakTopicsFromApi.length > 0
      ? weakTopicsFromApi.sort((a, b) => a.accuracy - b.accuracy)
      : [...categoryPerformance].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);

  return {
    passProbability: dashboardPass,
    readinessScore: clampPercent(toNumber(overview.readiness_score, 0)),
    trainingLevel: String(overview.training_level ?? overview.current_training_level ?? "beginner"),
    cognitiveStability: String(overview.cognitive_stability ?? "n/a"),
    averageScore: clampPercent(toNumber(overview.average_score, 0)),
    improvementDelta: toNumber(overview.improvement_delta, 0),
    totalAttempts: Math.max(0, Math.round(toNumber(overview.total_attempts, 0))),
    scoreTrend,
    categoryPerformance,
    difficultyProgression,
    weakTopics,
  };
}

export function useDashboardAnalytics(): UseDashboardAnalyticsResult {
  const [data, setData] = useState<DashboardAnalyticsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardResult, funnelResult] = await Promise.allSettled([
        api.get<RawDashboardResponse>("/analytics/me/dashboard"),
        fetch("/api/analytics/funnel", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
      ]);

      if (dashboardResult.status !== "fulfilled") {
        throw dashboardResult.reason;
      }

      let funnelPayload: RawFunnelResponse | null = null;
      if (funnelResult.status === "fulfilled" && funnelResult.value.ok) {
        try {
          funnelPayload = (await funnelResult.value.json()) as RawFunnelResponse;
        } catch {
          funnelPayload = null;
        }
      }

      const normalized = normalizeDashboardPayload(dashboardResult.value.data, funnelPayload);
      setData(normalized);
    } catch (err) {
      console.error("Dashboard analytics yuklanmadi", err);
      setError("Analitika ma'lumotlari yuklanmadi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

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

