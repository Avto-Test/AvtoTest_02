"use client"

import { Play, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SimulationCard() {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-sm font-medium text-muted-foreground">↓ evel:</span>
      </div>

      {/* Content */}
      <div className="flex items-center gap-3 mb-4">
        <Play className="size-5 text-emerald-400" />
        <span className="text-lg font-semibold text-foreground">
          Simulyatsiyai boslash
        </span>
      </div>

      <Button 
        className="w-full bg-transparent hover:bg-emerald-500/10 text-emerald-400 
                 border border-emerald-500/30 hover:border-emerald-500/50 font-medium"
      >
        <ArrowRight className="size-4 mr-2" />
        Simulyatsiyani boslash
      </Button>
    </div>
  )
}
