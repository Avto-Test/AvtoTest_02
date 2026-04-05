"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getExperimentAssignments, type ExperimentAssignments } from "@/api/experiments";
import { useAuth } from "@/components/providers/auth-provider";
import { trackEvent } from "@/lib/analytics";

type ExperimentContextValue = {
  assignments: ExperimentAssignments;
  loading: boolean;
  getVariant: (experimentName: string, fallback?: string) => string;
};

const ExperimentContext = createContext<ExperimentContextValue | null>(null);

export function ExperimentProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, loading: authLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [resolvedAssignments, setResolvedAssignments] = useState<ExperimentAssignments>({});

  useEffect(() => {
    let cancelled = false;

    if (authLoading || !authenticated || !userId) {
      return () => {
        cancelled = true;
      };
    }

    void getExperimentAssignments()
      .then((nextAssignments) => {
        if (!cancelled) {
          setResolvedAssignments(nextAssignments);
          setResolvedUserId(userId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedAssignments({});
          setResolvedUserId(userId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, authLoading, userId]);

  useEffect(() => {
    const isFetching = authenticated && Boolean(userId) && resolvedUserId !== userId;
    if (authLoading || isFetching || !authenticated || !userId || typeof window === "undefined") {
      return;
    }

    const sessionKey = `ab-session-start:${userId}`;
    if (window.sessionStorage.getItem(sessionKey) === "1") {
      return;
    }

    window.sessionStorage.setItem(sessionKey, "1");
    void trackEvent("session_start", {
      source: "app_entry",
      path: window.location.pathname,
    });
  }, [authenticated, authLoading, resolvedUserId, userId]);

  const loading = authLoading || (authenticated && Boolean(userId) && resolvedUserId !== userId);

  const value = useMemo<ExperimentContextValue>(
    () => ({
      assignments: authenticated && !loading ? resolvedAssignments : {},
      loading,
      getVariant: (experimentName: string, fallback = "A") =>
        (authenticated && !loading ? resolvedAssignments : {})[experimentName] ?? fallback,
    }),
    [authenticated, loading, resolvedAssignments],
  );

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

export function useExperiments() {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error("useExperiments must be used inside ExperimentProvider");
  }
  return context;
}

export function useExperimentVariant(experimentName: string, fallback = "A") {
  return useExperiments().getVariant(experimentName, fallback);
}
