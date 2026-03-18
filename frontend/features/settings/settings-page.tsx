"use client";

import { Bell, Mail, PanelLeft, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { useNotifications } from "@/hooks/use-notifications";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useUser } from "@/hooks/use-user";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";

export function SettingsPage() {
  const { user, loading: userLoading, authenticated, logout } = useUser();
  const notifications = useNotifications(20);
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentState("autotest.sidebar.collapsed", false);

  useEffect(() => {
    if (!authenticated) {
      setSidebarCollapsed(false);
    }
  }, [authenticated, setSidebarCollapsed]);

  if (userLoading) {
    return (
      <AppShell>
        <div className="h-96 animate-pulse rounded-3xl bg-[var(--muted)]" />
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <ErrorState description="Sozlamalar sahifasini ochish uchun sessiya kerak." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Sozlamalar"
          description="Account holati, bildirishnomalar va foydalanuvchi boshqaruvi."
          action={
            notifications.unreadCount > 0 ? (
              <Button variant="outline" onClick={() => void notifications.markAllRead()}>
                Barchasini o'qilgan qilish
              </Button>
            ) : undefined
          }
        />

        {notifications.error ? (
          <ErrorState description="Bildirishnomalarni yuklab bo'lmadi." onRetry={() => void notifications.reload()} />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Bildirishnomalar markazi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.notifications.length === 0 ? (
                <EmptyState title="Bildirishnoma yo'q" description="Yangi bildirishnomalar paydo bo'lganda shu list to'ldiriladi." />
              ) : (
                notifications.notifications.map((notification) => (
                  <button
                    key={notification.id}
                    className={`w-full rounded-2xl border p-4 text-left transition hover:bg-[var(--muted)] ${
                      notification.is_read
                        ? "border-[var(--border)]"
                        : "border-[color-mix(in_oklab,var(--primary)_30%,transparent)] bg-[color-mix(in_oklab,var(--primary)_6%,transparent)]"
                    }`}
                    onClick={() => void notifications.markRead(notification.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{notification.title}</p>
                          {!notification.is_read ? <Badge>Yangi</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{notification.message}</p>
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">{formatRelativeTime(notification.created_at)}</p>
                      </div>
                      <Bell className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account va xavfsizlik</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Email</p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] p-4">
                    <p className="text-sm text-[var(--muted-foreground)]">Verifikatsiya</p>
                    <p className="mt-2 font-semibold">{user.is_verified ? "Tasdiqlangan" : "Kutilmoqda"}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] p-4">
                    <p className="text-sm text-[var(--muted-foreground)]">Plan</p>
                    <p className="mt-2 font-semibold">{user.plan === "premium" ? "Premium" : "Free"}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] p-4">
                    <p className="text-sm text-[var(--muted-foreground)]">Qo'shilgan sana</p>
                    <p className="mt-2 font-semibold">{formatDate(user.created_at)}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] p-4">
                    <p className="text-sm text-[var(--muted-foreground)]">Akkount holati</p>
                    <p className="mt-2 font-semibold">{user.is_active ? "Faol" : "Nofaol"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>UI preferensiyalari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Sidebar holati</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Desktop navigatsiya default ko'rinishi.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant={!sidebarCollapsed ? "default" : "outline"} size="sm" onClick={() => setSidebarCollapsed(false)}>
                        Keng
                      </Button>
                      <Button variant={sidebarCollapsed ? "default" : "outline"} size="sm" onClick={() => setSidebarCollapsed(true)}>
                        Ixcham
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex items-center gap-3">
                    <PanelLeft className="h-5 w-5 text-[var(--primary)]" />
                    <div>
                      <p className="font-medium">Saqlanadigan sozlama</p>
                      <p className="text-sm text-[var(--muted-foreground)]">Bu qiymat lokal storage orqali keyingi sessiyalarda ham saqlanadi.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Bildirishnomalar</p>
                  <p className="mt-2 text-3xl font-bold">{notifications.unreadCount}</p>
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">O'qilmagan bildirishnomalar soni.</p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--primary)]" />
                  <div>
                    <p className="font-medium">Faol sessiya</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{authenticated ? "Sessiya faol va himoyalangan." : "Sessiya aniqlanmadi."}</p>
                  </div>
                </div>
                <Button className="w-full" variant="destructive" onClick={() => void logout()}>
                  Sessiyani yopish
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
