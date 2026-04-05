'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart2,
  Gauge,
  LayoutDashboard,
  Medal,
  Settings,
  Trophy,
  User,
  ChevronRight,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

const baseNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  // Launcher for learning flows (tests, lessons, review queue)
  { name: "Practice", href: "/tests", icon: Activity },
  // Full exam/simulation entry – currently points to stress/pressure mode
  { name: "Simulation Exam", href: "/tests?pressure=true", icon: Gauge },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Achievements", href: "/achievements", icon: Medal },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({
  className,
  onMobileItemClick,
}: {
  className?: string;
  onMobileItemClick?: () => void;
}) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const navigation = [...baseNavigation];
  if (user?.is_admin) {
    navigation.push({ name: "Admin Panel", href: "/admin", icon: Shield });
  }

  return (
    <div className={cn("flex h-full w-64 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]", className)}>
      <div className="flex h-20 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onMobileItemClick}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sidebar-accent)] shadow-sm">
            <span className="text-base font-bold text-primary">AT</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-[var(--sidebar-foreground)]">
            AUTO<span className="text-primary">TEST</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {navigation.map((item) => {
          const itemPath = item.href.split("?")[0];
          const isActive = pathname === itemPath || pathname.startsWith(itemPath + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onMobileItemClick}
              className={cn(
                "group flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={cn(
                    "h-4 w-4",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-primary",
                  )}
                />
                {item.name}
              </div>
              {isActive && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] p-4">
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
