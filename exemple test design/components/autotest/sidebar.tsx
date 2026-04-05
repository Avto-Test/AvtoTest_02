"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BookOpen,
  Car,
  BarChart3,
  Sparkles,
  Medal,
  Shield,
  User,
  Settings,
  ChevronDown,
} from "lucide-react"

interface NavItem {
  icon: React.ReactNode
  label: string
  active?: boolean
  section?: string
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", section: "AQQIM" },
  { icon: <BookOpen className="h-5 w-5" />, label: "Practice", active: true },
  { icon: <Car className="h-5 w-5" />, label: "kelbsleruland" },
]

const statsItems: NavItem[] = [
  { icon: <BarChart3 className="h-5 w-5" />, label: "Statistik", section: "TABLI VA STATLAR" },
  { icon: <Sparkles className="h-5 w-5" />, label: "XP" },
  { icon: <Medal className="h-5 w-5" />, label: "Level" },
]

const toolsItems: NavItem[] = [
  { icon: <Shield className="h-5 w-5" />, label: "Artomistalar", section: "K EEIMATLAR" },
  { icon: <User className="h-5 w-5" />, label: "Profil" },
  { icon: <Settings className="h-5 w-5" />, label: "Settings" },
]

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-xl border-r border-white/[0.06]">
      {/* Subtle inner glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] to-transparent pointer-events-none" />
      
      {/* Logo */}
      <div className="relative flex h-16 items-center gap-2.5 px-4 border-b border-white/[0.06]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
          <span className="text-cyan-400 font-bold text-lg">X</span>
        </div>
        <span className="font-semibold text-lg text-white tracking-tight">AUTOTEST</span>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto py-4">
        {/* Main Nav */}
        <div className="px-3 mb-6">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">AQQIM</p>
          {navItems.map((item) => (
            <NavButton key={item.label} {...item} />
          ))}
        </div>

        {/* Stats */}
        <div className="px-3 mb-6">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">TABLI VA STATLAR</p>
          {statsItems.map((item) => (
            <NavButton key={item.label} {...item} />
          ))}
        </div>

        {/* Tools */}
        <div className="px-3 mb-6">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">K EEIMATLAR</p>
          {toolsItems.map((item) => (
            <NavButton key={item.label} {...item} />
          ))}
        </div>

        {/* Rosidariy */}
        <div className="px-3">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">ROSIDARIY</p>
        </div>
      </nav>

      {/* Premium */}
      <div className="relative border-t border-white/[0.06] p-4">
        <button className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-400 hover:text-white transition-all duration-200 hover:bg-white/[0.04]">
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 group-hover:border-slate-400 transition-colors">
            <ChevronDown className="h-3 w-3" />
          </div>
          <span className="text-sm font-medium">Premium</span>
        </button>
      </div>
    </aside>
  )
}

function NavButton({ icon, label, active }: NavItem) {
  return (
    <button
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-gradient-to-r from-white/[0.08] to-white/[0.04] text-white shadow-lg shadow-black/20 border border-white/[0.08]"
          : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
      )}
    >
      <span className={cn(
        "transition-colors duration-200",
        active ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
      )}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}
