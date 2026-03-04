"use client";

import { memo, useMemo } from "react";
import type { WeakTopicPoint } from "@/hooks/useDashboardAnalytics";

type Props = {
  data: WeakTopicPoint[];
};

function WeakTopicsBarComponent({ data }: Props) {
  const sorted = useMemo(() => [...data].sort((a, b) => a.accuracy - b.accuracy).slice(0, 6), [data]);

  if (!sorted.length) {
    return (
      <section className="h-full rounded-3xl border border-[#1F2A44] bg-[#0B1324] p-6">
        <h3 className="text-lg font-semibold text-white">Zaif mavzular</h3>
        <p className="mt-2 text-sm text-slate-300">Zaif yo'nalishlarni ko'rish uchun kamida bir nechta test yakunlang.</p>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#111a2f] to-[#0b1324] p-6 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Zaif mavzular</h3>
        <p className="text-sm text-slate-300">Eng ko'p xato qilinayotgan mavzular</p>
      </div>

      <div className="space-y-3">
        {sorted.map((item) => {
          const progress = Math.max(0, Math.min(100, item.accuracy));
          const weakness = 100 - progress;
          const barWidth = `${Math.max(8, weakness)}%`;

          return (
            <article key={`${item.category}-${item.accuracy}`} className="space-y-1.5 rounded-2xl border border-[#22324e] bg-[#0f1b31]/90 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-slate-100">{item.category}</p>
                <span className="text-xs font-semibold text-amber-300">{Math.round(progress)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800/90">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 transition-all duration-500"
                  style={{ width: barWidth }}
                />
              </div>
              <p className="text-xs text-slate-400">Zaiflik darajasi: {Math.round(weakness)}%</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default memo(WeakTopicsBarComponent);
