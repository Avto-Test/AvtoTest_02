"use client";

import { memo, useId, useMemo } from "react";
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

type ChartTheme = "dark" | "light";

function getChartPalette(theme: ChartTheme) {
  if (theme === "light") {
    return {
      grid: "rgba(148,163,184,0.16)",
      tickPrimary: "rgba(71,85,105,0.84)",
      tickSecondary: "rgba(100,116,139,0.72)",
      tooltip: {
        backgroundColor: "rgba(255,255,255,0.98)",
        border: "1px solid rgba(226, 232, 240, 0.96)",
        borderRadius: "18px",
        color: "#0f172a",
      },
      activeDotStroke: "#ffffff",
    };
  }

  return {
    grid: "rgba(148,163,184,0.12)",
    tickPrimary: "rgba(248,250,252,0.84)",
    tickSecondary: "rgba(226,232,240,0.58)",
    tooltip: {
      backgroundColor: "rgba(7, 11, 24, 0.96)",
      border: "1px solid rgba(148, 163, 184, 0.18)",
      borderRadius: "18px",
      color: "#f8fafc",
    },
    activeDotStroke: "#020617",
  };
}

type TrendPoint = {
  label: string;
  value: number;
};

type TopicPoint = {
  topic: string;
  value: number;
};

function truncateLabel(value: string, maxLength = 16): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(1, maxLength - 3))}...`;
}

const IntelligenceTrendChartComponent = ({
  data,
  dataKey = "value",
  color = "#38bdf8",
  theme = "dark",
}: {
  data: TrendPoint[];
  dataKey?: string;
  color?: string;
  theme?: ChartTheme;
}) => {
  const shouldReduceMotion = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");
  const palette = useMemo(() => getChartPalette(theme), [theme]);
  const tooltipStyle = useMemo(() => palette.tooltip, [palette]);
  const activeDot = useMemo(
    () => ({ r: 5, fill: color, stroke: palette.activeDotStroke, strokeWidth: 2 }),
    [color, palette.activeDotStroke],
  );

  return (
    <motion.div
      className="h-72 w-full min-w-0"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.46} />
              <stop offset="100%" stopColor={color} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={palette.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={{ fill: palette.tickPrimary, fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickCount={5}
            width={34}
            tickMargin={8}
            tick={{ fill: palette.tickSecondary, fontSize: 12 }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#${gradientId})`}
            strokeWidth={3}
            dot={{ r: 0 }}
            activeDot={activeDot}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={620}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export const IntelligenceTrendChart = memo(IntelligenceTrendChartComponent);

const IntelligenceProgressChartComponent = ({
  data,
  color = "#34d399",
  theme = "dark",
}: {
  data: TrendPoint[];
  color?: string;
  theme?: ChartTheme;
}) => {
  const shouldReduceMotion = useReducedMotion();
  const palette = useMemo(() => getChartPalette(theme), [theme]);
  const tooltipStyle = useMemo(() => palette.tooltip, [palette]);
  const dot = useMemo(() => ({ r: 3, fill: color }), [color]);
  const activeDot = useMemo(
    () => ({ r: 5, fill: color, stroke: palette.activeDotStroke, strokeWidth: 2 }),
    [color, palette.activeDotStroke],
  );

  return (
    <motion.div
      className="h-64 w-full min-w-0"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={palette.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={{ fill: palette.tickPrimary, fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickCount={5}
            width={34}
            tickMargin={8}
            tick={{ fill: palette.tickSecondary, fontSize: 12 }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={dot}
            activeDot={activeDot}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={560}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export const IntelligenceProgressChart = memo(IntelligenceProgressChartComponent);

const IntelligenceTopicBarChartComponent = ({
  data,
  colorScale = ["#f97316", "#fb7185", "#38bdf8", "#22c55e"],
  theme = "dark",
}: {
  data: TopicPoint[];
  colorScale?: string[];
  theme?: ChartTheme;
}) => {
  const shouldReduceMotion = useReducedMotion();
  const palette = useMemo(() => getChartPalette(theme), [theme]);
  const tooltipStyle = useMemo(() => palette.tooltip, [palette]);
  const cells = useMemo(
    () => data.map((entry, index) => (
      <Cell
        key={`${entry.topic}-${index}`}
        fill={colorScale[index % colorScale.length]}
      />
    )),
    [colorScale, data],
  );

  return (
    <motion.div
      className="h-72 w-full min-w-0"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
        >
          <CartesianGrid stroke={palette.grid} strokeDasharray="3 4" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: palette.tickSecondary, fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="topic"
            tickLine={false}
            axisLine={false}
            width={128}
            tickMargin={8}
            tickFormatter={(value: string) => truncateLabel(value, 18)}
            tick={{ fill: palette.tickPrimary, fontSize: 12 }}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar
            dataKey="value"
            radius={[0, 10, 10, 0]}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={520}
            animationEasing="ease-out"
          >
            {cells}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export const IntelligenceTopicBarChart = memo(IntelligenceTopicBarChartComponent);
