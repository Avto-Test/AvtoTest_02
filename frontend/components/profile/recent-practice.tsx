"use client";

import { cn } from "@/lib/utils";

type RecentPracticeProps = {
  title: string;
  description: string;
  buttonLabel: string;
  helperText: string;
  isLightTheme: boolean;
  onAction: () => void;
};

export function RecentPractice({
  title,
  description,
  buttonLabel,
  helperText,
  isLightTheme,
  onAction,
}: RecentPracticeProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-6 backdrop-blur-sm",
        isLightTheme
          ? "border-white/70 bg-white/60 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          : "border-[#1a2a1a]/50 bg-[#0d120d]/80",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className={cn("text-xl font-semibold", isLightTheme ? "text-slate-950" : "text-white")}>
            Recent Practice
          </h2>
          <span className="text-2xl">✨</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className={cn(isLightTheme ? "text-slate-700" : "text-gray-400")}>{title}</p>
          <p className={cn("mt-2 text-sm", isLightTheme ? "text-slate-500" : "text-gray-500")}>{description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onAction}
            className={cn(
              "rounded-xl px-8 py-3 font-semibold text-white transition-all",
              isLightTheme
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_16px_40px_rgba(16,185,129,0.25)] hover:from-emerald-400 hover:to-emerald-300"
                : "bg-gradient-to-r from-emerald-600/80 to-emerald-500/80 hover:from-emerald-500 hover:to-emerald-400",
            )}
          >
            {buttonLabel}
          </button>
          <p className={cn("max-w-[250px] text-center text-xs", isLightTheme ? "text-slate-500" : "text-gray-500")}>
            {helperText}
          </p>
        </div>
      </div>
    </div>
  );
}
