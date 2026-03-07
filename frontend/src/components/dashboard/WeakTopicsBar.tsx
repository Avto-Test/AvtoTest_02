"use client";

import { memo, useMemo } from "react";

import type { WeakTopicPoint } from "@/hooks/useDashboardAnalytics";

type Props = {
  data: WeakTopicPoint[];
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getStatus(accuracy: number): "Very weak" | "Medium" | "Strong" {
  if (accuracy < 40) {
    return "Very weak";
  }
  if (accuracy < 70) {
    return "Medium";
  }
  return "Strong";
}

function getTone(accuracy: number) {
  if (accuracy < 40) {
    return {
      ring: "#f97316",
      soft: "rgba(249,115,22,0.16)",
      pill: "border-red-400/30 bg-red-500/10 text-red-200",
      percent: "text-red-300",
    };
  }
  if (accuracy < 70) {
    return {
      ring: "#fbbf24",
      soft: "rgba(251,191,36,0.16)",
      pill: "border-amber-300/30 bg-amber-500/10 text-amber-200",
      percent: "text-amber-200",
    };
  }
  return {
    ring: "#22c55e",
    soft: "rgba(34,197,94,0.16)",
    pill: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    percent: "text-emerald-200",
  };
}

function TopicPerformanceCardsComponent({ data }: Props) {
  const topics = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 6)
        .map((item) => ({
          ...item,
          accuracy: clampPercent(item.accuracy),
        })),
    [data]
  );

  if (!topics.length) {
    return (
      <section className="h-full rounded-3xl border border-[#1F2A44] bg-[#0B1324] p-6">
        <h3 className="text-lg font-semibold text-white">Zaif mavzular</h3>
        <p className="mt-2 text-sm text-slate-300">Zaif yo'nalishlarni ko'rish uchun kamida bir nechta test yakunlang.</p>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#111a2f] to-[#0b1324] p-6 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">Zaif mavzular</h3>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Top 6</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {topics.map((item) => {
          const tone = getTone(item.accuracy);
          const status = getStatus(item.accuracy);
          const ringStyle = {
            background: `conic-gradient(${tone.ring} ${item.accuracy}%, rgba(148,163,184,0.14) ${item.accuracy}% 100%)`,
          };

          return (
            <article
              key={`${item.category}-${item.accuracy}`}
              className="rounded-2xl border border-[#22324e] bg-[linear-gradient(180deg,rgba(15,27,49,0.98)_0%,rgba(10,17,31,0.94)_100%)] p-4 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{item.category}</p>
                  <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone.pill}`}>
                    {status}
                  </span>
                </div>

                <div className="relative h-16 w-16 shrink-0 rounded-full p-[6px]" style={ringStyle}>
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full border border-white/5 text-sm font-semibold text-white"
                    style={{ backgroundColor: tone.soft }}
                  >
                    {item.accuracy}%
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className={`text-3xl font-semibold leading-none ${tone.percent}`}>{item.accuracy}%</div>
                  <div className="mt-1 text-xs text-slate-400">Accuracy</div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Weakness</div>
                  <div className="mt-1 font-medium text-slate-300">{100 - item.accuracy}%</div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default memo(TopicPerformanceCardsComponent);
