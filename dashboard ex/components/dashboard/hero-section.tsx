"use client"

import { Target, Clock, Sparkles, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-emerald-950/20 border border-border p-6">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-10 bottom-0 size-48 rounded-full bg-emerald-600/5 blur-2xl" />
        {/* Road decoration - simplified */}
        <svg className="absolute right-0 bottom-0 w-1/2 h-full opacity-20" viewBox="0 0 400 300">
          <path
            d="M400 300 Q 350 250, 300 200 T 200 100 T 100 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="60"
            className="text-white/5"
          />
          <path
            d="M400 300 Q 350 250, 300 200 T 200 100 T 100 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="20 20"
            className="text-white/30"
          />
        </svg>
      </div>

      <div className="relative">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <Sparkles className="size-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Keyingi Qadam:
          </span>
        </div>

        {/* Main Title */}
        <div className="flex items-start gap-3 mb-2">
          <div className="mt-1 size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Target className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Keyingi qadam:
            </h2>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">
              12 ta savol mashqni boshlang
            </h3>
          </div>
        </div>

        {/* Subtitle */}
        <div className="flex items-center gap-2 text-muted-foreground mb-6 ml-11">
          <Clock className="size-4" />
          <span className="text-sm">(3 daqiqa</span>
          <span className="text-sm">•</span>
          <span className="text-sm">70% success chance)</span>
        </div>

        {/* CTA Button */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 
                     text-white font-semibold shadow-lg shadow-emerald-500/30 border-0 px-6"
          >
            Mashqni boshlash
          </Button>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
            <span>Tal loìng (ét.i(koj oťq. bekìnyere</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Savollar</p>
            <p className="text-2xl font-bold text-foreground">12</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Kunlik Reja</p>
            <p className="text-2xl font-bold text-foreground">1/3</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bajarilgan</p>
            <div className="flex items-center gap-2">
              <Progress value={33} className="flex-1 h-2 bg-white/10" />
              <span className="text-lg font-bold text-foreground">33%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Bajarilgen: 33%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
