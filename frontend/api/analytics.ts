import type {
  AnalyticsSummary,
  DashboardAnalytics,
  IntelligenceHistoryEntry,
  ReviewQueueResponse,
} from "@/types/analytics";

import { apiRequest } from "@/api/client";

export function getDashboardAnalytics() {
  return apiRequest<DashboardAnalytics>("/analytics/me/dashboard", { method: "GET" });
}

export function getAnalyticsSummary() {
  return apiRequest<AnalyticsSummary>("/analytics/me/summary", { method: "GET" });
}

export function getReviewQueue() {
  return apiRequest<ReviewQueueResponse>("/analytics/me/review-queue", {
    method: "GET",
  });
}

export function getIntelligenceHistory() {
  return apiRequest<IntelligenceHistoryEntry[]>("/analytics/me/intelligence-history", {
    method: "GET",
  });
}

export function trackAnalyticsEvent(event: string, metadata?: Record<string, unknown>) {
  return apiRequest<null>("/analytics/track", {
    method: "POST",
    body: {
      event,
      metadata: metadata ?? {},
    },
    baseUrl: "/api",
  });
}
