"use client"

import { 
  LayoutDashboard, 
  PlayCircle, 
  CheckSquare, 
  BarChart3, 
  Trophy, 
  BookOpen, 
  Sparkles,
  Car,
  Users,
  User,
  Settings,
  Shield,
  HelpCircle,
  Sun
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  activeItem?: string
}

const menuItems = {
  asost: [
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
    { icon: PlayCircle, label: "Amaliyot", id: "amaliyot" },
    { icon: CheckSquare, label: "Simulyatsiya", id: "simulyatsiya" },
  ],
  tahlil: [
    { icon: BarChart3, label: "Analitika", id: "analitika" },
    { icon: Trophy, label: "Leaderboard", id: "leaderboard" },
    { icon: BookOpen, label: "Lessons", id: "lessons" },
    { icon: Sparkles, label: "Learning Path", id: "learning-path" },
  ],
  xizmatlar: [
    { icon: Car, label: "Avtomaktablar", id: "avtomaktablar" },
    { icon: Users, label: "Instruktorlar", id: "instruktorlar" },
    { icon: User, label: "Profil", id: "profil" },
    { icon: Settings, label: "Sozlamalar", id: "sozlamalar" },
  ],
}

export function Sidebar({ activeItem = "simulyatsiya" }: SidebarProps) {
  return (
    <aside className="w-56 h-screen bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">AUTOTEST</span>
        <button className="ml-auto text-gray-500 hover:text-gray-400">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* ASOST Section */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">ASOST</p>
          <ul className="space-y-1">
            {menuItems.asost.map((item) => (
              <li key={item.id}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                    activeItem === item.id
                      ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400"
                      : "text-gray-400 hover:text-gray-300 hover:bg-[#151515]"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* TAHLIL VA O'QISH Section */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">TAHLIL VA O{"'"}QISH</p>
          <ul className="space-y-1">
            {menuItems.tahlil.map((item) => (
              <li key={item.id}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                    activeItem === item.id
                      ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400"
                      : "text-gray-400 hover:text-gray-300 hover:bg-[#151515]"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* XIZMATLAR Section */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">XIZMATLAR</p>
          <ul className="space-y-1">
            {menuItems.xizmatlar.map((item) => (
              <li key={item.id}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                    activeItem === item.id
                      ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400"
                      : "text-gray-400 hover:text-gray-300 hover:bg-[#151515]"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Admin Link */}
        <div className="pt-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-400 hover:bg-[#151515] transition-all">
            <Shield className="w-4 h-4" />
            <span>Admin</span>
          </button>
        </div>
      </nav>

      {/* Weather Widget */}
      <div className="p-4 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">14°C</p>
            <p className="text-gray-500 text-xs">Partly cloudy</p>
          </div>
          <button className="ml-auto text-gray-500 hover:text-gray-400">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
