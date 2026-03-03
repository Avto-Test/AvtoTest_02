/**
 * AUTOTEST Analytics API
 * Functions for analytics endpoints
 */

import { api } from "./api";
import { UserAnalyticsSummary, UserTestAnalytics } from "@/schemas/analytics.schema";

type EventMetadata = Record<string, unknown>;

function getPersistedToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const persisted = window.localStorage.getItem("auth-storage");
    if (!persisted) {
      return null;
    }

    const parsed = JSON.parse(persisted) as {
      state?: {
        token?: unknown;
      };
    };

    const token = parsed?.state?.token;
    return typeof token === "string" && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export async function trackEvent(
  event: string,
  metadata?: EventMetadata
): Promise<void> {
  if (typeof event !== "string" || event.trim().length === 0) {
    return;
  }

  try {
    const token = getPersistedToken();

    await fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        event: event.trim(),
        metadata: metadata ?? {},
      }),
    });
  } catch {
    // Fail silently to avoid blocking UX.
  }
}

export async function getUserAnalyticsSummary(): Promise<UserAnalyticsSummary> {
  const response = await api.get<UserAnalyticsSummary>("/analytics/me/summary");
  return response.data;
}

export async function getUserTestAnalytics(): Promise<UserTestAnalytics[]> {
  const response = await api.get<UserTestAnalytics[]>("/analytics/me/tests");
  return response.data;
}