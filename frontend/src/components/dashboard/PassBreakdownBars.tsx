"use client";

import { memo } from "react";

type Factor = {
  key: string;
  label: string;
  weight: number;
  score: number;
  weightedScore: number;
};

type Props = {
  explanation: string;
  factors: Factor[];
};

function barColor(score: number): string {
  if (score >= 75) return "from-emerald-400 to-cyan-400";
  if (score >= 50) return "from-sky-400 to-indigo-400";
  if (score >= 35) return "from-amber-400 to-orange-400";
  return "from-rose-400 to-red-400";
}

function PassBreakdownBarsComponent({ explanation, factors }: Props) {
  return (
    <section className="rounded-3xl border border-[#1F2A44] bg-gradient-to-br from-[#111a2f] to-[#0b1324] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">O'tish ehtimoli omillari</h3>
        <p className="text-sm text-slate-300">{explanation}</p>
      </div>

      <div className="space-y-3">
        {factors.length === 0 ? (
          <p className="rounded-xl border border-[#22324e] bg-[#0f1b31] px-3 py-2 text-sm text-slate-300">
            Omillar bo'yicha ma'lumot hali shakllanmagan.
          </p>
        ) : (
          factors.map((factor) => (
            <div key={factor.key} className="rounded-2xl border border-[#22324e] bg-[#0f1b31] p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-100">{factor.label}</span>
                <span className="text-slate-300">
                  {Math.round(factor.score)}% • vazn {Math.round(factor.weight)}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1d2a43]">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barColor(factor.score)} transition-all duration-700`}
                  style={{ width: `${Math.max(4, Math.min(100, factor.weightedScore))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default memo(PassBreakdownBarsComponent);

