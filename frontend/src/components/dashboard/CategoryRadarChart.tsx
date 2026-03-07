"use client";

import { memo, useMemo, useRef, useState } from "react";

import type { CategoryPoint } from "@/hooks/useDashboardAnalytics";

type Props = {
  data: CategoryPoint[];
  trainTopic?: (categoryId: string) => void;
};

type PlotPoint = CategoryPoint & {
  shortCategory: string;
  angle: number;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
};

type TooltipState = {
  x: number;
  y: number;
  category: string;
  score: number;
} | null;

const SIZE = 420;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 146;
const LABEL_RADIUS = 186;
const GRID_LEVELS = [0, 25, 50, 75, 100];

function truncateLabel(label: string): string {
  return label.length <= 18 ? label : `${label.slice(0, 18)}...`;
}

function toCategoryActionKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/['`"]/g, "")
    .replace(/\s+/g, "_");
}

function polarToCartesian(radius: number, angle: number) {
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function scoreToTone(score: number) {
  const value = Math.max(0, Math.min(100, score));

  if (value < 40) {
    return {
      stroke: "#f97316",
      fillStart: "#fb923c",
      fillEnd: "#ef4444",
      point: "#fb923c",
    };
  }

  if (value < 70) {
    return {
      stroke: "#fbbf24",
      fillStart: "#fbbf24",
      fillEnd: "#d97706",
      point: "#fbbf24",
    };
  }

  return {
    stroke: "#34d399",
    fillStart: "#34d399",
    fillEnd: "#22c55e",
    point: "#34d399",
  };
}

function buildPolygonPath(points: PlotPoint[]): string {
  if (!points.length) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ") + " Z";
}

function CategoryRadarChartComponent({ data, trainTopic }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const points = useMemo(() => {
    return data.slice(0, 12).map((item, index, array) => {
      const angle = (index / Math.max(1, array.length)) * Math.PI * 2 - Math.PI / 2;
      const radius = (Math.max(0, Math.min(100, item.accuracy)) / 100) * OUTER_RADIUS;
      const point = polarToCartesian(radius, angle);
      const labelPoint = polarToCartesian(LABEL_RADIUS, angle);

      return {
        ...item,
        shortCategory: truncateLabel(item.category),
        angle,
        x: point.x,
        y: point.y,
        labelX: labelPoint.x,
        labelY: labelPoint.y,
      } satisfies PlotPoint;
    });
  }, [data]);

  const average = useMemo(() => {
    if (!points.length) {
      return 0;
    }
    return Math.round(points.reduce((sum, item) => sum + item.accuracy, 0) / points.length);
  }, [points]);

  const weakest = useMemo(() => {
    if (!points.length) {
      return null;
    }
    return points.reduce((acc, item) => (item.accuracy < acc.accuracy ? item : acc), points[0]);
  }, [points]);

  const polygonPath = useMemo(() => buildPolygonPath(points), [points]);
  const averageTone = scoreToTone(average);
  const weakestTone = scoreToTone(weakest?.accuracy ?? average);

  const updateTooltip = (
    event: React.MouseEvent<SVGCircleElement | SVGTextElement>,
    item: PlotPoint,
    index: number
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setHoveredIndex(index);
    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      category: item.category,
      score: Math.round(item.accuracy),
    });
  };

  const clearHover = () => {
    setHoveredIndex(null);
    setTooltip(null);
  };

  const triggerTraining = (item: PlotPoint) => {
    if (!trainTopic) {
      return;
    }
    trainTopic(item.id || toCategoryActionKey(item.category));
  };

  if (!points.length) {
    return (
      <section className="h-full rounded-3xl border border-[#1F2A44] bg-[#0B1324] p-6">
        <h3 className="text-lg font-semibold text-white">Kategoriyalar bo'yicha bilim darajasi</h3>
        <p className="mt-2 text-sm text-slate-300">Kategoriya tahlili uchun kamida bir nechta test natijasi kerak.</p>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-3xl border border-[#1F2A44] bg-[linear-gradient(180deg,#101a2e_0%,#0b1324_100%)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.26)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">Kategoriyalar bo'yicha bilim darajasi</h3>
        {weakest ? (
          <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
            Zaif: {truncateLabel(weakest.category)} ({Math.round(weakest.accuracy)}%)
          </span>
        ) : null}
      </div>

      <div
        ref={containerRef}
        className="relative mx-auto h-[380px] w-full max-w-[460px]"
        onMouseLeave={clearHover}
      >
        <div className="pointer-events-none absolute inset-[18%] rounded-full bg-cyan-400/10 blur-3xl" />

        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          <defs>
            <radialGradient id="category-radar-glow" cx="50%" cy="50%" r="56%">
              <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
            </radialGradient>
            <linearGradient id="category-radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={weakestTone.fillStart} stopOpacity="0.26" />
              <stop offset="100%" stopColor={averageTone.fillEnd} stopOpacity="0.1" />
            </linearGradient>
          </defs>

          <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 26} fill="url(#category-radar-glow)" />

          {GRID_LEVELS.map((level) => {
            const radius = level === 0 ? 6 : (level / 100) * OUTER_RADIUS;
            return (
              <circle
                key={level}
                cx={CENTER}
                cy={CENTER}
                r={radius}
                fill="none"
                stroke="rgba(148,163,184,0.12)"
                strokeWidth={level === 100 ? 1.15 : 1}
              />
            );
          })}

          <text
            x={CENTER}
            y={CENTER - OUTER_RADIUS - 10}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(148,163,184,0.78)"
          >
            100
          </text>

          {points.map((item, index) => {
            const active = hoveredIndex === index;
            const axisEnd = polarToCartesian(OUTER_RADIUS, item.angle);
            const textAnchor = item.labelX < CENTER - 24 ? "end" : item.labelX > CENTER + 24 ? "start" : "middle";

            return (
              <g key={`axis-${item.id ?? item.category}`}>
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={axisEnd.x}
                  y2={axisEnd.y}
                  stroke={active ? "rgba(125,211,252,0.56)" : "rgba(148,163,184,0.16)"}
                  strokeWidth={active ? 1.5 : 1}
                />
                <text
                  x={item.labelX}
                  y={item.labelY}
                  textAnchor={textAnchor}
                  fontSize="11"
                  fill={active ? "#f8fafc" : "#cbd5e1"}
                  style={{ transition: "all 180ms ease" }}
                  onMouseEnter={(event) => updateTooltip(event, item, index)}
                  onMouseMove={(event) => updateTooltip(event, item, index)}
                  onClick={() => triggerTraining(item)}
                  className={trainTopic ? "cursor-pointer" : undefined}
                >
                  <title>{item.category}</title>
                  {item.shortCategory}
                </text>
              </g>
            );
          })}

          <g style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "category-radar-load 400ms ease-out both" }}>
            <path
              d={polygonPath}
              fill="url(#category-radar-fill)"
              stroke={averageTone.stroke}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {points.map((item, index) => {
              const active = hoveredIndex === index;
              const tone = scoreToTone(item.accuracy);
              return (
                <g key={`point-${item.id ?? item.category}`}>
                  <circle
                    cx={item.x}
                    cy={item.y}
                    r={active ? 6 : 5}
                    fill={tone.point}
                    stroke="rgba(11,19,36,0.96)"
                    strokeWidth="2"
                    style={{ transition: "r 180ms ease" }}
                  />
                  <circle
                    cx={item.x}
                    cy={item.y}
                    r={16}
                    fill="transparent"
                    onMouseEnter={(event) => updateTooltip(event, item, index)}
                    onMouseMove={(event) => updateTooltip(event, item, index)}
                    onClick={() => triggerTraining(item)}
                    className={trainTopic ? "cursor-pointer" : undefined}
                  />
                </g>
              );
            })}
          </g>

          <circle cx={CENTER} cy={CENTER} r={42} fill="rgba(11,19,36,0.92)" stroke="rgba(148,163,184,0.18)" />
          <text x={CENTER} y={CENTER - 6} textAnchor="middle" fontSize="11" fill="rgba(148,163,184,0.9)">
            O'rtacha aniqlik
          </text>
          <text x={CENTER} y={CENTER + 18} textAnchor="middle" fontSize="30" fontWeight="700" fill="#f8fafc">
            {average}%
          </text>
        </svg>

        {tooltip ? (
          <div
            className="pointer-events-none absolute z-10 rounded-xl border border-[#1F2A44] bg-[#0B1324]/95 px-3 py-2 text-sm text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
            style={{
              left: Math.min(tooltip.x + 14, 320),
              top: Math.max(tooltip.y - 18, 16),
              transform: "translateY(-100%)",
            }}
          >
            <div className="max-w-[180px] truncate font-medium">{tooltip.category}</div>
            <div className="text-slate-300">{tooltip.score}%</div>
          </div>
        ) : null}

        <style jsx>{`
          @keyframes category-radar-load {
            from {
              opacity: 0;
              transform: scale(0.88);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    </section>
  );
}

export default memo(CategoryRadarChartComponent);
