"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { normalizeAnalytics } from "@/analytics/normalizeAnalytics";
import type {
  CategoryMetric,
  DashboardAnalyticsViewModel,
  RawDashboardResponse,
  RawFunnelResponse,
  RawSummaryResponse,
} from "@/analytics/types";
import { fetchWithSessionRefresh } from "@/lib/fetch-with-session";
import { useAuth } from "@/store/useAuth";

export type CategoryPoint = CategoryMetric;
export type WeakTopicPoint = CategoryMetric;
export type { DashboardAnalyticsViewModel };

type UseDashboardAnalyticsResult = {
  data: DashboardAnalyticsViewModel | null;
  loading: boolean;
  error: string | null;
  hasEnoughAttempts: boolean;
  refetch: () => Promise<void>;
};

export function useDashboardAnalytics(): UseDashboardAnalyticsResult {
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const [data, setData] = useState<DashboardAnalyticsViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    signOut();
    if (typeof window !== "undefined") {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [signOut]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const isAdmin = user?.is_admin === true;
      const [dashboardResult, summaryResult] = await Promise.allSettled([
        fetchWithSessionRefresh("/api/analytics/dashboard", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
        fetchWithSessionRefresh("/api/analytics/summary", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
      ]);

      if (dashboardResult.status === "fulfilled" && dashboardResult.value.status === 401) {
        redirectToLogin();
        return;
      }
      if (summaryResult.status === "fulfilled" && summaryResult.value.status === 401) {
        redirectToLogin();
        return;
      }

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
      if (isAdmin) {
        try {
          const funnelResponse = await fetchWithSessionRefresh("/api/analytics/funnel", {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          });

          if (funnelResponse.status === 401) {
            redirectToLogin();
            return;
          }

          if (funnelResponse.ok) {
            funnelPayload = (await funnelResponse.json()) as RawFunnelResponse;
          }
        } catch {
          funnelPayload = null;
        }
      }

      setData(normalizeAnalytics(dashboardPayload, funnelPayload, summaryPayload));
    } catch (err) {
      console.error("Dashboard analytics yuklanmadi", err);
      setError("Analitika ma'lumotlari yuklanmadi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user?.is_admin, redirectToLogin]);

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
