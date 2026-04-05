"use client";

import { ChevronRight, Puzzle } from "lucide-react";

import { cn } from "@/lib/utils";

type RecommendationCardProps = {
  topic: string;
  description: string;
  isLightTheme: boolean;
  onStartPractice: () => void;
};

export function RecommendationCard({
  topic,
  description,
  isLightTheme,
  onStartPractice,
}: RecommendationCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 backdrop-blur-sm",
        isLightTheme
          ? "border-white/70 bg-white/60 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          : "border-[#1a2a1a]/50 bg-[#0d120d]/80",
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className={cn("font-semibold", isLightTheme ? "text-slate-950" : "text-white")}>Recommendations</h3>
        <ChevronRight className={cn("h-4 w-4", isLightTheme ? "text-slate-400" : "text-gray-500")} />
      </div>
      <div className="mb-3 flex items-start gap-3">
        <Puzzle className="mt-0.5 h-5 w-5 text-emerald-400" />
        <div>
          <p className={cn("text-sm", isLightTheme ? "text-slate-500" : "text-gray-400")}>
            You&apos;re frequently missing
          </p>
          <p className={cn("mt-1 font-semibold", isLightTheme ? "text-slate-950" : "text-white")}>{topic}</p>
        </div>
      </div>
      <p className={cn("mb-4 text-sm", isLightTheme ? "text-slate-600" : "text-gray-400")}>{description}</p>
      <button
        type="button"
        onClick={onStartPractice}
        className={cn(
          "w-full rounded-xl py-3 font-semibold text-white transition-all",
          isLightTheme
            ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_16px_40px_rgba(16,185,129,0.25)] hover:from-emerald-400 hover:to-emerald-300"
            : "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400",
        )}
      >
        Start Practice
      </button>
    </div>
  );
}
