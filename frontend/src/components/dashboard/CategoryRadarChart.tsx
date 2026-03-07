"use client";

import { memo, useMemo, useRef, useState } from "react";

import type { CategoryMetric } from "@/analytics/types";
import { normalizeTopicKey, truncateTopicLabel } from "@/lib/dashboardTopic";

type Props = {
  data: CategoryMetric[];
  trainTopic?: (categoryId: string) => void;
};

type PlotPoint = CategoryMetric & {
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
  coverage: number | null;
} | null;

const SIZE = 420;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 146;
const LABEL_RADIUS = 188;
const GRID_LEVELS = [0, 25, 50, 75, 100];
const MIN_ZERO_RADIUS = 10;
const MIN_VISIBLE_RADIUS = 14;

function getGridStroke(level: number): string {
  if (level === 100) {
    return "rgba(148,163,184,0.28)";
  }
  if (level === 75) {
    return "rgba(148,163,184,0.18)";
  }
  if (level === 50) {
    return "rgba(148,163,184,0.13)";
  }
  if (level === 25) {
    return "rgba(148,163,184,0.09)";
  }
  return "rgba(148,163,184,0.06)";
}

function polarToCartesian(radius: number, angle: number) {
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildCatmullRomClosedPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return "";
  }

  if (points.length < 3) {
    return `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;
  }

  const extended = [points[points.length - 1], ...points, points[0], points[1]];
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index <= points.length; index += 1) {
    const p0 = extended[index - 1];
    const p1 = extended[index];
    const p2 = extended[index + 1];
    const p3 = extended[index + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return `${path} Z`;
}

function getPointRadius(categoryCount: number) {
  if (categoryCount <= 5) {
    return 6.5;
  }
  if (categoryCount <= 8) {
    return 5.25;
  }
  return 4.25;
}

function CategoryRadarChartComponent({ data, trainTopic }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const safeData = useMemo(
    () => data.filter((item) => item.category?.trim().length > 0).slice(0, 12),
    [data]
  );
  const labelFontSize = safeData.length > 10 ? 8 : safeData.length > 8 ? 9 : 11;
  const pointRadius = getPointRadius(safeData.length);

  const points = useMemo(() => {
    const maxLabelLength = safeData.length > 10 ? 12 : safeData.length > 8 ? 14 : 18;
    const dynamicLabelRadius = safeData.length > 10 ? LABEL_RADIUS + 18 : safeData.length > 8 ? LABEL_RADIUS + 10 : LABEL_RADIUS;

    return safeData.map((item, index, array) => {
      const angle = (index / Math.max(1, array.length)) * Math.PI * 2 - Math.PI / 2;
      const accuracy = Math.max(0, Math.min(100, item.accuracy));
      const scaledRadius = (accuracy / 100) * OUTER_RADIUS;
      const radius = accuracy === 0 ? MIN_ZERO_RADIUS : Math.max(scaledRadius, MIN_VISIBLE_RADIUS);
      const point = polarToCartesian(radius, angle);
      const labelPoint = polarToCartesian(dynamicLabelRadius, angle);

      return {
        ...item,
        shortCategory: truncateTopicLabel(item.category, maxLabelLength),
        angle,
        x: point.x,
        y: point.y,
        labelX: labelPoint.x,
        labelY: labelPoint.y,
      } satisfies PlotPoint;
    });
  }, [safeData]);

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

  const polygonPath = useMemo(
    () => buildCatmullRomClosedPath(points.map((point) => ({ x: point.x, y: point.y }))),
    [points]
  );

  const tooltipPosition = useMemo(() => {
    if (!tooltip) {
      return null;
    }

    const containerWidth = containerRef.current?.clientWidth ?? 460;
    const containerHeight = containerRef.current?.clientHeight ?? 380;
    const tooltipWidth = 220;
    const tooltipHeight = tooltip.coverage === null ? 68 : 88;

    return {
      left: clamp(tooltip.x + 14, 12, Math.max(12, containerWidth - tooltipWidth - 12)),
      top: clamp(tooltip.y - tooltipHeight - 12, 12, Math.max(12, containerHeight - tooltipHeight - 12)),
    };
  }, [tooltip]);

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
      coverage: item.coverage === null ? null : Math.round(item.coverage),
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

    trainTopic(item.id || normalizeTopicKey(item.category));
  };

  if (!points.length) {
    return (
      <section className="h-full rounded-3xl border border-[#1F2A44] bg-[#0B1324] p-6">
        <h3 className="text-lg font-semibold text-white">Kategoriyalar bo'yicha bilim darajasi</h3>
        <p className="mt-2 text-sm text-slate-300">Analitika uchun hali yetarli ma'lumot yo'q.</p>
      </section>
    );
  }

  return (
    <section className="min-w-0 rounded-3xl border border-[#1F2A44] bg-[linear-gradient(180deg,#101a2e_0%,#0b1324_100%)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.26)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">Kategoriyalar bo'yicha bilim darajasi</h3>
        {weakest ? (
          <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
            Zaif: {truncateTopicLabel(weakest.category, 18)} ({Math.round(weakest.accuracy)}%)
          </span>
        ) : null}
      </div>

      <div ref={containerRef} className="relative mx-auto h-[380px] w-full max-w-[460px]" onMouseLeave={clearHover}>
        <div className="pointer-events-none absolute inset-[18%] rounded-full bg-cyan-400/10 blur-3xl" />

        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="Kategoriyalar aniqligi radar diagrammasi">
          <defs>
            <radialGradient id="category-radar-glow" cx="50%" cy="50%" r="58%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="category-radar-fill" cx="50%" cy="50%" r="72%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.08" />
            </radialGradient>
            <filter id="category-radar-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#38bdf8" floodOpacity="0.16" />
            </filter>
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
                stroke={getGridStroke(level)}
                strokeWidth={level === 100 ? 1.3 : 1}
              />
            );
          })}

          <text x={CENTER} y={CENTER - OUTER_RADIUS - 10} textAnchor="middle" fontSize="10" fill="rgba(148,163,184,0.78)">
            100%
          </text>

          {points.map((item, index) => {
            const active = hoveredIndex === index;
            const axisEnd = polarToCartesian(OUTER_RADIUS, item.angle);
            const textAnchor = item.labelX < CENTER - 24 ? "end" : item.labelX > CENTER + 24 ? "start" : "middle";
            const labelTransform =
              safeData.length > 10
                ? `translate(${(item.labelX - CENTER) * 0.05} ${(item.labelY - CENTER) * 0.05})`
                : undefined;

            return (
              <g key={`axis-${item.id ?? item.category}`}>
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={axisEnd.x}
                  y2={axisEnd.y}
                  stroke={active ? "rgba(125,211,252,0.62)" : "rgba(148,163,184,0.16)"}
                  strokeWidth={active ? 1.7 : 1}
                  style={{ transition: "all 180ms ease" }}
                />
                <text
                  x={item.labelX}
                  y={item.labelY}
                  textAnchor={textAnchor}
                  fontSize={labelFontSize}
                  fill={active ? "#f8fafc" : "#cbd5e1"}
                  style={{
                    transition: "all 180ms ease",
                    transform: labelTransform,
                    transformOrigin: `${item.labelX}px ${item.labelY}px`,
                  }}
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
              stroke="#38bdf8"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              filter="url(#category-radar-shadow)"
              shapeRendering="geometricPrecision"
            />

            {points.map((item, index) => {
              const active = hoveredIndex === index;
              const activeRadius = pointRadius + 2.5;
              return (
                <g key={`point-${item.id ?? item.category}`}>
                  {active ? (
                    <circle
                      cx={item.x}
                      cy={item.y}
                      r={activeRadius + 6}
                      fill="#38bdf8"
                      fillOpacity="0.12"
                      style={{ transition: "opacity 180ms ease" }}
                    />
                  ) : null}
                  <circle
                    cx={item.x}
                    cy={item.y}
                    r={active ? activeRadius : pointRadius}
                    fill="#38bdf8"
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

          <circle cx={CENTER} cy={CENTER} r={48} fill="rgba(11,19,36,0.92)" stroke="rgba(148,163,184,0.18)" />
          <text x={CENTER} y={CENTER - 12} textAnchor="middle" fontSize="10" fill="rgba(148,163,184,0.9)">
            O'rtacha aniqlik
          </text>
          <text x={CENTER} y={CENTER + 22} textAnchor="middle" fontSize="34" fontWeight="700" fill="#f8fafc">
            {average}%
          </text>
        </svg>

        {tooltip ? (
          <div
            className="pointer-events-none absolute z-10 min-w-[180px] max-w-[220px] rounded-xl border border-[#1F2A44] bg-[#0B1324]/95 px-3 py-2 text-sm text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
            style={{
              left: tooltipPosition?.left ?? 12,
              top: tooltipPosition?.top ?? 12,
            }}
          >
            <div className="truncate font-medium">{tooltip.category || "Ma'lumot yetarli emas"}</div>
            <div className="mt-1 text-slate-300">Aniqlik: {tooltip.score}%</div>
            {tooltip.coverage !== null ? <div className="text-slate-400">Qamrov: {tooltip.coverage}%</div> : null}
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
