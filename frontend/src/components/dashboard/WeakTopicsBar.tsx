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
    <div className="h-[320px] w-full rounded-2xl border border-[#1F2A44] bg-[#0B1324] p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white">Zaif mavzular</h3>
        <p className="text-sm text-slate-400">Past foizdagi yo'nalishlar birinchi o'rinda ko'rsatiladi</p>
      </div>
      <ResponsiveContainer width="100%" height="84%">
        <BarChart data={sorted}>
          <defs>
            <linearGradient id="weakBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" />
          <XAxis dataKey="category" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-10} textAnchor="end" height={54} />
          <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "#0B1324",
              border: "1px solid #1F2A44",
              borderRadius: 12,
              color: "#e2e8f0",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Aniqlik"]}
          />
          <Bar dataKey="accuracy" fill="url(#weakBar)" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={650} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(WeakTopicsBarComponent);

