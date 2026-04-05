"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getPlatformFeatures } from "@/api/features";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import { useAuth } from "@/components/providers/auth-provider";
import { trackMonetizationEvent } from "@/lib/analytics";
import { hasFeatureAccess } from "@/lib/feature-access";
import { FEATURES } from "@/lib/features";
import type { PlatformFeature } from "@/types/feature";

const UPGRADE_PROMPT_STORAGE_KEY = "autotest.premium.prompt.clicks.v1";

const DEFAULT_FEATURES: PlatformFeature[] = [
  {
    id: "default-analytics-view",
    key: FEATURES.ANALYTICS,
    name: "Advanced Analytics",
    is_premium: true,
    enabled_for_all_until: null,
    experiment_group: "analytics_unlock_test",
    rollout_percentage: 0,
    current_price: 10,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "default-ai-prediction",
    key: FEATURES.AI_PREDICTION,
    name: "AI Prediction",
    is_premium: true,
    enabled_for_all_until: null,
    experiment_group: "ai_prediction_test",
    rollout_percentage: 0,
    current_price: 10,
    created_at: new Date(0).toISOString(),
  },
  {
    id: "default-simulation-run",
    key: FEATURES.SIMULATION,
    name: "Simulation Run",
    is_premium: true,
    enabled_for_all_until: null,
    experiment_group: "simulation_unlock_test",
    rollout_percentage: 0,
    current_price: 10,
    created_at: new Date(0).toISOString(),
  },
];

type UpgradePromptIntensity = "default" | "aggressive";

type UpgradePromptState = {
  featureKey: string;
  source: string;
  intensity: UpgradePromptIntensity;
};

type FeatureAccessContextValue = {
  features: PlatformFeature[];
  loading: boolean;
  ready: boolean;
  error: unknown;
  reload: (options?: { force?: boolean }) => Promise<PlatformFeature[] | null>;
  getFeature: (featureKey: string) => PlatformFeature | null;
  hasAccess: (featureKey: string) => boolean;
  openUpgrade: (featureKey: string, options?: { source?: string }) => void;
  closeUpgrade: () => void;
};

const FeatureAccessContext = createContext<FeatureAccessContextValue | null>(null);

function readPromptClickCounts() {
  if (typeof window === "undefined") {
    return {} as Record<string, number>;
  }

  try {
    const raw = window.localStorage.getItem(UPGRADE_PROMPT_STORAGE_KEY);
    if (!raw) {
      return {} as Record<string, number>;
    }

    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {} as Record<string, number>;
  }
}

function incrementPromptClickCount(featureKey: string) {
  const counts = readPromptClickCounts();
  const nextCount = (counts[featureKey] ?? 0) + 1;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      UPGRADE_PROMPT_STORAGE_KEY,
      JSON.stringify({
        ...counts,
        [featureKey]: nextCount,
      }),
    );
  }

  return nextCount;
}

export function FeatureAccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [features, setFeatures] = useState<PlatformFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [promptState, setPromptState] = useState<UpgradePromptState | null>(null);

  const featureMap = useMemo(
    () => new Map(features.map((feature) => [feature.key, feature])),
    [features],
  );

  const reload = useCallback(async (options?: { force?: boolean }) => {
    setLoading(true);
    setError(null);

    try {
      const nextFeatures = await getPlatformFeatures({ force: options?.force });
      setFeatures(nextFeatures);
      return nextFeatures;
    } catch (nextError) {
      let fallbackFeatures = DEFAULT_FEATURES;
      setFeatures((current) => {
        fallbackFeatures = current.length > 0 ? current : DEFAULT_FEATURES;
        return fallbackFeatures;
      });
      setError(nextError);
      return fallbackFeatures;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<FeatureAccessContextValue>(
    () => ({
      features,
      loading,
      ready: !loading,
      error,
      reload,
      getFeature: (featureKey: string) => featureMap.get(featureKey) ?? null,
      hasAccess: (featureKey: string) => hasFeatureAccess(user, featureMap.get(featureKey) ?? null),
      openUpgrade: (featureKey: string, options) => {
        const source = options?.source?.trim() || "premium_lock";
        const clickCount = incrementPromptClickCount(featureKey);
        const feature = featureMap.get(featureKey) ?? null;
        const intensity: UpgradePromptIntensity =
          clickCount >= 3 || feature?.recommended_prompt_intensity === "aggressive"
            ? "aggressive"
            : "default";

        setPromptState({
          featureKey,
          source,
          intensity,
        });
        void trackMonetizationEvent("upgrade_click", featureKey, {
          source,
          click_count: clickCount,
          prompt_variant: intensity,
          user_segment: feature?.user_segment ?? null,
          current_price: feature?.current_price ?? null,
        });
      },
      closeUpgrade: () => setPromptState(null),
    }),
    [error, featureMap, features, loading, reload, user],
  );

  const selectedFeature = promptState ? featureMap.get(promptState.featureKey) ?? null : null;

  return (
    <FeatureAccessContext.Provider value={value}>
      {children}
      <PremiumUpgradeModal
        open={selectedFeature !== null}
        feature={selectedFeature}
        source={promptState?.source ?? "premium_lock"}
        intensity={promptState?.intensity ?? "default"}
        onClose={() => setPromptState(null)}
      />
    </FeatureAccessContext.Provider>
  );
}

export function useFeatureAccess() {
  const context = useContext(FeatureAccessContext);
  if (!context) {
    throw new Error("useFeatureAccess must be used inside FeatureAccessProvider");
  }
  return context;
}
