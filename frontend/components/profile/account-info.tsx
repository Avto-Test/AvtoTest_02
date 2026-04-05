"use client";

import { Calendar, CheckCircle, Crown } from "lucide-react";

import { cn } from "@/lib/utils";

type AccountInfoProps = {
  plan: string;
  verified: boolean;
  joinedAt: string;
  isLightTheme: boolean;
};

export function AccountInfo({ plan, verified, joinedAt, isLightTheme }: AccountInfoProps) {
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
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded",
              isLightTheme ? "bg-emerald-500/15" : "bg-emerald-500/20",
            )}
          >
            <span className="text-xs text-emerald-400">≡</span>
          </div>
          <h3 className={cn("font-semibold", isLightTheme ? "text-slate-950" : "text-white")}>Account Info</h3>
        </div>
        <span className={cn(isLightTheme ? "text-slate-400" : "text-gray-500")}>›</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span className={cn("text-sm", isLightTheme ? "text-slate-500" : "text-gray-400")}>Plan</span>
          </div>
          <span className={cn("text-sm", isLightTheme ? "text-slate-950" : "text-white")}>{plan}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className={cn("text-sm", isLightTheme ? "text-slate-500" : "text-gray-400")}>
              Verification
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-emerald-500" />
            <span className="text-sm text-emerald-400">{verified ? "Verified" : "Pending"}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className={cn("h-4 w-4", isLightTheme ? "text-slate-400" : "text-gray-500")} />
            <span className={cn("text-sm", isLightTheme ? "text-slate-500" : "text-gray-400")}>Joined</span>
          </div>
          <span className={cn("text-sm", isLightTheme ? "text-slate-950" : "text-white")}>{joinedAt}</span>
        </div>
      </div>
    </div>
  );
}
