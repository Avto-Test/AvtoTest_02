import { computeCategoryMetrics, clampPercent, normalizePercent, toNumber } from "@/analytics/computeCategoryMetrics";
import { computeRecommendation, sortCategoryMetricsByWeakness } from "@/analytics/recommendationEngine";

import type {
  DashboardAnalyticsViewModel,
  RawDashboardResponse,
  RawDifficultyPoint,
  RawFunnelResponse,
  RawSummaryResponse,
  ScoreTrendPoint,
  DifficultyPoint,
} from "@/analytics/types";

function normalizePassProbability(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (raw <= 1) return clampPercent(raw * 100);
  return clampPercent(raw);
}

function normalizeScoreTrend(payload: RawDashboardResponse): ScoreTrendPoint[] {
  const recentScoresRaw = Array.isArray(payload.recent_scores) ? payload.recent_scores : [];
  if (recentScoresRaw.length > 0) {
    return recentScoresRaw.map((value, index) => ({
      testIndex: index + 1,
      score: normalizePercent(toNumber(value, 0)),
    }));
  }

  return (payload.progress_trend ?? [])
    .map((point, index) => ({
      testIndex: index + 1,
      score: normalizePercent(toNumber(point?.value, 0)),
    }))
    .filter((point) => Number.isFinite(point.score));
}

function normalizeDifficultyPoint(item: RawDifficultyPoint, index: number): DifficultyPoint {
  return {
    testIndex: Math.max(1, Math.round(toNumber(item.test_index, index + 1))),
    averageDifficulty: normalizePercent(toNumber(item.average_difficulty ?? item.difficulty ?? item.value, 0)),
  };
}

function normalizeLessons(payload: RawDashboardResponse): DashboardAnalyticsViewModel["lessonRecommendations"] {
  return (payload.lesson_recommendations ?? [])
    .map((item) => ({
      lessonId: String(item?.lesson_id ?? "").trim(),
      title: String(item?.title ?? "").trim(),
      reason: String(item?.reason ?? "").trim(),
      topic: item?.topic ? String(item.topic).trim() : null,
      contentType: item?.content_type ? String(item.content_type).trim() : null,
    }))
    .filter((item) => item.lessonId.length > 0 && item.title.length > 0);
}

function normalizeQuestionBankMastery(payload: RawDashboardResponse): DashboardAnalyticsViewModel["questionBankMastery"] {
  return {
    totalQuestions: Math.max(0, Math.round(toNumber(payload.question_bank_mastery?.total_questions, 0))),
    seenQuestions: Math.max(0, Math.round(toNumber(payload.question_bank_mastery?.seen_questions, 0))),
    correctQuestions: Math.max(0, Math.round(toNumber(payload.question_bank_mastery?.correct_questions, 0))),
    masteredQuestions: Math.max(0, Math.round(toNumber(payload.question_bank_mastery?.mastered_questions, 0))),
    needsReviewQuestions: Math.max(0, Math.round(toNumber(payload.question_bank_mastery?.needs_review_questions, 0))),
  };
}

function normalizePassBreakdown(payload: RawDashboardResponse): DashboardAnalyticsViewModel["passBreakdown"] {
  return {
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
}

export function normalizeAnalytics(
  payload: RawDashboardResponse,
  funnel?: RawFunnelResponse | null,
  summary?: RawSummaryResponse | null
): DashboardAnalyticsViewModel {
  const overview = payload.overview ?? {};
  const fallbackPass = normalizePassProbability(toNumber(funnel?.pass_probability, 0));
  const passProbability = normalizePassProbability(
    toNumber(overview.pass_probability_final ?? overview.pass_probability, fallbackPass)
  );

  const categoryMetrics = computeCategoryMetrics(payload).sort((left, right) => left.category.localeCompare(right.category));
  const weakTopicMetrics = sortCategoryMetricsByWeakness(categoryMetrics).slice(0, 6);
  const recommendation = computeRecommendation(categoryMetrics);
  const scoreTrend = normalizeScoreTrend(payload);
  const difficultyProgression = (payload.difficulty_progression ?? [])
    .map((item, index) => normalizeDifficultyPoint(item, index))
    .filter((item) => Number.isFinite(item.averageDifficulty));
  const lessonRecommendations = normalizeLessons(payload);
  const questionBankMastery = normalizeQuestionBankMastery(payload);
  const passBreakdown = normalizePassBreakdown(payload);

  const derivedAttemptsFromTrend = scoreTrend.length;
  const totalAttempts = Math.max(
    0,
    Math.round(
      toNumber(
        summary?.total_attempts ?? overview.total_attempts ?? (derivedAttemptsFromTrend > 0 ? derivedAttemptsFromTrend : 0),
        0
      )
    )
  );

  const averageScore = normalizePercent(toNumber(summary?.average_score ?? overview.average_score, 0));
  const bestScore = normalizePercent(toNumber(overview.best_score, 0));
  const isEmptyState = categoryMetrics.length === 0 && scoreTrend.length === 0 && totalAttempts === 0;

  return {
    passProbability,
    readinessScore: normalizePercent(toNumber(overview.readiness_score, 0)),
    bestScore,
    trainingLevel: String(overview.training_level ?? overview.current_training_level ?? "beginner"),
    cognitiveStability: String(overview.cognitive_stability ?? "n/a"),
    averageScore,
    improvementDelta: toNumber(overview.improvement_delta, 0),
    totalAttempts,
    scoreTrend,
    categoryMetrics,
    weakTopicMetrics,
    difficultyProgression,
    recommendation,
    lessonRecommendations,
    questionBankMastery,
    passBreakdown,
    isEmptyState,
  };
}
