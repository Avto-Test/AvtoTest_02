"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { BadgeV2, ButtonV2, CardV2 } from "@/components/ui-v2";

interface ZonePremiumV2Props {
  overview:
    | {
        confidence_score?: number;
        retention_vector?: Array<{
          retention?: number;
          [key: string]: unknown;
        }>;
        total_due?: number;
        total_attempts?: number;
        cognitive_stability?: string | null;
        [key: string]: unknown;
      }
    | null;
  user?:
    | {
        plan?: string;
      }
    | null;
}

function toPercent(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  const numeric = Number(value);
  if (numeric <= 1) return Math.round(numeric * 100);
  return Math.round(numeric);
}

function getConfidence(overview: ZonePremiumV2Props["overview"]) {
  return toPercent(overview?.confidence_score);
}

function getRetentionScore(overview: ZonePremiumV2Props["overview"]) {
  const retention = Array.isArray(overview?.retention_vector) ? overview.retention_vector : [];
  const values = retention
    .map((item) => item?.retention)
    .filter((value): value is number => Number.isFinite(value))
    .map((value) => (value <= 1 ? value * 100 : value));

  if (values.length === 0) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(avg);
}

function getReviewQueueCount(overview: ZonePremiumV2Props["overview"]) {
  if (Number.isFinite(overview?.total_due)) return Number(overview?.total_due);
  return 0;
}

function getStabilityLabel(overview: ZonePremiumV2Props["overview"]) {
  const stability = overview?.cognitive_stability;
  if (typeof stability === "string" && stability.trim().length > 0) return stability;
  return "Unknown";
}

