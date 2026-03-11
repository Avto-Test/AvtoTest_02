"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "rgba(7, 11, 24, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: "18px",
  color: "#f8fafc",
};

type TrendPoint = {
  label: string;
  value: number;
};

type TopicPoint = {
  topic: string;
  value: number;
};

export function IntelligenceTrendChart({
  data,
  dataKey = "value",
  color = "#38bdf8",
}: {
  data: TrendPoint[];
  dataKey?: string;
  color?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");

  return (
    <motion.div
      className="h-72 w-full"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.46} />
              <stop offset="100%" stopColor={color} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(226,232,240,0.58)", fontSize: 12 }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#${gradientId})`}
            strokeWidth={3}
            dot={{ r: 0 }}
            activeDot={{ r: 5, fill: color, stroke: "#020617", strokeWidth: 2 }}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={620}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function IntelligenceProgressChart({
  data,
  color = "#34d399",
}: {
  data: TrendPoint[];
  color?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="h-64 w-full"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 10, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.10)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(226,232,240,0.72)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(226,232,240,0.58)", fontSize: 12 }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5, fill: color, stroke: "#020617", strokeWidth: 2 }}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={560}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function IntelligenceTopicBarChart({
  data,
  colorScale = ["#f97316", "#fb7185", "#38bdf8", "#22c55e"],
}: {
  data: TopicPoint[];
  colorScale?: string[];
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="h-72 w-full"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 8, left: 28, bottom: 0 }}
        >
          <CartesianGrid stroke="rgba(148,163,184,0.08)" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(226,232,240,0.58)", fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="topic"
            tickLine={false}
            axisLine={false}
            width={112}
            tick={{ fill: "rgba(248,250,252,0.84)", fontSize: 12 }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar
            dataKey="value"
            radius={[0, 10, 10, 0]}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={520}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={`${entry.topic}-${index}`}
                fill={colorScale[index % colorScale.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
