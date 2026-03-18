"use client";

import { useMemo } from "react";

import { getAnalyticsSummary, getDashboardAnalytics, getIntelligenceHistory } from "@/api/analytics";
import { useOptionalProgressSnapshot } from "@/components/providers/progress-provider";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useUser } from "@/hooks/use-user";

export function useAnalytics() {
  const { authenticated } = useUser();
  const progress = useOptionalProgressSnapshot();
  const dashboardResource = useAsyncResource(getDashboardAnalytics, [authenticated], authenticated && !progress, {
    cacheKey: "analytics:dashboard",
    staleTimeMs: 30_000,
  });
  const summaryResource = useAsyncResource(getAnalyticsSummary, [authenticated], authenticated && !progress, {
    cacheKey: "analytics:summary",
    staleTimeMs: 30_000,
  });
  const historyResource = useAsyncResource(getIntelligenceHistory, [authenticated], authenticated, {
    cacheKey: "analytics:intelligence-history",
    staleTimeMs: 30_000,
  });

  const loading = progress
    ? progress.dashboardLoading || historyResource.loading
    : dashboardResource.loading || summaryResource.loading || historyResource.loading;
  const error = progress
    ? progress.dashboardError ?? historyResource.error
    : dashboardResource.error ?? summaryResource.error ?? historyResource.error;
  const dashboard = progress ? progress.dashboard : dashboardResource.data;
  const summary = progress ? progress.summary : summaryResource.data;

  return useMemo(
    () => ({
      dashboard,
      summary,
      history: historyResource.data ?? [],
      loading,
      error,
      reload: async () => {
        await Promise.allSettled([
          progress ? progress.reload() : dashboardResource.reload({ force: true }),
          progress ? Promise.resolve() : summaryResource.reload({ force: true }),
          historyResource.reload({ force: true }),
        ]);
      },
    }),
    [dashboard, dashboardResource, error, historyResource, loading, progress, summary, summaryResource],
  );
}