export function ZonePremiumV2({ overview, user }: ZonePremiumV2Props) {
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const hasTrackedPremiumBlockView = useRef(false);
  const isPremium = user?.plan === "premium";

  const confidence = getConfidence(overview);
  const retentionScore = getRetentionScore(overview);
  const reviewQueueCount = getReviewQueueCount(overview);
  const stabilityLabel = getStabilityLabel(overview);
  const previewConfidence = Number.isFinite(confidence) ? confidence : 78;
  const previewRetention = Number.isFinite(retentionScore) ? retentionScore : 83;
  const previewVolatility = Math.max(4, Math.round((100 - previewConfidence) * 0.35));
  const previewCohortRank = Math.max(5, Math.min(95, Math.round(100 - previewConfidence + 20)));

  useEffect(() => {
    if (isPremium || hasTrackedPremiumBlockView.current) {
      return;
    }

    hasTrackedPremiumBlockView.current = true;
    trackEvent("premium_block_view", {
      attempts: overview?.total_attempts ?? 0,
      confidence: previewConfidence,
    });
  }, [isPremium, overview?.total_attempts, previewConfidence]);

  const handleUpgradeClick = () => {
    if (isUpgrading) return;

    trackEvent("upgrade_click", {
      attempts: overview?.total_attempts ?? 0,
      confidence: previewConfidence,
    });

    setIsUpgrading(true);
    router.push("/upgrade");
  };

  return (
    <section className="space-y-6">
      {!isPremium ? (
        <CardV2 className="border-[var(--v2-border)] bg-[var(--v2-surface-subtle)] p-6 shadow-sm transition-all duration-200 hover:border-[var(--v2-border-strong)] hover:shadow-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <BadgeV2 variant="info" className="gap-1">
                <Lock className="h-3 w-3" />
                Premium
              </BadgeV2>
              <h2 className="text-sm font-medium text-[var(--v2-text-primary)]">
                Unlock Your Performance Intelligence
              </h2>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-[var(--v2-text-tertiary)]">
                  You&apos;re currently missing advanced intelligence:
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--v2-text-primary)] marker:text-[var(--v2-text-tertiary)]">
                  <li>Real exam pass probability visibility</li>
                  <li>Retention stability tracking</li>
                  <li>High-impact review prioritization</li>
                  <li>Early instability detection</li>
                </ul>
              </div>
            </div>
            <div className="pt-1 sm:ml-auto sm:pt-0">
              <p className="text-xs text-[var(--v2-text-tertiary)]">Preview of locked intelligence:</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="relative">
                  <CardV2 className="relative p-3 blur-sm opacity-60 pointer-events-none">
                    <p className="text-xs text-[var(--v2-text-tertiary)]">Confidence Volatility</p>
                    <p className="text-sm font-semibold text-[var(--v2-text-primary)]">
                      ~{previewVolatility}% variance
                    </p>
                    <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/20 pointer-events-none">
                      <p className="text-xs font-semibold text-white drop-shadow-sm">
                        {"\uD83D\uDD12 Unlock to view"}
                      </p>
                    </div>
                  </CardV2>
                </div>
                <div className="relative">
                  <CardV2 className="relative p-3 blur-sm opacity-60 pointer-events-none">
                    <p className="text-xs text-[var(--v2-text-tertiary)]">Long-term Retention Curve</p>
                    <p className="text-sm font-semibold text-[var(--v2-text-primary)]">
                      {previewRetention}% projected
                    </p>
                    <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/20 pointer-events-none">
                      <p className="text-xs font-semibold text-white drop-shadow-sm">
                        {"\uD83D\uDD12 Unlock to view"}
                      </p>
                    </div>
                  </CardV2>
                </div>
                <div className="relative">
                  <CardV2 className="relative p-3 blur-sm opacity-60 pointer-events-none">
                    <p className="text-xs text-[var(--v2-text-tertiary)]">Cohort Comparison</p>
                    <p className="text-sm font-semibold text-[var(--v2-text-primary)]">
                      Top {previewCohortRank}% peers
                    </p>
                    <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/20 pointer-events-none">
                      <p className="text-xs font-semibold text-white drop-shadow-sm">
                        {"\uD83D\uDD12 Unlock to view"}
                      </p>
                    </div>
                  </CardV2>
                </div>
              </div>
              {(() => {
                const totalAttempts = overview?.total_attempts;
                if (typeof totalAttempts === "number" && totalAttempts > 0) {
                  return (
                    <>
                      <p className="mt-2 text-xs text-[var(--v2-text-secondary)]">
                        Based on your {totalAttempts} completed tests, advanced intelligence can now optimize your
                        weakest areas.
                      </p>
                      <p className="mt-1 text-xs text-[var(--v2-text-secondary)]">
                        Advanced users show measurable stability improvements over time.
                      </p>
                    </>
                  );
                }

                return (
                  <>
                    <p className="mt-2 text-xs text-[var(--v2-text-secondary)]">
                      Premium intelligence activates after your first completed test.
                    </p>
                    <p className="mt-1 text-xs text-[var(--v2-text-secondary)]">
                      Performance intelligence becomes more powerful with consistent usage.
                    </p>
                  </>
                );
              })()}
              <ButtonV2
                variant="primary"
                className={`flex-1 sm:flex-none transition-transform duration-150 ${
                  isUpgrading ? "opacity-80 cursor-not-allowed" : "hover:scale-[1.02]"
                }`}
                onClick={handleUpgradeClick}
                disabled={isUpgrading}
              >
                {isUpgrading ? "Redirecting\u2026" : "Upgrade to Premium"}
              </ButtonV2>
              <p className="mt-2 text-xs text-[var(--v2-text-tertiary)]">
                Upgrade now and unlock full intelligence instantly.
              </p>
              <p className="mt-1 text-xs text-[var(--v2-text-tertiary)]">
                Used by candidates preparing for competitive exams.
              </p>
            </div>
          </div>
        </CardV2>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <CardV2 className="p-6 shadow-sm md:col-span-2">
            <div className="space-y-4">
              <p className="text-sm text-[var(--v2-text-tertiary)]">Pass Probability Confidence</p>
              <p className="text-4xl font-mono font-semibold text-[var(--v2-text-primary)]">{confidence}%</p>
            </div>
          </CardV2>

          <CardV2 className="p-5 shadow-none">
            <div className="space-y-4">
              <p className="text-sm text-[var(--v2-text-tertiary)]">Retention Score</p>
              <p className="text-3xl font-mono font-semibold text-[var(--v2-text-primary)]">{retentionScore}%</p>
            </div>
          </CardV2>

          <CardV2 className="p-4 shadow-none">
            <div className="space-y-4">
              <p className="text-sm text-[var(--v2-text-tertiary)]">Review Queue Count</p>
              <p className="text-2xl font-mono font-semibold text-[var(--v2-text-primary)]">
                {reviewQueueCount}
              </p>
            </div>
          </CardV2>

          <CardV2 className="p-4 shadow-none">
            <div className="space-y-4">
              <p className="text-sm text-[var(--v2-text-tertiary)]">Knowledge Stability</p>
              <p className="text-xl font-semibold text-[var(--v2-text-primary)]">{stabilityLabel}</p>
            </div>
          </CardV2>
        </div>
      )}
    </section>
  );
}
