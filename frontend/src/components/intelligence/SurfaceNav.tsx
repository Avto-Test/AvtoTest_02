"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

import { useI18n } from "@/components/i18n-provider";
import type { SurfaceNavConfigItem } from "@/config/navigation";
import { useNavigationShell } from "@/components/shell/navigation-shell-context";
import { cn } from "@/lib/utils";

type SurfaceNavProps = {
  items: SurfaceNavConfigItem[];
  className?: string;
  scope?: "auto" | "shell";
};

export function SurfaceNav({
  items,
  className,
  scope = "auto",
}: SurfaceNavProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { t } = useI18n();
  const hasShell = useNavigationShell();

  if (scope !== "shell" && hasShell) {
    return null;
  }

  return (
    <nav className={cn("intelligence-nav-shell inline-flex max-w-full flex-wrap gap-1", className)}>
      {items.map((item) => {
        const isRootDashboard = item.href === "/dashboard";
        const isRootAdmin = item.href === "/admin";
        const isActive = isRootDashboard
          ? pathname === item.href || pathname.startsWith("/dashboard/")
          : isRootAdmin
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <motion.div
            key={item.href}
            whileHover={reduceMotion ? undefined : { y: -1 }}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            <Link
              href={item.href}
              className={cn(
                "intelligence-nav-link",
                isActive && "intelligence-nav-link-active",
              )}
            >
              {t(item.labelKey, item.fallback)}
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );
}

export default SurfaceNav;
