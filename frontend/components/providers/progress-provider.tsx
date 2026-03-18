"use client";

import { createContext, useContext, useMemo } from "react";

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
  dashboardError: unknown;
  topbarError: unknown;
  gamificationError: unknown;
  reload: () => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useUser();

  const dashboardResource = useAsyncResource(getDashboardAnalytics, [authenticated], authenticated, {
    cacheKey: "analytics:dashboard",
    staleTimeMs: 30_000,
  });
  const summaryResource = useAsyncResource(getAnalyticsSummary, [authenticated], authenticated, {
    cacheKey: "analytics:summary",
    staleTimeMs: 30_000,
  });
  const gamificationResource = useAsyncResource(getGamificationSummary, [authenticated], authenticated, {
    cacheKey: "gamification:summary",
    staleTimeMs: 15_000,
  });

  const value = useMemo<ProgressContextValue>(
    () => ({
      dashboard: dashboardResource.data,
      summary: summaryResource.data,
      gamification: gamificationResource.data,
      loading: dashboardResource.loading || summaryResource.loading || gamificationResource.loading,
      topbarLoading: dashboardResource.loading || gamificationResource.loading,
      dashboardLoading: dashboardResource.loading || summaryResource.loading,
      dashboardError: dashboardResource.error ?? summaryResource.error,
      topbarError: dashboardResource.error ?? gamificationResource.error,
      gamificationError: gamificationResource.error,
      reload: async () => {
        await Promise.allSettled([
          dashboardResource.reload({ force: true }),
          summaryResource.reload({ force: true }),
          gamificationResource.reload({ force: true }),
        ]);
      },
    }),
    [
      dashboardResource.data,
      dashboardResource.error,
      dashboardResource.loading,
      dashboardResource.reload,
      gamificationResource.data,
      gamificationResource.error,
      gamificationResource.loading,
      gamificationResource.reload,
      summaryResource.data,
      summaryResource.error,
      summaryResource.loading,
      summaryResource.reload,
    ],
  );

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
