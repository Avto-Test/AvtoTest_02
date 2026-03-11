"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  MonitorSmartphone,
  Shield,
  Trophy,
  User,
  Users,
} from "lucide-react";

import AppNavbar from "@/components/AppNavbar";
import { SurfaceNav } from "@/components/intelligence/SurfaceNav";
import type { SurfaceNavConfigItem } from "@/config/navigation";
import { instructorNav, schoolNav, studentNav } from "@/config/navigation";
import { NavigationShellProvider } from "@/components/shell/navigation-shell-context";
import { cn } from "@/lib/utils";

type ShellRole = "student" | "instructor" | "school";

function resolveRole(pathname: string): ShellRole {
  if (pathname.startsWith("/instructor")) {
    return "instructor";
  }
  if (pathname.startsWith("/school")) {
    return "school";
  }
  return "student";
}

function resolveNav(role: ShellRole): SurfaceNavConfigItem[] {
  if (role === "instructor") {
    return instructorNav;
  }
  if (role === "school") {
    return schoolNav;
  }
  return studentNav;
}

function resolveRoleMeta(role: ShellRole) {
  if (role === "instructor") {
    return {
      label: "Instruktor",
      description: "Guruh holati va xavf signallarini kuzating",
      shellClassName: "product-shell-instructor",
      compact: false,
    };
  }
  if (role === "school") {
    return {
      label: "O'quv markaz",
      description: "Maktab bo'yicha umumiy natijalarni boshqaring",
      shellClassName: "product-shell-school",
      compact: false,
    };
  }
  return {
    label: "Talaba",
    description: "Mashq, simulyatsiya va tayyorgarlik oqimi",
    shellClassName: "product-shell-student",
    compact: true,
  };
}

const iconMap: Record<string, typeof LayoutDashboard> = {
  "/dashboard": LayoutDashboard,
  "/practice": BookOpen,
  "/simulation": MonitorSmartphone,
  "/analytics": BarChart3,
  "/leaderboard": Trophy,
  "/profile": User,
  "/billing": CreditCard,
  "/instructor/dashboard": LayoutDashboard,
  "/instructor/groups": Users,
  "/instructor/students": GraduationCap,
  "/instructor/analytics": BarChart3,
  "/school/dashboard": LayoutDashboard,
  "/school/instructors": GraduationCap,
  "/school/groups": Users,
  "/school/analytics": BarChart3,
};

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ProductSidebar({
  items,
  compact,
}: {
  items: SurfaceNavConfigItem[];
  compact: boolean;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <aside className={cn("product-sidebar", compact ? "w-[92px]" : "w-[268px]")}>
      <div className="flex w-full flex-col px-4 py-5">
        <Link
          href={compact ? "/dashboard" : items[0]?.href ?? "/dashboard"}
          className={cn("mb-8 flex items-center", compact ? "justify-center" : "gap-3 px-2")}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#2563EB,#22C55E)] text-sm font-bold text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.72)]">
            AT
          </div>
          {compact ? null : (
            <div>
              <p className="text-sm font-semibold text-slate-950">AUTOTEST</p>
              <p className="text-xs text-slate-500">Haydovchilik imtihoni platformasi</p>
            </div>
          )}
        </Link>

        <nav className="space-y-2">
          {items.map((item) => {
            const Icon = iconMap[item.href] ?? LayoutDashboard;
            const active = isItemActive(pathname, item.href);

            return (
              <motion.div
                key={item.href}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "product-nav-link",
                    compact && "product-nav-link-compact",
                    active && "product-nav-link-active",
                  )}
                  title={item.fallback}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {compact ? null : <span>{item.fallback}</span>}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {!compact ? (
          <div className="mt-auto rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.22)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">AUTOTEST</p>
            <p className="mt-3 text-sm font-medium text-slate-900">{"Soddalashtirilgan o'qish oqimi"}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {"Asosiy sahifalar shu menyuda jamlangan. Ortiqcha bo'limlar ko'rsatilmaydi."}
            </p>
          </div>
        ) : (
          <div className="mt-auto flex justify-center pb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-slate-200/80 bg-white/80 text-slate-400 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.22)]">
              <Shield className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function ProductShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const role = useMemo(() => resolveRole(pathname), [pathname]);
  const navItems = useMemo(() => resolveNav(role), [role]);
  const roleMeta = useMemo(() => resolveRoleMeta(role), [role]);

  return (
    <NavigationShellProvider>
      <div className={cn("min-h-screen", roleMeta.shellClassName)}>
        <div className="flex min-h-screen">
          <ProductSidebar items={navItems} compact={roleMeta.compact} />

          <div className="min-w-0 flex-1">
            <AppNavbar />
            <div className="xl:hidden">
              <div className="container-app py-4">
                <SurfaceNav items={navItems} scope="shell" />
              </div>
            </div>
            <main className="pb-10 pt-6">{children}</main>
          </div>
        </div>
      </div>
    </NavigationShellProvider>
  );
}
