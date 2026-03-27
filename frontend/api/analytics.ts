import type {
  AnalyticsSummary,
  DashboardAnalytics,
  IntelligenceHistoryEntry,
  ReviewQueueResponse,
} from "@/types/analytics";

import { apiRequest } from "@/api/client";

export function getDashboardAnalytics() {
  return apiRequest<DashboardAnalytics>("/analytics/me/dashboard", { method: "GET", baseUrl: "/api" });
}

export function getAnalyticsSummary() {
  return apiRequest<AnalyticsSummary>("/analytics/me/summary", { method: "GET", baseUrl: "/api" });
}

export function getReviewQueue() {
  return apiRequest<ReviewQueueResponse>("/analytics/me/review-queue", {
    method: "GET",
    baseUrl: "/api",
  });
}

export function getIntelligenceHistory() {
  return apiRequest<IntelligenceHistoryEntry[]>("/analytics/me/intelligence-history", {
    method: "GET",
    baseUrl: "/api",
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
