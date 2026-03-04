"use client";

import { memo } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryPoint } from "@/hooks/useDashboardAnalytics";

type Props = {
  data: CategoryPoint[];
};

function CategoryRadarChartComponent({ data }: Props) {
  const normalized = data.map((item) => ({
    ...item,
    shortCategory: item.category.length > 16 ? `${item.category.slice(0, 15)}...` : item.category,
  }));
  const weakest = normalized.reduce(
    (acc, item) => (item.accuracy < acc.accuracy ? item : acc),
    normalized[0] ?? { category: "Noma'lum", accuracy: 0, shortCategory: "Noma'lum" }
  );

  return (
    <div className="h-[330px] w-full rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#111a2f] to-[#0b1324] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.2)]">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-white">Kategoriyalar bo'yicha bilim darajasi</h3>
        <p className="text-sm text-slate-300">Qaysi mavzularda kuchli yoki zaif ekaningiz</p>
      </div>
      <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
        Zaif yo'nalish: {weakest.category} ({Math.round(weakest.accuracy)}%)
      </div>
      <ResponsiveContainer width="100%" height="84%">
        <RadarChart data={normalized}>
          <defs>
            <linearGradient id="radarSoft" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="#22324e" opacity={0.45} />
          <PolarAngleAxis dataKey="shortCategory" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#0B1324",
              border: "1px solid #1F2A44",
              borderRadius: 12,
              color: "#e2e8f0",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Aniqlik"]}
            labelFormatter={(label) => String(label)}
          />
          <Radar
            name="Kategoriya"
            dataKey="accuracy"
            stroke="#38bdf8"
            fill="url(#radarSoft)"
            fillOpacity={1}
            isAnimationActive
            animationDuration={700}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(CategoryRadarChartComponent);
