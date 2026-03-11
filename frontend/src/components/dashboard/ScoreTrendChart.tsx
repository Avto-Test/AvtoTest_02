"use client";

import { memo } from "react";
import { Area, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScoreTrendPoint } from "@/analytics/types";

type Props = {
  data: ScoreTrendPoint[];
};

function ScoreTrendChartComponent({ data }: Props) {
  if (!data.length) {
    return (
      <section className="h-full rounded-3xl border border-[#1F2A44] bg-[#0B1324] p-6">
        <h3 className="text-lg font-semibold text-white">Rivojlanish trendi</h3>
        <p className="mt-2 text-sm text-slate-300">{"Bir nechta test yechgandan keyin rivojlanish dinamikasi shu yerda chiqadi."}</p>
      </section>
    );
  }

  const lastIndex = data.length - 1;

  return (
    <div className="min-w-0 rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#111a2f] to-[#0b1324] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.2)]">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-white">Rivojlanish trendi</h3>
        <p className="text-sm text-slate-300">{"So'nggi testlar natijasidagi o'zgarish"}</p>
      </div>
      <div className="h-[250px] min-h-[220px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
          <LineChart data={data}>
          <defs>
            <linearGradient id="scoreTrendLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#00E5A8" />
            </linearGradient>
            <linearGradient id="scoreTrendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#22324e" strokeDasharray="3 3" opacity={0.35} />
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
          <Area type="monotone" dataKey="score" fill="url(#scoreTrendArea)" stroke="none" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="url(#scoreTrendLine)"
            strokeWidth={3}
            dot={(dotProps) => {
              const { cx, cy, index } = dotProps;
              if (typeof cx !== "number" || typeof cy !== "number") return null;
              const isLast = index === lastIndex;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isLast ? 6 : 4}
                  fill={isLast ? "#00E5A8" : "#22d3ee"}
                  stroke="#0B1324"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 6, fill: "#00E5A8", stroke: "#0B1324", strokeWidth: 2 }}
            isAnimationActive
            animationDuration={650}
          />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default memo(ScoreTrendChartComponent);

