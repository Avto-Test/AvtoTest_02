"use client";

import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

type TrendPoint = {
  label: string;
  value: number;
};

type ProgressChartProps = {
  trendPoints: TrendPoint[];
  recommendationTopic: string;
  recommendationDetail: string;
  bestScore: number;
  averageScore: number;
  simulationReady: boolean;
  simulationLabel: string;
  isLightTheme: boolean;
};

const CHART_WIDTH = 300;
const CHART_HEIGHT = 140;

function normalizeTrendPoints(points: TrendPoint[]) {
  const trimmed = points.slice(-4);
  const defaults = ["1 kun", "2 kun", "3 kun", "4 kun"];
  return Array.from({ length: 4 }, (_, index) => trimmed[index] ?? { label: defaults[index], value: 0 });
}

export function ProgressChart({
  trendPoints,
  recommendationTopic,
  recommendationDetail,
  bestScore,
  averageScore,
  simulationReady,
  simulationLabel,
  isLightTheme,
}: ProgressChartProps) {
  const normalizedPoints = normalizeTrendPoints(trendPoints);
  const maxValue = Math.max(18, ...normalizedPoints.map((point) => point.value));
  const midValue = Math.round(maxValue / 2);
  const xStep = CHART_WIDTH / (normalizedPoints.length - 1);

  const coordinates = normalizedPoints.map((point, index) => ({
    ...point,
    x: index * xStep,
    y: CHART_HEIGHT - (Math.max(0, point.value) / maxValue) * CHART_HEIGHT,
  }));

  const areaPath = `M 0 ${CHART_HEIGHT} L ${coordinates.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${CHART_WIDTH} ${CHART_HEIGHT} Z`;
  const linePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div
      className={cn(
        "rounded-2xl border p-6 backdrop-blur-sm",
        isLightTheme
          ? "border-white/70 bg-white/60 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          : "border-[#1a2a1a]/50 bg-[#0d120d]/80",
      )}
    >
      <h2 className={cn("mb-6 text-xl font-semibold", isLightTheme ? "text-slate-950" : "text-white")}>
        Your Progress
      </h2>

      <div className="flex flex-col gap-8 xl:flex-row">
        <div className="flex-1">
          <div className={cn("mb-4 text-sm", isLightTheme ? "text-slate-500" : "text-gray-400")}>Readiness:</div>
          <div className="relative h-40">
            <div
              className={cn(
                "absolute left-0 top-0 flex h-full flex-col justify-between pr-2 text-xs",
                isLightTheme ? "text-slate-400" : "text-gray-500",
              )}
            >
              <span>{maxValue}</span>
              <span>{midValue}</span>
              <span>0</span>
            </div>

            <div className="relative ml-8 h-full">
              <div className="absolute inset-0 flex flex-col justify-between">
                <div className={cn("border-t", isLightTheme ? "border-slate-200/80" : "border-[#1a2a1a]")} />
                <div className={cn("border-t", isLightTheme ? "border-slate-200/80" : "border-[#1a2a1a]")} />
                <div className={cn("border-t", isLightTheme ? "border-slate-200/80" : "border-[#1a2a1a]")} />
              </div>

              <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="profileLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                  <linearGradient id="profileAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <path d={areaPath} fill="url(#profileAreaGradient)" />
                <polyline points={linePoints} fill="none" stroke="url(#profileLineGradient)" strokeWidth="2" />

                {coordinates.map((point, index) => (
                  <circle
                    key={`${point.label}-${point.value}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill={isLightTheme ? "#ffffff" : "#0d120d"}
                    stroke="#22c55e"
                    strokeWidth="2"
                  />
                ))}
              </svg>

              <div
                className={cn(
                  "absolute -bottom-6 left-0 right-0 flex justify-between text-xs",
                  isLightTheme ? "text-slate-400" : "text-gray-500",
                )}
              >
                {normalizedPoints.map((point, index) => (
                  <span key={`${point.label}-${point.value}-${index}`}>{point.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "w-full pt-2 xl:w-64 xl:border-l xl:pl-8",
            isLightTheme ? "border-slate-200/80" : "border-[#1a2a1a]",
          )}
        >
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-500" />
            <span className={cn("font-medium", isLightTheme ? "text-slate-950" : "text-white")}>
              AI tavsiyasi
            </span>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-emerald-400">{recommendationTopic}</h3>
          <p className={cn("text-sm", isLightTheme ? "text-slate-600" : "text-gray-400")}>
            {recommendationDetail}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mt-8 flex flex-wrap gap-8 border-t pt-6",
          isLightTheme ? "border-slate-200/80" : "border-[#1a2a1a]",
        )}
      >
        <div>
          <div className={cn("mb-1 text-sm", isLightTheme ? "text-slate-500" : "text-gray-400")}>Best Result</div>
          <div className={cn("text-2xl font-bold", isLightTheme ? "text-slate-950" : "text-white")}>
            {bestScore}%
          </div>
        </div>
        <div>
          <div className={cn("mb-1 text-sm", isLightTheme ? "text-slate-500" : "text-gray-400")}>
            Average Result
          </div>
          <div className={cn("text-2xl font-bold", isLightTheme ? "text-slate-950" : "text-white")}>
            {averageScore}%
          </div>
        </div>
        <div>
          <div className={cn("mb-1 text-sm", isLightTheme ? "text-slate-500" : "text-gray-400")}>Simulations</div>
          <div className={cn("flex items-center gap-2", isLightTheme ? "text-slate-500" : "text-gray-500")}>
            {simulationReady ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Lock className="h-4 w-4" />}
            <span>{simulationLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
