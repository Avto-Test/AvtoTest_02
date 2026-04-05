"use client"

import { ArrowRight, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

function CircularProgress({ value }: { value: number }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative size-44">
      <svg className="size-full -rotate-90" viewBox="0 0 160 160">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-white/10"
        />
        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground">{value}%</span>
        <span className="text-sm text-emerald-400 font-medium">Yoqori</span>
      </div>
    </div>
  )
}

export function ReadinessCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-950/50 to-card border border-emerald-500/20 p-6">
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Simulyatsiya tayyorligi
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Kol harakati copdtiyas watn hearning e noiwi.
      </p>

      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline"
          className="bg-transparent border-emerald-500/30 hover:bg-emerald-500/10 text-foreground"
        >
          <ArrowRight className="size-4 mr-2" />
          Mahq qilish
        </Button>
        <CircularProgress value={77} />
      </div>

      {/* Recent Activity */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">So&apos;nggi faoliyat</h4>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
          <div className="size-10 rounded-lg bg-white/10 flex items-center justify-center">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Dars organild</p>
            <p className="text-xs text-muted-foreground">Learning Review Session</p>
          </div>
          <span className="text-xs text-muted-foreground">2 soat oldin</span>
        </div>
      </div>
    </div>
  )
}
