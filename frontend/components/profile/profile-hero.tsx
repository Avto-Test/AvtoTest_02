"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type ProfileHeroProps = {
  readiness: number;
  passProbability: number;
  name: string;
  level: number;
  levelLabel: string;
  levelProgressPercent: number;
  xpToNextLevel: number;
  isLightTheme: boolean;
  onStartPractice: () => void;
};

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProfileHero({
  readiness,
  passProbability,
  name,
  level,
  levelLabel,
  levelProgressPercent,
  xpToNextLevel,
  isLightTheme,
  onStartPractice,
}: ProfileHeroProps) {
  const clampedReadiness = Math.max(0, Math.min(100, readiness));
  const progressLength = (clampedReadiness / 100) * CIRCUMFERENCE;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6",
        isLightTheme
          ? "border-white/70 bg-white/55 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          : "border-[#1a3a1a]/30 bg-gradient-to-br from-[#0a1a0a] via-[#0d1f0d] to-[#0a1a0a]",
      )}
    >
      <div
        className={cn(
          "absolute inset-0",
          isLightTheme ? "bg-gradient-to-br from-emerald-100/50 via-white/10 to-cyan-100/35" : "opacity-30",
        )}
      >
        <div
          className={cn(
            "absolute inset-0",
            isLightTheme
              ? "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_30%)]"
              : "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]",
          )}
        />
      </div>

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="relative h-32 w-32 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                stroke={isLightTheme ? "#dbe7df" : "#1a2a1a"}
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                stroke="url(#profileProgressGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progressLength} ${CIRCUMFERENCE}`}
              />
              <defs>
                <linearGradient id="profileProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-3xl font-bold", isLightTheme ? "text-slate-950" : "text-white")}>
                {clampedReadiness}%
              </span>
              <span className={cn("text-xs", isLightTheme ? "text-slate-500" : "text-gray-400")}>
                Chance to Pass {Math.max(0, Math.min(100, passProbability))}%
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className={cn("text-3xl font-bold", isLightTheme ? "text-slate-950" : "text-white")}>
              {name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn(isLightTheme ? "text-slate-600" : "text-gray-400")}>Level {level}</span>
              <span className={cn(isLightTheme ? "text-slate-300" : "text-gray-600")}>•</span>
              <span className={cn(isLightTheme ? "text-slate-600" : "text-gray-400")}>{levelLabel}</span>
              <div
                className={cn(
                  "ml-2 h-2 w-24 overflow-hidden rounded-full",
                  isLightTheme ? "bg-slate-200" : "bg-[#1a2a1a]",
                )}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-green-500"
                  style={{ width: `${Math.max(0, Math.min(100, levelProgressPercent))}%` }}
                />
              </div>
              <span className={cn("font-medium", isLightTheme ? "text-slate-950" : "text-white")}>
                {xpToNextLevel} XP
              </span>
            </div>
            <button
              type="button"
              onClick={onStartPractice}
              className={cn(
                "flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all",
                isLightTheme
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_16px_40px_rgba(16,185,129,0.28)] hover:from-emerald-400 hover:to-emerald-300"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-emerald-400",
              )}
            >
              Start Practice
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={cn("text-left text-sm xl:text-right", isLightTheme ? "text-slate-500" : "text-gray-400")}>
          <div>
            Keyingi{" "}
            <span className={cn("font-semibold", isLightTheme ? "text-emerald-600" : "text-emerald-400")}>
              {xpToNextLevel} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
