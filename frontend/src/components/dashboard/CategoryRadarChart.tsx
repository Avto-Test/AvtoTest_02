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
const OUTER_RADIUS = 148;
const LABEL_RADIUS = 184;
const RING_STEPS = [0, 25, 50, 75, 100];

function truncateLabel(label: string): string {
  if (label.length <= 18) {
    return label;
  }
  return `${label.slice(0, 18)}...`;
}

function polarToCartesian(radius: number, angle: number) {
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function scoreToColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped < 40) {
    return clamped < 20 ? "#f97316" : "#fb923c";
  }
  if (clamped < 70) {
    return clamped < 55 ? "#fbbf24" : "#d4a72c";
  }
  return clamped < 85 ? "#34d399" : "#22c55e";
}

function buildRingPath(radius: number, pointCount: number): string {
  const points = Array.from({ length: pointCount }, (_, index) => {
    const angle = (index / pointCount) * Math.PI * 2 - Math.PI / 2;
    return polarToCartesian(radius, angle);
  });

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ") + " Z";
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

  const normalized = useMemo(() => {
    const safeData = data.slice(0, 12);
    return safeData.map((item, index, array) => {
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
    if (!normalized.length) {
      return 0;
    }
    return Math.round(normalized.reduce((sum, item) => sum + item.accuracy, 0) / normalized.length);
  }, [normalized]);

  const weakest = useMemo(() => {
    if (!normalized.length) {
      return null;
    }
    return normalized.reduce((acc, item) => (item.accuracy < acc.accuracy ? item : acc), normalized[0]);
  }, [normalized]);

  const polygonPath = useMemo(() => buildPolygonPath(normalized), [normalized]);
  const gradientStart = weakest ? scoreToColor(weakest.accuracy) : "#fb923c";
  const gradientEnd = scoreToColor(average);
  const strokeColor = scoreToColor(average);

  const updateTooltip = (
    event: React.MouseEvent<SVGElement | HTMLElement>,
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

  if (!normalized.length) {
    return (
      <section className="h-full rounded-3xl border border-[#1F2A44] bg-[#0B1324] p-6">
        <h3 className="text-lg font-semibold text-white">Kategoriyalar bo&apos;yicha bilim darajasi</h3>
        <p className="mt-2 text-sm text-slate-300">Kategoriya tahlili uchun kamida bir nechta test natijasi kerak.</p>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-3xl border border-[#1F2A44] bg-[linear-gradient(180deg,#101a2e_0%,#0b1324_100%)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.26)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">Kategoriyalar bo&apos;yicha bilim darajasi</h3>
        </div>
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
            <radialGradient id="radarCenterGlow" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
            </radialGradient>
            <linearGradient id="radarPolygonFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientStart} stopOpacity="0.2" />
              <stop offset="100%" stopColor={gradientEnd} stopOpacity="0.08" />
            </linearGradient>
          </defs>

          <circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS + 24} fill="url(#radarCenterGlow)" />

          {RING_STEPS.map((step) => {
            const radius = step === 0 ? 8 : (step / 100) * OUTER_RADIUS;
            return (
              <path
                key={step}
                d={buildRingPath(radius, normalized.length)}
                fill="none"
                stroke="rgba(148,163,184,0.12)"
                strokeWidth={step === 100 ? 1.15 : 1}
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
            100%
          </text>

          {normalized.map((item, index) => {
            const axisEnd = polarToCartesian(OUTER_RADIUS, item.angle);
            const active = hoveredIndex === index;
            return (
              <g key={`axis-${item.id ?? item.category}`}>
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={axisEnd.x}
                  y2={axisEnd.y}
                  stroke={active ? "rgba(125,211,252,0.55)" : "rgba(148,163,184,0.16)"}
                  strokeWidth={active ? 1.5 : 1}
                />
                <text
                  x={item.labelX}
                  y={item.labelY}
                  textAnchor={item.labelX < CENTER - 24 ? "end" : item.labelX > CENTER + 24 ? "start" : "middle"}
                  fontSize="11"
                  fill={active ? "#f8fafc" : "#cbd5e1"}
                  style={{ transition: "all 180ms ease" }}
                >
                  <title>{item.category}</title>
                  {item.shortCategory}
                </text>
              </g>
            );
          })}

          <g style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: "radar-load 400ms ease-out both" }}>
            <path
              d={polygonPath}
              fill="url(#radarPolygonFill)"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {normalized.map((item, index) => {
              const active = hoveredIndex === index;
              const pointColor = scoreToColor(item.accuracy);
              const clickValue = item.id ?? item.category;
              return (
                <g key={`point-${item.id ?? item.category}`}>
                  <circle
                    cx={item.x}
                    cy={item.y}
                    r={active ? 6 : 4}
                    fill={pointColor}
                    stroke="rgba(11,19,36,0.95)"
                    strokeWidth="2"
                    style={{ transition: "r 180ms ease" }}
                  />
                  <circle
                    cx={item.x}
                    cy={item.y}
                    r={16}
                    fill="transparent"
                    onMouseMove={(event) => updateTooltip(event, item, index)}
                    onMouseEnter={(event) => updateTooltip(event, item, index)}
                    onClick={() => trainTopic?.(clickValue)}
                    className={trainTopic ? "cursor-pointer" : undefined}
                  />
                  <circle
                    cx={item.labelX}
                    cy={item.labelY - 4}
                    r={18}
                    fill="transparent"
                    onMouseMove={(event) => updateTooltip(event, item, index)}
                    onMouseEnter={(event) => updateTooltip(event, item, index)}
                    onClick={() => trainTopic?.(clickValue)}
                    className={trainTopic ? "cursor-pointer" : undefined}
                  />
                </g>
              );
            })}
          </g>

          <circle cx={CENTER} cy={CENTER} r={42} fill="rgba(11,19,36,0.92)" stroke="rgba(148,163,184,0.18)" />
          <text x={CENTER} y={CENTER - 6} textAnchor="middle" fontSize="11" fill="rgba(148,163,184,0.9)">
            O‘rtacha aniqlik
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
          @keyframes radar-load {
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
