import { normalizeTopicKey } from "@/lib/dashboardTopic";

import type { CategoryMetric, RecommendationInsight, RecommendationReasoning } from "@/analytics/types";

function compareNullableAscending(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }

  return left - right;
}

function hasTrackedAttempts(metric: CategoryMetric): boolean {
  return metric.attempts !== null && metric.attempts > 0;
}

export function sortCategoryMetricsByWeakness(metrics: CategoryMetric[]): CategoryMetric[] {
  return [...metrics].sort((left, right) => {
    if (left.accuracy !== right.accuracy) {
      return left.accuracy - right.accuracy;
    }

    const coverageDelta = compareNullableAscending(left.coverage, right.coverage);
    if (coverageDelta !== 0) {
      return coverageDelta;
    }

    const attemptsDelta = compareNullableAscending(left.attempts, right.attempts);
    if (attemptsDelta !== 0) {
      return attemptsDelta;
    }

    return left.category.localeCompare(right.category);
  });
}

function buildPriorityScore(metric: CategoryMetric): number {
  const accuracyWeight = 100 - metric.accuracy;
  const coverageWeight = metric.coverage === null ? 0 : (100 - metric.coverage) * 0.35;
  const attemptsWeight = metric.attempts === null ? 0 : Math.max(0, 12 - metric.attempts) * 0.65;

  return Number((accuracyWeight + coverageWeight + attemptsWeight).toFixed(2));
}

function determineReasoning(metric: CategoryMetric, candidates: CategoryMetric[]): RecommendationReasoning {
  const hasLowerAccuracyNeighbor = candidates.some((candidate) => candidate.category !== metric.category && candidate.accuracy > metric.accuracy);

  if (metric.accuracy < 60 || hasLowerAccuracyNeighbor) {
    return "lowest_accuracy";
  }

  if (metric.coverage !== null && metric.coverage < 70) {
    return "low_coverage";
  }

  return "practice_recommended";
}

function buildExplanation(metric: CategoryMetric, reasoning: RecommendationReasoning): string {
  const accuracy = Math.round(metric.accuracy);
  const coverage = metric.coverage === null ? null : Math.round(metric.coverage);

  if (reasoning === "lowest_accuracy") {
    return `Siz ${metric.category} mavzusida atigi ${accuracy}% aniqlikka egasiz. Bu sizning eng zaif yo'nalishlaringizdan biri.`;
  }

  if (reasoning === "low_coverage") {
    if (coverage !== null) {
      return `${metric.category} mavzusida aniqlik ${accuracy}%, qamrov esa ${coverage}% darajada. Shu yo'nalishni mustahkamlash orqali umumiy natijangizni tez oshirish mumkin.`;
    }

    return `${metric.category} mavzusida aniqlik ${accuracy}% darajada. Bu yo'nalishni mustahkamlash orqali umumiy natijangizni tez oshirish mumkin.`;
  }

  return `${metric.category} mavzusi yaxshi o'zlashtirilgan, ammo qo'shimcha mashq uni yanada mustahkamlaydi.`;
}

export function computeRecommendation(metrics: CategoryMetric[]): RecommendationInsight {
  if (!metrics.length) {
    return {
      topic: null,
      accuracy: null,
      coverage: null,
      attempts: null,
      reasoning: null,
      priorityScore: null,
      explanation: "Tavsiya uchun hali yetarli ma'lumot yo'q. Yana bir nechta test yeching.",
      categoryId: null,
      normalizedTopicKey: null,
      actionLabel: "Shu mavzuda mashq qilish",
    };
  }

  const hasAttemptedCategory = metrics.some(hasTrackedAttempts);
  const candidatePool = hasAttemptedCategory ? metrics.filter(hasTrackedAttempts) : metrics;
  const sortedCandidates = sortCategoryMetricsByWeakness(candidatePool.length > 0 ? candidatePool : metrics);
  const selected = sortedCandidates[0];
  const reasoning = determineReasoning(selected, sortedCandidates);

  return {
    topic: selected.category,
    accuracy: selected.accuracy,
    coverage: selected.coverage,
    attempts: selected.attempts,
    reasoning,
    priorityScore: buildPriorityScore(selected),
    explanation: buildExplanation(selected, reasoning),
    categoryId: selected.id ?? null,
    normalizedTopicKey: normalizeTopicKey(selected.category),
    actionLabel: "Shu mavzuda mashq qilish",
  };
}
