"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";

import { trackMonetizationEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function PremiumLock({
  children,
  isLocked,
  featureKey,
  featureName,
  source = "premium_lock",
  onUnlockClick,
  className,
}: {
  children: React.ReactNode;
  isLocked: boolean;
  featureKey?: string;
  featureName: string;
  source?: string;
  onUnlockClick: () => void;
  className?: string;
}) {
  const wasLockedRef = useRef(false);

  useEffect(() => {
    if (!isLocked) {
      wasLockedRef.current = false;
      return;
    }

    if (wasLockedRef.current) {
      return;
    }

    wasLockedRef.current = true;
    if (featureKey) {
      void trackMonetizationEvent("premium_block_view", featureKey, {
        source,
      });
    }
  }, [featureKey, isLocked, source]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        aria-hidden={isLocked}
        className={cn(
          "transition duration-300",
          isLocked && "pointer-events-none scale-[1.01] select-none blur-[7px] brightness-[0.58]",
        )}
      >
        {children}
      </div>

      <AnimatePresence>
        {isLocked ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => {
              if (featureKey) {
                void trackMonetizationEvent("feature_locked_click", featureKey, {
                  source,
                });
              }
              onUnlockClick();
            }}
            className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(180deg,rgba(7,12,21,0.26),rgba(7,12,21,0.72))] p-5 text-left"
          >
            <div className="max-w-sm rounded-[1.6rem] border border-white/12 bg-[color-mix(in_oklab,var(--card)_90%,rgba(5,10,20,0.8))] px-5 py-5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.65)] backdrop-blur-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Lock className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/68">Premium</p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">{featureName}</h3>
              <p className="mt-2 text-sm leading-6 text-white/74">
                This section stays visible, but the full feature unlocks after upgrade.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/14">
                <Sparkles className="h-4 w-4" />
                Upgrade Now
              </div>
            </div>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
