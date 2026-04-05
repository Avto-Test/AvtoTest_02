"use client"

import { Search, Sparkles, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TopNavbarProps {
  xp?: number
  coins?: number
  seriva?: number
  level?: number
}

export function TopNavbar({ 
  xp = 307, 
  coins = 90, 
  seriva = 1,
  level = 6 
}: TopNavbarProps) {
  return (
    <header className="h-16 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#1a1a1a] flex items-center px-6 gap-4 fixed top-0 left-56 right-0 z-30">
      {/* Stats */}
      <div className="flex items-center gap-6">
        {/* XP */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.5 5H13L9.5 8L11 13L7 10L3 13L4.5 8L1 5H5.5L7 1Z" fill="#22c55e"/>
            </svg>
          </div>
          <span className="text-white text-sm font-medium">{xp} XP</span>
        </div>

        {/* Coins */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5" fill="#facc15"/>
            </svg>
          </div>
          <span className="text-white text-sm font-medium">{coins}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-amber-400">
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>

        {/* SERIVA */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-500/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2V12M4 5L7 2L10 5M4 9L7 12L10 9" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-gray-400 text-sm">SERIVA</span>
          <span className="text-white text-sm font-medium">{seriva}</span>
        </div>

        {/* Level */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.5 5H13L9.5 8L11 13L7 10L3 13L4.5 8L1 5H5.5L7 1Z" fill="#facc15"/>
            </svg>
          </div>
          <span className="text-gray-400 text-sm">LVL</span>
          <span className="text-white text-sm font-medium">{level}</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Qidirish..."
            className="w-full h-10 bg-[#151515] border border-[#252525] rounded-lg pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Premium Button */}
        <Button className="h-9 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-medium rounded-full">
          <Sparkles className="w-4 h-4 mr-2" />
          Premium
        </Button>

        {/* Notification */}
        <button className="w-9 h-9 rounded-full bg-[#151515] border border-[#252525] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#353535] transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
        </div>

        {/* Profile with notification */}
        <div className="relative">
          <button className="w-9 h-9 rounded-full bg-[#151515] border border-[#252525] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" stroke="#9ca3af" strokeWidth="1.5" fill="none"/>
              <path d="M2 14C2 11 5 9 8 9C11 9 14 11 14 14" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">3</span>
        </div>
      </div>
    </header>
  )
}
