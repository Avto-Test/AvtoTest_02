"use client";

import Link from "next/link";
import { Building2, Car, ChevronLeft, ChevronRight, Shield, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { useUser } from "@/hooks/use-user";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { isSuperAdmin } from "@/lib/rbac";
import { primaryNavigation, secondaryNavigation, utilityNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

type AppSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  collapsed,
  pathname,
  ownerNavigation,
  managementNavigation,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  ownerNavigation: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  managementNavigation: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-6 px-3 py-4">
      <div className="space-y-0.5">
        {!collapsed ? (
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Asosiy</p>
        ) : null}
        {primaryNavigation.map((item) => {
          const active = isPathActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--sidebar-foreground)]/75 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]",
              )}
              title={item.label}
              onClick={onNavigate}
            >
              <item.icon className="h-5 w-5 shrink-0 opacity-90" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </div>

      <div className="space-y-0.5">
        {!collapsed ? (
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Tahlil va o'qish</p>
        ) : null}
        {secondaryNavigation.map((item) => {
          const active = isPathActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--sidebar-foreground)]/75 hover:bg-[var(--sidebar-accent)]",
              )}
              title={item.label}
              onClick={onNavigate}
            >
              <item.icon className="h-5 w-5 shrink-0 opacity-90" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </div>

      <div className="space-y-0.5">
        {!collapsed ? (
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Xizmatlar</p>
        ) : null}
        {utilityNavigation.map((item) => {
          const active = isPathActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)]",
              )}
              title={item.label}
              onClick={onNavigate}
            >
              <item.icon className="h-5 w-5 shrink-0 opacity-90" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </div>

      {managementNavigation.length > 0 ? (
        <div className="space-y-0.5">
          {!collapsed ? (
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Boshqaruv</p>
          ) : null}
          {managementNavigation.map((item) => {
            const active = isPathActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-[var(--sidebar-foreground)]/75 hover:bg-[var(--sidebar-accent)]",
                )}
                title={item.label}
                onClick={onNavigate}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </div>
      ) : null}

      {ownerNavigation.length > 0 ? (
        <div className="space-y-0.5">
          {!collapsed ? (
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Kabinet</p>
          ) : null}
          {ownerNavigation.map((item) => {
            const active = isPathActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-[var(--sidebar-foreground)]/75 hover:bg-[var(--sidebar-accent)]",
                )}
                title={item.label}
                onClick={onNavigate}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [collapsed, setCollapsed] = usePersistentState("autotest.sidebar.collapsed", false);
  const managementNavigation = isSuperAdmin(user) ? [{ href: "/admin", label: "Admin", icon: Shield }] : [];
  const ownerNavigation = [
    ...(user?.has_school_profile ? [{ href: "/school/dashboard", label: "School", icon: Building2 }] : []),
    ...(user?.has_instructor_profile ? [{ href: "/instructor/dashboard", label: "Instruktor", icon: UserRound }] : []),
  ];

  return (
    <>
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 hidden h-screen border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:flex lg:flex-col",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--sidebar-border)]/60 px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-brand)]">
              <Car className="h-5 w-5 text-[var(--accent-brand-contrast)]" />
            </div>
            {!collapsed ? (
              <span className="text-base font-bold tracking-tight">AUTOTEST</span>
            ) : null}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)]"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <SidebarNav
          collapsed={collapsed}
          pathname={pathname}
          ownerNavigation={ownerNavigation}
          managementNavigation={managementNavigation}
        />
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-[var(--backdrop-scrim)] backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      ) : null}
      {mobileOpen ? (
        <aside
          className="fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-16 items-center justify-between border-b border-[var(--sidebar-border)] px-4">
            <Link href="/dashboard" className="flex items-center gap-3" onClick={onMobileClose}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-brand)]">
                <Car className="h-5 w-5 text-[var(--accent-brand-contrast)]" />
              </div>
              <span className="text-base font-bold tracking-tight">AUTOTEST</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={onMobileClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <SidebarNav
            collapsed={false}
            pathname={pathname}
            ownerNavigation={ownerNavigation}
            managementNavigation={managementNavigation}
            onNavigate={onMobileClose}
          />
        </aside>
      ) : null}
    </>
  );
}
