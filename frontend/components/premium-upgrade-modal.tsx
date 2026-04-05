"use client";

import { Crown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { trackMonetizationEvent } from "@/lib/analytics";
import { FEATURES } from "@/lib/features";
import { formatDate } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Modal } from "@/shared/ui/modal";
import type { PlatformFeature } from "@/types/feature";

const FEATURE_COPY: Record<
  string,
  {
    summary: string;
    benefits: string[];
  }
> = {
  [FEATURES.ANALYTICS]: {
    summary: "Deep analytics, mastery vectors, and actionable weak-topic visibility unlock after upgrade.",
    benefits: [
      "Full topic mastery breakdown",
      "Retention and question-bank coverage",
      "Expanded learning recommendations",
    ],
  },
  [FEATURES.AI_PREDICTION]: {
    summary: "Prediction signals and AI guidance open once premium access is active.",
    benefits: [
      "Historical readiness trend",
      "Confidence and pass-probability insights",
      "AI explanation tools and prediction history",
    ],
  },
  [FEATURES.SIMULATION]: {
    summary: "Run the full exam simulation workflow with premium access.",
    benefits: [
      "Start full simulation exams",
      "Review recent simulation history",
      "Keep readiness and exam prep in one flow",
    ],
  },
};

type PremiumUpgradeModalProps = {
  open: boolean;
  feature: PlatformFeature | null;
  source: string;
  intensity: "default" | "aggressive";
  onClose: () => void;
};

export function PremiumUpgradeModal({
  open,
  feature,
  source,
  intensity,
  onClose,
}: PremiumUpgradeModalProps) {
  const router = useRouter();

  if (!feature) {
    return null;
  }

  const copy = FEATURE_COPY[feature.key] ?? {
    summary: `${feature.name} premium access orqali ochiladi.`,
    benefits: [
      "Locked premium functionality",
      "Admin-controlled feature rollout",
      "Secure backend access validation",
    ],
  };

  const handleUpgrade = () => {
    void trackMonetizationEvent("upgrade_click", feature.key, {
      source: `${source}:modal_cta`,
      prompt_variant: intensity,
      user_segment: feature.user_segment ?? null,
      current_price: feature.current_price ?? null,
    });
    onClose();
    router.push(
      `/upgrade?feature=${encodeURIComponent(feature.key)}&source=${encodeURIComponent(source)}&prompt=${encodeURIComponent(intensity)}`,
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Unlock Premium Feature" className="max-w-2xl">
      <div className="space-y-6">
        <div className="rounded-[1.5rem] border border-[color-mix(in_oklab,var(--accent-brand)_18%,transparent)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent-brand)_14%,transparent),color-mix(in_oklab,var(--card)_96%,transparent))] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent-brand)_18%,transparent)] text-[var(--accent-brand)]">
              <Crown className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                Premium access
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {feature.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{copy.summary}</p>
              {intensity === "aggressive" ? (
                <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  You have tried this locked flow multiple times. Premium will remove the repeated interruption and unlock the full experience immediately.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {copy.benefits.map((benefit) => (
            <div
              key={benefit}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_96%,var(--background))] px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent-brand)_14%,transparent)] text-[var(--accent-brand)]">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-sm text-[var(--foreground)]">{benefit}</p>
            </div>
          ))}
        </div>

        {feature.enabled_for_all_until ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 px-4 py-3 text-sm text-[var(--muted-foreground)]">
            Limited-time free access windows can be scheduled until {formatDate(feature.enabled_for_all_until)}.
          </div>
        ) : null}

        {typeof feature.current_price === "number" && feature.current_price > 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/35 px-4 py-3 text-sm text-[var(--muted-foreground)]">
            Premium access for this feature is currently priced from ${feature.current_price.toFixed(2)}.
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Later
          </Button>
          <Button onClick={handleUpgrade}>Upgrade Now</Button>
        </div>
      </div>
    </Modal>
  );
}
