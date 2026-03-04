"use client";

import { memo, useMemo } from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

type Props = {
  passProbability: number;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function PassProbabilityGaugeComponent({ passProbability }: Props) {
  const value = clamp(passProbability);

  const color = useMemo(() => {
    if (value >= 70) return "#00E5A8";
    if (value >= 40) return "#FBBF24";
    return "#F87171";
  }, [value]);

  const data = useMemo(() => [{ name: "pass", value }], [value]);
  const statusLabel = useMemo(() => {
    if (value >= 85) return "Tayyor";
    if (value >= 60) return "Yaxshi";
    return "Yaxshilash kerak";
  }, [value]);

  return (
    <div className="relative h-[320px] w-full rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#111a2f] to-[#0b1324] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.25)]">
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={data} innerRadius="68%" outerRadius="96%" startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={18}
              fill={color}
              background={{ fill: "#1F2A44" }}
              isAnimationActive
              animationDuration={700}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold tracking-tight text-white">{Math.round(value)}%</span>
        <span className="mt-1 text-sm text-slate-300">Imtihondan o'tish ehtimoli</span>
        <span
          className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
          style={{
            borderColor: `${color}66`,
            backgroundColor: `${color}1A`,
            color,
          }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

export default memo(PassProbabilityGaugeComponent);
