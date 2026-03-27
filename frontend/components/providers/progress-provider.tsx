"use client";

import { createContext, useContext } from "react";

import { getAnalyticsSummary, getDashboardAnalytics } from "@/api/analytics";
import { getGamificationSummary } from "@/api/gamification";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useUser } from "@/hooks/use-user";
import type { AnalyticsSummary, DashboardAnalytics } from "@/types/analytics";
import type { GamificationSummary } from "@/types/gamification";

type ProgressContextValue = {
  dashboard: DashboardAnalytics | null;
  summary: AnalyticsSummary | null;
  gamification: GamificationSummary | null;
  loading: boolean;
  topbarLoading: boolean;
  dashboardLoading: boolean;
  summaryLoading: boolean;
  dashboardError: unknown;
  summaryError: unknown;
  topbarError: unknown;
  gamificationError: unknown;
  reload: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, loading: authLoading } = useUser();
  const resourcesEnabled = authenticated && !authLoading;

  const dashboardResource = useAsyncResource(getDashboardAnalytics, [authenticated], resourcesEnabled, {
    cacheKey: "analytics:dashboard",
    staleTimeMs: 30_000,
  });
  const summaryResource = useAsyncResource(getAnalyticsSummary, [authenticated], resourcesEnabled, {
    cacheKey: "analytics:summary",
    staleTimeMs: 30_000,
  });
  const gamificationResource = useAsyncResource(getGamificationSummary, [authenticated], resourcesEnabled, {
    cacheKey: "gamification:summary",
    staleTimeMs: 15_000,
  });

  const reload = async () => {
    await Promise.allSettled([
      dashboardResource.reload({ force: true }),
      summaryResource.reload({ force: true }),
      gamificationResource.reload({ force: true }),
    ]);
  };

  const value: ProgressContextValue = {
    dashboard: dashboardResource.data,
    summary: summaryResource.data,
    gamification: gamificationResource.data,
    loading: authLoading || dashboardResource.loading || summaryResource.loading || gamificationResource.loading,
    topbarLoading: authLoading || dashboardResource.loading || gamificationResource.loading,
    dashboardLoading: authLoading || dashboardResource.loading,
    summaryLoading: authLoading || summaryResource.loading,
    dashboardError: dashboardResource.error,
    summaryError: summaryResource.error,
    topbarError: dashboardResource.error ?? gamificationResource.error,
    gamificationError: gamificationResource.error,
    reload,
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgressSnapshot() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgressSnapshot must be used inside ProgressProvider");
  }
  return context;
}

export function useOptionalProgressSnapshot() {
  return useContext(ProgressContext);
}
