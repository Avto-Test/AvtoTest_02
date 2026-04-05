"use client";

import { useMemo } from "react";

import { getAnalyticsSummary, getDashboardAnalytics, getIntelligenceHistory } from "@/api/analytics";
import { useOptionalProgressSnapshot } from "@/components/providers/progress-provider";
import { useFeatureAccess } from "@/components/providers/feature-access-provider";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { type MonetizationEventType, trackMonetizationEvent } from "@/lib/analytics";
import { FEATURES } from "@/lib/features";
import { useUser } from "@/hooks/use-user";

export function useAnalytics() {
  const { authenticated } = useUser();
  const featureAccess = useFeatureAccess();
  const progress = useOptionalProgressSnapshot();
  const canLoadIntelligenceHistory =
    authenticated && featureAccess.ready && featureAccess.hasAccess(FEATURES.AI_PREDICTION);
  const dashboardResource = useAsyncResource(getDashboardAnalytics, [authenticated], authenticated && !progress, {
    cacheKey: "analytics:dashboard",
    staleTimeMs: 30_000,
  });
  const summaryResource = useAsyncResource(getAnalyticsSummary, [authenticated], authenticated && !progress, {
    cacheKey: "analytics:summary",
    staleTimeMs: 30_000,
  });
  const historyResource = useAsyncResource(
    getIntelligenceHistory,
    [authenticated, canLoadIntelligenceHistory, featureAccess.ready],
    canLoadIntelligenceHistory,
    {
      cacheKey: "analytics:intelligence-history",
      staleTimeMs: 30_000,
    },
  );

  const loading = progress
    ? progress.dashboardLoading || progress.summaryLoading || historyResource.loading
    : dashboardResource.loading || summaryResource.loading || historyResource.loading;
  const error = progress
    ? progress.dashboardError ?? progress.summaryError ?? historyResource.error
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
      track: (eventType: MonetizationEventType, featureKey?: string | null, metadata?: Record<string, unknown>) =>
        trackMonetizationEvent(eventType, featureKey, metadata),
      reload: async () => {
        await Promise.allSettled([
          progress ? progress.reload() : dashboardResource.reload({ force: true }),
          progress ? Promise.resolve() : summaryResource.reload({ force: true }),
          canLoadIntelligenceHistory ? historyResource.reload({ force: true }) : Promise.resolve(),
        ]);
      },
    }),
    [
      canLoadIntelligenceHistory,
      dashboard,
      dashboardResource,
      error,
      historyResource,
      loading,
      progress,
      summary,
      summaryResource,
    ],
  );
}
