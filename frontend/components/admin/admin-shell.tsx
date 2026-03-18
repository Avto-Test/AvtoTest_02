"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Menu, Shield, X } from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useUser } from "@/hooks/use-user";
import { adminNavigation, findAdminNavigationItem, isAdminPathActive } from "@/lib/admin-navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";
import { Skeleton } from "@/shared/ui/skeleton";

function AdminSidebar({
  pathname,
  collapsed,
  onToggleCollapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-[var(--sidebar-border)] px-4">
        <Link href="/admin" className="flex min-w-0 items-center gap-3" onClick={onNavigate}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--accent))] text-[var(--primary-foreground)] shadow-[var(--shadow-soft)]">
            <Shield className="h-5 w-5" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--sidebar-foreground)]">AUTOTEST Admin</p>
              <p className="truncate text-xs text-[color-mix(in_oklab,var(--sidebar-foreground)_58%,transparent)]">
                Alohida boshqaruv shell
              </p>
            </div>
          ) : null}
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="hidden text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] lg:inline-flex"
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {adminNavigation.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed ? (
              <p className="px-3 text-[11px] uppercase tracking-[0.22em] text-[color-mix(in_oklab,var(--sidebar-foreground)_46%,transparent)]">
                {section.title}
              </p>
            ) : null}
            {section.items.map((item) => {
              const active = isAdminPathActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3 py-3 transition",
                    active
                      ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)] shadow-[var(--shadow-soft)]"
                      : "text-[color-mix(in_oklab,var(--sidebar-foreground)_78%,transparent)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]",
                  )}
                  title={item.label}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed ? (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p
                        className={cn(
                          "truncate text-xs",
                          active
                            ? "text-[color-mix(in_oklab,var(--sidebar-foreground)_62%,transparent)]"
                            : "text-[color-mix(in_oklab,var(--sidebar-foreground)_48%,transparent)]",
                        )}
                      >
                        {item.description}
                      </p>
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, authenticated, logout } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = usePersistentState("autotest.admin.sidebar.collapsed", false);
  const currentItem = useMemo(() => findAdminNavigationItem(pathname), [pathname]);

  if (loading) {
    return (
      <div className="page-shell min-h-screen bg-[var(--background)] p-6">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <Skeleton className="h-[calc(100vh-3rem)] rounded-[2rem] bg-[var(--muted)]" />
          <div className="space-y-6">
            <Skeleton className="h-24 rounded-[2rem] bg-[var(--muted)]" />
            <Skeleton className="h-[70vh] rounded-[2rem] bg-[var(--muted)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated || user?.is_admin !== true) {
    return (
      <div className="page-shell min-h-screen bg-[var(--background)] p-6">
        <div className="mx-auto max-w-3xl pt-24">
          <ErrorState
            title="Admin ruxsati topilmadi"
            description="Bu shell faqat `is_admin=true` foydalanuvchilar uchun ochiladi. Sessiya yoki rolni tekshiring."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen bg-[var(--background)] p-3 text-[var(--foreground)] sm:p-4 lg:p-5">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <aside
          className={cn(
            "hidden overflow-hidden rounded-[2rem] border border-[var(--sidebar-border)] bg-[var(--sidebar)] shadow-[var(--shadow-soft)] lg:block",
            collapsed ? "w-24" : "w-80",
          )}
        >
          <AdminSidebar
            pathname={pathname}
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((value) => !value)}
          />
        </aside>

        <div className="min-w-0 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--content-bg)] shadow-[var(--shadow-soft)]">
          <header className="border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_96%,var(--background))] px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-[var(--foreground)] hover:bg-[var(--muted)] lg:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">Admin shell</Badge>
                    <Badge variant="outline" className="border-[var(--border)] text-[var(--muted-foreground)]">
                      {currentItem.label}
                    </Badge>
                  </div>
                  <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{currentItem.label}</h1>
                  <p className="mt-1 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">{currentItem.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ThemeToggle />
                <Link href="/dashboard">
                  <Button variant="outline" className="border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]">
                    <ArrowLeft className="h-4 w-4" />
                    Student panel
                  </Button>
                </Link>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_92%,var(--background))] px-3 py-2 text-left transition hover:bg-[var(--muted)]"
                  onClick={() => void logout()}
                >
                  <Avatar
                    src={null}
                    fallback={(user.full_name ?? user.email).slice(0, 2).toUpperCase()}
                    className="h-10 w-10"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">{user.full_name ?? user.email}</p>
                    <p className="truncate text-xs text-[var(--muted-foreground)]">{user.email}</p>
                  </div>
                </button>
              </div>
            </div>
          </header>

          <main className="min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-7">{children}</main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="flex h-full w-[86vw] max-w-80 flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-16 items-center justify-between border-b border-[var(--sidebar-border)] px-4">
              <p className="text-sm font-semibold text-[var(--sidebar-foreground)]">Admin menu</p>
              <Button
                variant="ghost"
                size="icon"
                className="text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AdminSidebar
              pathname={pathname}
              collapsed={false}
              onToggleCollapsed={() => undefined}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
