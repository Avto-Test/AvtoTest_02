"use client"

import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface RewardBannerProps {
  xp: number
  coins: number
  show: boolean
}

export function RewardBanner({ xp, coins, show }: RewardBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4 transition-all duration-500 ease-out",
        show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-6 scale-95"
      )}
    >
      {/* Glassmorphism container */}
      <div className="relative flex items-center gap-4 rounded-full bg-slate-800/60 backdrop-blur-xl px-2 py-2 border border-white/[0.1] shadow-2xl shadow-black/40">
        {/* Animated glow behind */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/20 via-transparent to-amber-500/20 blur-xl -z-10 animate-pulse" />
        
        {/* XP Reward */}
        <div className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 border border-emerald-500/40 px-5 py-2.5 shadow-lg shadow-emerald-500/20">
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-sm" />
          <Sparkles className="relative h-5 w-5 text-emerald-400 animate-pulse" />
          <span className="relative font-bold text-emerald-400 text-lg">+{xp} XP</span>
        </div>

        {/* Coins Reward */}
        <div className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/40 px-5 py-2.5 shadow-lg shadow-amber-500/20">
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-sm" />
          <span className="relative text-amber-400 text-xl">+{coins} Coins</span>
          <span className="relative text-2xl">🪙</span>
        </div>
      </div>
    </div>
  )
}
