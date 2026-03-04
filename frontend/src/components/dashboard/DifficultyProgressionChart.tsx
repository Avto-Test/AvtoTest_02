"use client";

import { memo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DifficultyPoint } from "@/hooks/useDashboardAnalytics";

type Props = {
  data: DifficultyPoint[];
};

function DifficultyProgressionChartComponent({ data }: Props) {
  return (
    <div className="h-[330px] w-full rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#111a2f] to-[#0b1324] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.2)]">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-white">Qiyinlik dinamikasi</h3>
        <p className="text-sm text-slate-300">Testlar davomida savollar murakkabligi qanday o'zgaryapti</p>
      </div>
      <ResponsiveContainer width="100%" height="84%">
        <LineChart data={data}>
          <defs>
            <linearGradient id="difficultyLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#22324e" strokeDasharray="4 4" opacity={0.35} />
          <XAxis dataKey="testIndex" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "#0B1324",
              border: "1px solid #1F2A44",
              borderRadius: 12,
              color: "#e2e8f0",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Qiyinlik"]}
            labelFormatter={(label) => `Test #${label}`}
          />
          <Line
            type="monotone"
            dataKey="averageDifficulty"
            stroke="url(#difficultyLine)"
            strokeWidth={3}
            dot={{ r: 3, fill: "#a5b4fc" }}
            activeDot={{ r: 5, fill: "#22d3ee" }}
            isAnimationActive
            animationDuration={650}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(DifficultyProgressionChartComponent);
