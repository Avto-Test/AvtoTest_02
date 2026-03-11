"use client";

import { memo, useMemo, useEffect, useState } from "react";

type MlStatus = "rule_only" | "ml_active";

type Props = {
  passProbability: number;
  mlStatus?: MlStatus;
  passProbabilityMl?: number | null;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getGaugeMeta(value: number) {
  if (value < 40) {
    return {
      label: "Tayyorlanish kerak",
      sublabel: "Ko'proq mashq qiling va zaif mavzularni kuchaytiring.",
      ring: "#EF4444", // red-500
      glow: "rgba(239,68,68,0.18)",
      textClass: "text-red-600 dark:text-red-400",
      badgeClass: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-200",
    };
  }
  if (value < 70) {
    return {
      label: "O'rtacha tayyorgarlik",
      sublabel: "Barqaror rivojlanish kuzatilmoqda.",
      ring: "#F59E0B", // amber-500
      glow: "rgba(245,158,11,0.18)",
      textClass: "text-amber-600 dark:text-amber-400",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200",
    };
  }
  return {
    label: "Imtihonga tayyor",
    sublabel: "Siz deyarli imtihonga tayyorsiz.",
    ring: "#10B981", // emerald-500
    glow: "rgba(16,185,129,0.18)",
    textClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200",
  };
}

function MlStatusBadge({ mlStatus }: { mlStatus: MlStatus }) {
  if (mlStatus === "ml_active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200 transition-colors duration-300">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-pulse" />
        🤖 AI Model Faol
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-400/30 dark:bg-slate-500/15 dark:text-slate-300 transition-colors duration-300">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      📊 Qoida Asosida
    </span>
  );
}

function PassProbabilityGaugeComponent({ passProbability, mlStatus = "rule_only", passProbabilityMl }: Props) {
  const value = clamp(passProbability);
  const meta = useMemo(() => getGaugeMeta(value), [value]);

  // Client-side rendering for animation trigger
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // slight delay to ensure transition runs on initial load
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const currentDisplayValue = mounted ? value : 0;
  const ringDeg = `${(currentDisplayValue / 100) * 360}deg`;

  return (
    <section className="flex w-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 transition-colors duration-300">
          Imtihondan o&apos;tish ehtimoli
        </p>
        <MlStatusBadge mlStatus={mlStatus} />
      </div>

      {/* Gauge */}
      <div className="mx-auto flex flex-col items-center">
        <div
          className="relative h-52 w-52 rounded-full p-[13px] transition-all duration-700 ease-out dark:shadow-none"
          style={{
            background: `conic-gradient(${meta.ring} ${ringDeg}, rgba(148,163,184,0.15) ${ringDeg}, rgba(148,163,184,0.15) 360deg)`,
            boxShadow: mounted ? `0 0 32px ${meta.glow}` : "none",
          }}
        >
          <div className="relative flex h-full w-full flex-col items-center justify-center rounded-full border border-slate-100 bg-white text-center shadow-inner transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
            <p className={`text-[42px] font-bold leading-none tracking-tight transition-colors duration-700 ${meta.textClass}`}>
              {Math.round(currentDisplayValue)}%
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 transition-colors duration-300">O&apos;tish ehtimoli</p>
            <span className={`mt-2.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors duration-300 ${meta.badgeClass}`}>
              {meta.label}
            </span>
          </div>
        </div>

        <p className="mt-5 text-center text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors duration-300">{meta.sublabel}</p>

        {/* ML comparison row */}
        {mlStatus === "ml_active" && passProbabilityMl != null && (
          <div className="mt-6 flex w-full items-center justify-center gap-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition-colors duration-300 dark:border-slate-700/50 dark:bg-slate-900/50">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Qoida Modeli</p>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{Math.round(value)}%</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wide text-violet-600 dark:text-violet-400">AI Model</p>
              <p className="text-lg font-semibold text-violet-600 dark:text-violet-300">{Math.round(passProbabilityMl)}%</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(PassProbabilityGaugeComponent);
