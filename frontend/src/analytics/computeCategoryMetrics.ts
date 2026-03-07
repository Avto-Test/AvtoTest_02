import { normalizeTopicKey } from "@/lib/dashboardTopic";

import type { CategoryMetric, RawCategory, RawDashboardResponse } from "@/analytics/types";

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function firstDefinedNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = toNullableNumber(value);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

export function normalizePercent(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (raw <= 1) return clampPercent(raw * 100);
  return clampPercent(raw);
}

export function normalizeCategoryLabel(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  const lower = value.toLowerCase();
  if (lower.includes("sign") || lower.includes("belgi")) return "Yo'l belgilari";
  if (lower.includes("rule") || lower.includes("qoida") || lower.includes("harakat")) return "Yo'l harakati qoidalari";
  if (lower.includes("intersection") || lower.includes("chorraha")) return "Chorrahalar";
  if (lower.includes("mark") || lower.includes("chiziq")) return "Yo'l chiziqlari";
  if (lower.includes("culture") || lower.includes("madaniyat")) return "Haydovchi madaniyati";

  return value;
}

function computeCoveragePercent(raw: RawCategory): number | null {
  const directCoverage = toNullableNumber(raw.coverage);
  if (directCoverage !== null) {
    return clampPercent(directCoverage);
  }

  const seenQuestions = firstDefinedNumber(raw.covered_questions, raw.seen_questions);
  const totalQuestions = firstDefinedNumber(raw.total_questions, raw.question_count, raw.total);
  if (seenQuestions !== null && totalQuestions !== null && totalQuestions > 0) {
    return clampPercent((seenQuestions / totalQuestions) * 100);
  }

  return null;
}

type CategoryMetricAggregate = {
  id?: string;
  category: string;
  accuracyTotal: number;
  accuracyCount: number;
  coverageTotal: number;
  coverageCount: number;
  attemptsTotal: number | null;
};

function sanitizeCategoryMetric(raw: RawCategory): CategoryMetric | null {
  const category = normalizeCategoryLabel(String(raw.category ?? raw.topic ?? ""));
  if (!category) {
    return null;
  }

  return {
    id: String(raw.id ?? raw.category_id ?? raw.category ?? raw.topic ?? "").trim() || undefined,
    category,
    accuracy: normalizePercent(toNumber(raw.accuracy, 0)),
    coverage: computeCoveragePercent(raw),
    attempts: firstDefinedNumber(raw.attempts_count, raw.attempts, raw.question_count, raw.total),
  };
}

function aggregateMetric(target: CategoryMetricAggregate, metric: CategoryMetric) {
  target.id ||= metric.id;
  target.accuracyTotal += metric.accuracy;
  target.accuracyCount += 1;

  if (metric.coverage !== null) {
    target.coverageTotal += metric.coverage;
    target.coverageCount += 1;
  }

  if (metric.attempts !== null) {
    target.attemptsTotal = (target.attemptsTotal ?? 0) + metric.attempts;
  }
}

export function computeCategoryMetrics(payload: Pick<RawDashboardResponse, "category_performance" | "topic_breakdown" | "weak_topics">): CategoryMetric[] {
  const categoriesRaw = Array.isArray(payload.category_performance)
    ? payload.category_performance
    : Array.isArray(payload.topic_breakdown)
    ? payload.topic_breakdown
    : [];
  const weakRaw = Array.isArray(payload.weak_topics) ? payload.weak_topics : [];
  const source = categoriesRaw.length > 0 ? categoriesRaw : weakRaw;
  const aggregated = new Map<string, CategoryMetricAggregate>();

  for (const rawItem of source) {
    const metric = sanitizeCategoryMetric(rawItem);
    if (!metric) {
      continue;
    }

    const key = normalizeTopicKey(metric.category) || metric.category;
    const existing = aggregated.get(key) ?? {
      id: metric.id,
      category: metric.category,
      accuracyTotal: 0,
      accuracyCount: 0,
      coverageTotal: 0,
      coverageCount: 0,
      attemptsTotal: null,
    };

    aggregateMetric(existing, metric);
    aggregated.set(key, existing);
  }

  return Array.from(aggregated.values())
    .map((item) => ({
      id: item.id,
      category: item.category,
      accuracy: clampPercent(Number((item.accuracyTotal / Math.max(1, item.accuracyCount)).toFixed(1))),
      coverage:
        item.coverageCount > 0 ? clampPercent(Number((item.coverageTotal / item.coverageCount).toFixed(1))) : null,
      attempts: item.attemptsTotal,
    }))
    .filter((item) => item.category.trim().length > 0);
}
