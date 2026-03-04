"use client";

import { memo, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeakTopicPoint } from "@/hooks/useDashboardAnalytics";

type Props = {
  data: WeakTopicPoint[];
};

function WeakTopicsBarComponent({ data }: Props) {
  const sorted = useMemo(() => [...data].sort((a, b) => a.accuracy - b.accuracy), [data]);

  return (
    <div className="h-[330px] w-full rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#111a2f] to-[#0b1324] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.2)]">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-white">Zaif mavzular</h3>
        <p className="text-sm text-slate-300">Eng ko'p xato qilinayotgan mavzular</p>
      </div>
      <ResponsiveContainer width="100%" height="84%">
        <BarChart data={sorted} layout="vertical" margin={{ left: 18, right: 8, top: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="weakBar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#22324e" strokeDasharray="3 3" opacity={0.35} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="category"
            stroke="#94a3b8"
            tick={{ fill: "#cbd5e1", fontSize: 11 }}
            width={130}
            interval={0}
          />
          <Tooltip
            contentStyle={{
              background: "#0B1324",
              border: "1px solid #1F2A44",
              borderRadius: 12,
              color: "#e2e8f0",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Aniqlik"]}
          />
          <Bar dataKey="accuracy" fill="url(#weakBar)" radius={[0, 8, 8, 0]} isAnimationActive animationDuration={650} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(WeakTopicsBarComponent);
