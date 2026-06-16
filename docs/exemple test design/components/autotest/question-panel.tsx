"use client"

import { cn } from "@/lib/utils"
import { Check, Lock } from "lucide-react"

interface Answer {
  id: string
  text: string
}

interface QuestionPanelProps {
  questionNumber: number
  questionText: string
  answers: Answer[]
  selectedAnswer: string | null
  correctAnswer: string
  isLocked: boolean
  onAnswerSelect: (answerId: string) => void
}

export function QuestionPanel({
  questionNumber,
  questionText,
  answers,
  selectedAnswer,
  correctAnswer,
  isLocked,
  onAnswerSelect,
}: QuestionPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Question Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-white leading-relaxed tracking-tight">
          Yomg&apos;irli trassssada demo-vaziyat: {questionNumber}:
        </h2>
        <p className="text-xl font-medium text-slate-200 mt-2 leading-relaxed">
          {questionText}
        </p>
      </div>

      {/* Answer Options */}
      <div className="flex flex-col gap-3">
        {answers.map((answer, index) => {
          const letter = String.fromCharCode(65 + index) // A, B, C, D
          const isSelected = selectedAnswer === answer.id
          const isCorrect = answer.id === correctAnswer
          const showCorrect = isLocked && isCorrect
          const showWrong = isLocked && isSelected && !isCorrect
          const isDisabled = isLocked && !isCorrect && !isSelected

          return (
            <button
              key={answer.id}
              onClick={() => !isLocked && onAnswerSelect(answer.id)}
              disabled={isLocked}
              className={cn(
                "group relative flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-200",
                "border backdrop-blur-sm",
                // Correct state
                showCorrect && "bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 border-emerald-500/40 shadow-lg shadow-emerald-500/10",
                // Wrong state
                showWrong && "bg-gradient-to-r from-red-500/15 to-red-500/5 border-red-500/40 shadow-lg shadow-red-500/10",
                // Default state
                !showCorrect && !showWrong && !isDisabled && "bg-gradient-to-r from-slate-800/80 to-slate-800/40 border-white/[0.08] hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5",
                // Disabled state
                isDisabled && "bg-slate-800/30 border-white/[0.04] text-slate-500 cursor-not-allowed"
              )}
            >
              {/* Glow overlay for correct */}
              {showCorrect && (
                <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 blur-xl -z-10" />
              )}
              
              {/* Letter Badge */}
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all duration-200",
                  showCorrect && "bg-emerald-500/25 text-emerald-400 shadow-lg shadow-emerald-500/20",
                  showWrong && "bg-red-500/25 text-red-400 shadow-lg shadow-red-500/20",
                  !showCorrect && !showWrong && !isDisabled && "bg-slate-700/60 text-slate-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-400",
                  isDisabled && "bg-slate-800/40 text-slate-600"
                )}
              >
                {letter}
              </div>

              {/* Answer Text */}
              <span className={cn(
                "flex-1 text-sm font-medium leading-relaxed",
                showCorrect && "text-emerald-100",
                showWrong && "text-red-100",
                !showCorrect && !showWrong && !isDisabled && "text-slate-200",
                isDisabled && "text-slate-500"
              )}>
                {answer.text}
              </span>

              {/* Status Icon */}
              {showCorrect && (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/25 shadow-lg shadow-emerald-500/20">
                  <Check className="h-5 w-5 text-emerald-400" />
                </div>
              )}
              {isDisabled && (
                <Lock className="h-4 w-4 text-slate-600" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
