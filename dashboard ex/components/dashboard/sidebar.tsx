"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Target,
  MonitorPlay,
  BarChart3,
  Trophy,
  BookOpen,
  Route,
  Building2,
  Users,
  User,
  Settings,
  ChevronLeft,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const mainMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: true },
  { icon: Target, label: "Amaliyot", href: "/amaliyot" },
  { icon: MonitorPlay, label: "Simulyatsya", href: "/simulyatsiya" },
]

const analysisMenuItems = [
  { icon: BarChart3, label: "Analitka", href: "/analitka" },
  { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
  { icon: BookOpen, label: "Lessons", href: "/lessons" },
  { icon: Route, label: "Learning Path", href: "/learning-path" },
]

const serviceMenuItems = [
  { icon: Building2, label: "Avtomaktablar", href: "/avtomaktablar" },
  { icon: Users, label: "Instruktorlar", href: "/instruktorlar" },
  { icon: User, label: "Profil", href: "/profil" },
  { icon: Settings, label: "Sozlamalar", href: "/sozlamalar" },
]

interface MenuItemProps {
  icon: React.ElementType
  label: string
  href: string
  active?: boolean
  collapsed?: boolean
}

function MenuItem({ icon: Icon, label, href, active, collapsed }: MenuItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
        "hover:bg-white/5",
        active && "bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
        !active && "text-muted-foreground hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn("size-5 shrink-0", active && "text-emerald-400")} />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border",
        "flex flex-col transition-all duration-300",
        "hidden lg:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">A</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight">
              AUTO<span className="text-emerald-400">TEST</span>
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* Main Section */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Asosiy
            </span>
          )}
          <div className="space-y-0.5 mt-2">
            {mainMenuItems.map((item) => (
              <MenuItem key={item.label} {...item} collapsed={collapsed} />
            ))}
          </div>
        </div>

        {/* Analysis Section */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Tahlil va o&apos;qish
            </span>
          )}
          <div className="space-y-0.5 mt-2">
            {analysisMenuItems.map((item) => (
              <MenuItem key={item.label} {...item} collapsed={collapsed} />
            ))}
          </div>
        </div>

        {/* Services Section */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Xizmatlar
            </span>
          )}
          <div className="space-y-0.5 mt-2">
            {serviceMenuItems.map((item) => (
              <MenuItem key={item.label} {...item} collapsed={collapsed} />
            ))}
          </div>
        </div>
      </nav>

      {/* Weather Widget */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-2xl">🌤️</span>
            <div>
              <p className="font-medium text-foreground">17°C</p>
              <p className="text-xs">Cloudy</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
