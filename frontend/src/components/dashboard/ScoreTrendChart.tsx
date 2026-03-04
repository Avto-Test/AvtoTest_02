"use client";

import { memo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScoreTrendPoint } from "@/hooks/useDashboardAnalytics";

type Props = {
  data: ScoreTrendPoint[];
};

function ScoreTrendChartComponent({ data }: Props) {
  return (
    <div className="h-[320px] w-full rounded-2xl border border-[#1F2A44] bg-[#0B1324] p-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-white">Rivojlanish trendi</h3>
        <p className="text-sm text-slate-400">So'nggi testlar bo'yicha natija dinamikasi</p>
      </div>
      <ResponsiveContainer width="100%" height="84%">
        <LineChart data={data}>
          <defs>
            <linearGradient id="scoreTrendLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#00E5A8" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1F2A44" strokeDasharray="3 3" />
          <XAxis dataKey="testIndex" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: "#334155", strokeWidth: 1 }}
            contentStyle={{
              background: "#0B1324",
              border: "1px solid #1F2A44",
              borderRadius: 12,
              color: "#e2e8f0",
            }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Natija"]}
            labelFormatter={(label) => `Test #${label}`}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="url(#scoreTrendLine)"
            strokeWidth={3}
            dot={{ r: 4, fill: "#22d3ee", stroke: "#0B1324", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#00E5A8", stroke: "#0B1324", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={650}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(ScoreTrendChartComponent);

