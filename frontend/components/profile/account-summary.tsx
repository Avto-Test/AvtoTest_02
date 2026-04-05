"use client";

import { Home, Mail } from "lucide-react";

import { cn } from "@/lib/utils";

type AccountSummaryProps = {
  emailStatusTitle: string;
  emailStatusBody: string;
  recommendationTitle: string;
  recommendationBody: string;
  isLightTheme: boolean;
};

export function AccountSummary({
  emailStatusTitle,
  emailStatusBody,
  recommendationTitle,
  recommendationBody,
  isLightTheme,
}: AccountSummaryProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 backdrop-blur-sm",
        isLightTheme
          ? "border-white/70 bg-white/60 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
          : "border-[#1a2a1a]/50 bg-[#0d120d]/80",
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded",
            isLightTheme ? "bg-emerald-500/15" : "bg-emerald-500/20",
          )}
        >
          <span className="text-xs text-emerald-400">≡</span>
        </div>
        <h3 className={cn("font-semibold", isLightTheme ? "text-slate-950" : "text-white")}>Account Summary</h3>
      </div>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 text-emerald-500" />
          <div>
            <p className={cn("text-sm font-medium", isLightTheme ? "text-slate-950" : "text-white")}>
              {emailStatusTitle}
            </p>
            <p className={cn("text-xs", isLightTheme ? "text-slate-500" : "text-gray-500")}>{emailStatusBody}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Home className="mt-0.5 h-4 w-4 text-yellow-500" />
          <div>
            <p className={cn("text-sm font-medium", isLightTheme ? "text-slate-950" : "text-white")}>
              {recommendationTitle}
            </p>
            <p className={cn("text-xs", isLightTheme ? "text-slate-500" : "text-gray-500")}>
              {recommendationBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
