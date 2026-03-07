"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

import type { CategoryMetric } from "@/analytics/types";

type Props = {
  data: CategoryMetric[];
};

type TopicStatus = "Juda zaif" | "O'rtacha" | "Yaxshi" | "Kuchli";

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getStatus(accuracy: number): TopicStatus {
  if (accuracy < 30) {
    return "Juda zaif";
  }
  if (accuracy < 60) {
    return "O'rtacha";
  }
  if (accuracy < 80) {
    return "Yaxshi";
  }
  return "Kuchli";
}

function getTone(accuracy: number) {
  if (accuracy < 30) {
    return {
      ring: "#ef4444",
      soft: "rgba(239,68,68,0.14)",
      badge: "border-red-400/30 bg-red-500/10 text-red-200",
      percent: "text-red-300",
      bar: "from-red-400 to-orange-400",
    };
  }

  if (accuracy < 60) {
    return {
      ring: "#f59e0b",
      soft: "rgba(245,158,11,0.16)",
      badge: "border-amber-300/30 bg-amber-500/10 text-amber-200",
      percent: "text-amber-200",
      bar: "from-amber-300 to-orange-300",
    };
  }

  if (accuracy < 80) {
    return {
      ring: "#22c55e",
      soft: "rgba(34,197,94,0.16)",
      badge: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
      percent: "text-emerald-200",
      bar: "from-emerald-300 to-green-300",
    };
  }

  return {
    ring: "#14b8a6",
    soft: "rgba(20,184,166,0.16)",
    badge: "border-teal-400/30 bg-teal-500/10 text-teal-100",
    percent: "text-teal-100",
    bar: "from-teal-300 to-cyan-300",
  };
}

function AnimatedAccuracyRing({ accuracy, ringColor, softColor }: { accuracy: number; ringColor: string; softColor: string }) {
  const [progress, setProgress] = useState(accuracy === 0 ? 0 : 0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      return;
    }

    hasAnimated.current = true;
    if (accuracy === 0) {
      setProgress(0);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setProgress(accuracy);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [accuracy]);

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative h-[72px] w-[72px] shrink-0" aria-hidden="true">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: accuracy === 0 ? undefined : "stroke-dashoffset 720ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div
        className="absolute inset-[10px] flex items-center justify-center rounded-full border border-white/5 text-sm font-semibold text-white"
        style={{ backgroundColor: softColor }}
      >
        {accuracy}%
      </div>
    </div>
  );
}

function TopicPerformanceCardsComponent({ data }: Props) {
  const topics = useMemo(
    () =>
      data.slice(0, 6).map((item) => ({
        ...item,
        category: item.category?.trim() || "Ma'lumot yetarli emas",
        accuracy: clampPercent(item.accuracy),
        coverage: item.coverage === null ? null : clampPercent(item.coverage),
      })),
    [data]
  );

  if (!topics.length) {
    return (
      <section
        aria-label="Zaif mavzular kartalari"
        className="h-full rounded-3xl border border-[#1F2A44] bg-[#0B1324] p-6"
      >
        <h3 className="text-lg font-semibold text-white">Zaif mavzular</h3>
        <p className="mt-2 text-sm text-slate-300">Analitika uchun hali yetarli ma'lumot yo'q.</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Zaif mavzular kartalari"
      className="min-w-0 rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#111a2f] to-[#0b1324] p-6 shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">Zaif mavzular</h3>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">6 ta</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {topics.map((item) => {
          const tone = getTone(item.accuracy);
          const status = getStatus(item.accuracy);
          const coverageLabel = item.coverage === null ? null : `${item.coverage}%`;

          return (
            <article
              key={`${item.id ?? item.category}-${item.accuracy}`}
              aria-label={`${item.category} mavzusi aniqligi ${item.accuracy}%${coverageLabel ? `, qamrovi ${coverageLabel}` : ""}`}
              className="group relative rounded-2xl border border-[#22324e] bg-[linear-gradient(180deg,rgba(15,27,49,0.98)_0%,rgba(10,17,31,0.94)_100%)] p-4 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_18px_34px_rgba(0,0,0,0.28)]"
            >
              <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 translate-y-2 rounded-xl border border-[#22324e] bg-[#08111f]/95 px-3 py-2 text-xs text-slate-200 opacity-0 shadow-[0_14px_32px_rgba(0,0,0,0.28)] transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                <div>Aniqlik: {item.accuracy}%</div>
                {coverageLabel ? <div className="mt-1 text-slate-400">Qamrov: {coverageLabel}</div> : null}
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="max-w-[14rem] text-sm font-medium leading-5 text-slate-100"
                    title={item.category}
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.category}
                  </p>
                  <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone.badge}`}>
                    {status}
                  </span>
                </div>

                <AnimatedAccuracyRing accuracy={item.accuracy} ringColor={tone.ring} softColor={tone.soft} />
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className={`text-3xl font-semibold leading-none ${tone.percent}`}>{item.accuracy}%</div>
                  <div className="mt-1 text-xs text-slate-400">Aniqlik</div>
                </div>
                {coverageLabel ? <div className="text-xs text-slate-400">Qamrov {coverageLabel}</div> : null}
              </div>

              <div className="mt-4 space-y-2">
                <div className="h-1.5 rounded-full bg-slate-800/90">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
                    style={{ width: `${item.accuracy}%`, transition: "width 720ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const TopicPerformanceCards = memo(TopicPerformanceCardsComponent);

export { TopicPerformanceCards };
export default TopicPerformanceCards;
