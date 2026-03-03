import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { BadgeV2, ButtonV2, CardV2 } from "@/components/ui-v2";

interface ZoneRevenueTriggersV2Props {
  isPremium: boolean;
  passProbability: number;
  readinessScore: number;
  hasRetentionInstability: boolean;
  totalAttempts: number;
}

export function ZoneRevenueTriggersV2({
  isPremium,
  passProbability,
  readinessScore,
  hasRetentionInstability,
  totalAttempts,
}: ZoneRevenueTriggersV2Props) {
  const router = useRouter();
  const hasTrackedView = useRef(false);

  const shouldShowStabilityTrigger = !isPremium && passProbability > 70;
  const shouldShowAdaptiveTrigger = !isPremium && hasRetentionInstability;
  const shouldShowWarningBanner = !isPremium && readinessScore >= 70 && hasRetentionInstability;
  const shouldShowSection =
    shouldShowWarningBanner || shouldShowStabilityTrigger || shouldShowAdaptiveTrigger;

  useEffect(() => {
    if (!shouldShowSection || hasTrackedView.current) {
      return;
    }

    hasTrackedView.current = true;
    trackEvent("premium_block_view", {
      source: "smart_upgrade_triggers",
      attempts: totalAttempts,
      pass_probability: passProbability,
      readiness_score: readinessScore,
      retention_instability: hasRetentionInstability,
    });
  }, [
    shouldShowSection,
    totalAttempts,
    passProbability,
    readinessScore,
    hasRetentionInstability,
  ]);

  const handleUpgradeClick = (trigger: "stability_unlock" | "adaptive_reinforcement") => {
    trackEvent("upgrade_click", {
      source: "smart_upgrade_triggers",
      trigger,
      attempts: totalAttempts,
      pass_probability: passProbability,
      readiness_score: readinessScore,
      retention_instability: hasRetentionInstability,
    });
    router.push("/upgrade");
  };

  if (!shouldShowSection) {
    return null;
  }

  return (
    <section className="space-y-4">
      {shouldShowWarningBanner ? (
        <CardV2 className="border-[var(--v2-warning)]/30 bg-[var(--v2-warning-bg)] p-4 shadow-none">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--v2-warning)]" />
            <p className="text-sm text-[var(--v2-text-secondary)]">
              Your readiness is improving, but hidden instability may reduce exam performance.
            </p>
          </div>
        </CardV2>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {shouldShowStabilityTrigger ? (
          <CardV2 className="p-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <BadgeV2 variant="info" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Smart Upgrade Trigger
                </BadgeV2>
                <p className="text-sm text-[var(--v2-text-secondary)]">
                  Your pass probability has crossed a strong threshold. Unlock stability diagnostics to protect this momentum.
                </p>
              </div>
              <ButtonV2
                variant="primary"
                className="flex-1 sm:flex-none"
                onClick={() => handleUpgradeClick("stability_unlock")}
              >
                Unlock Stability Insights
              </ButtonV2>
            </div>
          </CardV2>
        ) : null}

        {shouldShowAdaptiveTrigger ? (
          <CardV2 className="p-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <BadgeV2 variant="warning">Retention Instability Detected</BadgeV2>
                <p className="text-sm text-[var(--v2-text-secondary)]">
                  Adaptive reinforcement can intervene before retention decay impacts your exam-day consistency.
                </p>
              </div>
              <ButtonV2
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => handleUpgradeClick("adaptive_reinforcement")}
              >
                Upgrade to Pro for Adaptive Reinforcement
              </ButtonV2>
            </div>
          </CardV2>
        ) : null}
      </div>
    </section>
  );
}
