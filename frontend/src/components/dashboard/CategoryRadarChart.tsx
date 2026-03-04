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

  return (
    <div className="h-[320px] w-full rounded-2xl border border-[#1F2A44] bg-[#0B1324] p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white">Kategoriyalar bo'yicha natija</h3>
        <p className="text-sm text-slate-400">Qaysi mavzularda kuchli yoki zaif ekaningizni ko'ring</p>
      </div>
      <ResponsiveContainer width="100%" height="84%">
        <RadarChart data={normalized}>
          <PolarGrid stroke="#1F2A44" />
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
            stroke="#22d3ee"
            fill="#22d3ee"
            fillOpacity={0.35}
            isAnimationActive
            animationDuration={700}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(CategoryRadarChartComponent);
