"use client"

import { Bot, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AICoachProps {
  isCorrect: boolean
  feedbackMessage: string
  explanation: string
  xpReward: number
  coinsReward: number
  onContinue: () => void
}

export function AICoach({
  isCorrect,
  feedbackMessage,
  explanation,
  xpReward,
  coinsReward,
  onContinue,
}: AICoachProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-xl border border-cyan-500/20 shadow-xl shadow-cyan-500/5">
      {/* Ambient glow */}
      <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      
      {/* Header with rewards */}
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Robot Avatar with glow */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-cyan-500/30 blur-md" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-400/40 shadow-lg shadow-cyan-500/20">
              <Bot className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <span className="font-semibold text-white text-lg">AI Coach</span>
        </div>
        
        {/* Rewards */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 border border-emerald-500/30">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-emerald-400 text-sm">+{xpReward} XP</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1.5 border border-amber-500/30">
            <span className="text-amber-400">+</span>
            <span className="font-bold text-amber-400 text-sm">+{coinsReward} Coins</span>
          </div>
        </div>
      </div>

      {/* Feedback Row */}
      <div className="relative flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06] bg-gradient-to-r from-emerald-500/[0.08] to-transparent">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/25 shadow-lg shadow-emerald-500/20">
          <Check className="h-4 w-4 text-emerald-400" />
        </div>
        <span className="font-semibold text-emerald-400">{feedbackMessage}</span>
        <span className="text-slate-400">Keep it up</span>
        
        <div className="ml-auto flex items-center gap-4">
          <span className="font-bold text-emerald-400">+{xpReward} XP</span>
          <span className="font-medium text-amber-400">+{coinsReward} Coins</span>
        </div>
      </div>

      {/* Explanation */}
      <div className="relative p-5">
        <div className="flex gap-4">
          {/* Mini avatar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30">
            <Bot className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-1.5">AI Coach</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-end mt-5">
          <Button
            onClick={onContinue}
            className="relative overflow-hidden bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold px-8 py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  )
}
