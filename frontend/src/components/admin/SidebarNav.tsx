"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BrainCircuit, Building2, Gift, Users } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { adminNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

const iconMap = {
  "/admin/users": Users,
  "/admin/schools": Building2,
  "/admin/promos": Gift,
  "/admin/analytics": BarChart3,
  "/admin/ml": BrainCircuit,
};

export function SidebarNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="space-y-2">
      {adminNav.map((item) => {
        const Icon = iconMap[item.href as keyof typeof iconMap] ?? Users;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
              isActive
                ? "bg-white text-slate-950 shadow-[0_16px_32px_-24px_rgba(255,255,255,0.9)]"
                : "text-white/70 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" />
            {t(item.labelKey, item.fallback)}
          </Link>
        );
      })}
    </nav>
  );
}
