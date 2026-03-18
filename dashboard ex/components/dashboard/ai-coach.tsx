"use client"

import { Bot, ArrowRight, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AICoach() {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="size-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
          <Bot className="size-4 text-emerald-400" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          AI Coach
        </span>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Tavsiya:</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              Zaif mavzu: Chorrahalar
            </p>
            <ArrowRight className="size-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">5 savol</span>
            <ChevronRight className="size-4 text-muted-foreground ml-auto" />
          </div>
        </div>

        <Button 
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
        >
          Mashq qilish
        </Button>
      </div>
    </div>
  )
}
