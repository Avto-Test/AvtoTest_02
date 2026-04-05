"use client";

import { useId } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from "recharts";

import { ChartContainer } from "@/shared/ui/chart-container";
import { cn } from "@/lib/utils";

export type TopicRadarDatum = {
  topic: string;
  mastery: number;
  accuracy: number;
  retention: number;
};

type TopicRadarProps = {
  data: TopicRadarDatum[];
  className?: string;
  minHeight?: number;
};

function WrappedAngleTick(props: {
  payload?: { value?: string };
  x?: number;
  y?: number;
}) {
  const label = props.payload?.value ?? "";
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  const parts = label.split(" ");

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill="var(--muted-foreground)"
      fontSize={11}
      fontWeight={600}
    >
      {parts.map((part, index) => (
        <tspan key={`${part}-${index}`} x={x} dy={index === 0 ? 0 : 12}>
          {part}
        </tspan>
      ))}
    </text>
  );
}

function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TopicRadarDatum }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="chart-tooltip min-w-[180px] px-4 py-3">
      <p className="font-semibold">{item.topic}</p>
      <div className="mt-3 space-y-1.5 text-sm text-[var(--muted-foreground)]">
        <div className="flex items-center justify-between gap-4">
          <span>Mastery</span>
          <span className="font-semibold text-[var(--foreground)]">{item.mastery}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Accuracy</span>
          <span className="font-semibold text-[var(--foreground)]">{item.accuracy}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Retention</span>
          <span className="font-semibold text-[var(--foreground)]">{item.retention}%</span>
        </div>
      </div>
    </div>
  );
}

export function TopicRadar({
  data,
  className,
  minHeight = 340,
}: TopicRadarProps) {
  const gradientId = useId();

  return (
    <ChartContainer className={cn("w-full", className)} minHeight={minHeight}>
      {({ width, height }) => (
        <RadarChart
          width={width}
          height={height}
          data={data}
          outerRadius="72%"
          cx="50%"
          cy="50%"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.72} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.46} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="color-mix(in oklab, var(--border) 74%, transparent)" />
          <PolarAngleAxis dataKey="topic" tick={<WrappedAngleTick />} />
          <PolarRadiusAxis
            angle={22}
            domain={[0, 100]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name="Mastery"
            dataKey="mastery"
            stroke="#3b82f6"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            fillOpacity={0.8}
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Tooltip content={<RadarTooltip />} />
        </RadarChart>
      )}
    </ChartContainer>
  );
}
