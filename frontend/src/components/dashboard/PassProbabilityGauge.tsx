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

  return (
    <div className="relative h-[280px] w-full rounded-2xl border border-[#1F2A44] bg-[#0B1324] p-4">
      <div className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={data} innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270}>
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
      </div>
    </div>
  );
}

export default memo(PassProbabilityGaugeComponent);

