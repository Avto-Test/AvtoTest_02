"use client"

import { Search, Sparkles, Zap, Coins, Flame, Award } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface StatBadgeProps {
  icon: React.ElementType
  value: string
  label: string
  color?: string
}

function StatBadge({ icon: Icon, value, label, color = "text-emerald-400" }: StatBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
      <Icon className={`size-4 ${color}`} />
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
    </div>
  )
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section - Greeting */}
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">
            Xayrilhi kech, <span className="text-emerald-400">haydovchi</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Yo&apos;l harakati qoidalari bo&apos;yicha mashg&apos;uloting yigari
          </p>
        </div>

        {/* Center Section - Stats */}
        <div className="hidden lg:flex items-center gap-3">
          <StatBadge icon={Sparkles} value="2791" label="XP" color="text-emerald-400" />
          <StatBadge icon={Coins} value="495" label="COIN" color="text-yellow-400" />
          <StatBadge icon={Flame} value="LVI" label="X%" color="text-orange-400" />
          <StatBadge icon={Award} value="Lvl 6" label="LEVEL" color="text-blue-400" />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Qidirish..."
              className="w-64 h-9 pl-9 pr-4 rounded-full bg-white/5 border border-white/10 text-sm 
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50
                       focus:border-emerald-500/50 transition-all"
            />
          </div>

          {/* XP Progress */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-xs text-muted-foreground">Keyingi level</span>
            <span className="text-sm font-bold text-emerald-400">299 XP</span>
          </div>

          {/* Upgrade Button */}
          <Button 
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 
                     text-white font-medium shadow-lg shadow-emerald-500/25 border-0"
          >
            <Zap className="size-4 mr-1" />
            Upgrade
          </Button>

          {/* Theme Toggle Placeholder */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="text-xs text-muted-foreground">A</span>
            <span className="text-xs text-muted-foreground">ø</span>
          </div>

          {/* User Avatar */}
          <Avatar className="size-9 ring-2 ring-emerald-500/50">
            <AvatarImage src="/avatar.png" alt="User" />
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold">
              A
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
