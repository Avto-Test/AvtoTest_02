"use client"

import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface TopBarProps {
  currentQuestion: number
  totalQuestions: number
  answeredQuestions: Map<number, "correct" | "wrong" | "unanswered">
  timeRemaining: string
  onQuestionSelect: (question: number) => void
}

export function TopBar({
  currentQuestion,
  totalQuestions,
  answeredQuestions,
  timeRemaining,
  onQuestionSelect,
}: TopBarProps) {
  return (
    <div className="flex h-16 items-center justify-between border-b border-white/[0.06] bg-slate-900/50 backdrop-blur-xl px-4">
      {/* Question Navigation */}
      <div className="flex items-center gap-2">
        <button className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white/[0.06] hover:text-white transition-all duration-200">
          <ChevronLeft className="h-4 w-4" />
        </button>

        <ScrollArea className="max-w-[600px]">
          <div className="flex items-center gap-1.5 px-1">
            {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((num) => {
              const status = answeredQuestions.get(num) || "unanswered"
              return (
                <QuestionButton
                  key={num}
                  number={num}
                  status={status}
                  isActive={num === currentQuestion}
                  onClick={() => onQuestionSelect(num)}
                />
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <button className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-white/[0.06] hover:text-white transition-all duration-200">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-2.5 rounded-full bg-slate-800/60 backdrop-blur-sm px-5 py-2.5 border border-white/[0.06] shadow-lg shadow-black/20">
        <Clock className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-semibold text-white tabular-nums">{timeRemaining}</span>
      </div>
    </div>
  )
}

interface QuestionButtonProps {
  number: number
  status: "correct" | "wrong" | "unanswered"
  isActive: boolean
  onClick: () => void
}

function QuestionButton({ number, status, isActive, onClick }: QuestionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200",
        status === "correct" && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10",
        status === "wrong" && "bg-red-500/15 text-red-400 border border-red-500/40 shadow-lg shadow-red-500/10",
        status === "unanswered" && "bg-slate-800/60 text-slate-400 border border-white/[0.06]",
        isActive && status === "unanswered" && "bg-cyan-500/15 text-cyan-400 border-cyan-500/40 shadow-lg shadow-cyan-500/10",
        isActive && "ring-2 ring-cyan-400/30 ring-offset-2 ring-offset-slate-900"
      )}
    >
      {number}
      {/* Glow effect for answered */}
      {status === "correct" && (
        <span className="absolute inset-0 rounded-full bg-emerald-500/20 blur-sm -z-10" />
      )}
      {status === "wrong" && (
        <span className="absolute inset-0 rounded-full bg-red-500/20 blur-sm -z-10" />
      )}
    </button>
  )
}
