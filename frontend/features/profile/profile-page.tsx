"use client";

import Link from "next/link";
import { CalendarDays, Mail, ShieldCheck, Sparkles, Target } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { useProgressSnapshot } from "@/components/providers/progress-provider";
import { useNotifications } from "@/hooks/use-notifications";
import { useUser } from "@/hooks/use-user";
import { formatSimulationCountdown } from "@/lib/simulation-status";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";

function resolveSimulationState() {
  return {
    title: "LOCKED",
    body: "Readiness signal hali to'liq shakllanmagan.",
  };
}

function ProfilePageContent() {
  const { user, loading: userLoading, logout } = useUser();
  const progress = useProgressSnapshot();
  const notifications = useNotifications(5);

  if (userLoading || progress.dashboardLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-3xl bg-[var(--muted)]" />
        <div className="grid gap-4 md:grid-cols-4">
          <div className="h-32 animate-pulse rounded-3xl bg-[var(--muted)]" />
          <div className="h-32 animate-pulse rounded-3xl bg-[var(--muted)]" />
          <div className="h-32 animate-pulse rounded-3xl bg-[var(--muted)]" />
          <div className="h-32 animate-pulse rounded-3xl bg-[var(--muted)]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <ErrorState description="Profil ma'lumotini yuklab bo'lmadi. Sessiyani yangilab qayta urinib ko'ring." />;
  }

  if (progress.dashboardError || !progress.dashboard || !progress.summary) {
    return <ErrorState description="Profil ma'lumotini yuklab bo'lmadi." onRetry={() => void progress.reload()} />;
  }

  const simulationStatus = progress.dashboard.simulation_status;
  const simulation = simulationStatus?.launch_ready
    ? {
        title: "READY",
        body: "Simulyatsiyani hozir boshlash mumkin.",
      }
    : simulationStatus && !simulationStatus.cooldown_ready
      ? {
          title: "COOLDOWN",
          body: `${formatSimulationCountdown(simulationStatus.cooldown_remaining_seconds)} qoldi`,
        }
      : resolveSimulationState();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description="Akkount holati, readiness va so'nggi o'quv faoliyati."
        action={
          <Link href="/settings" className={buttonStyles()}>
            Sozlamalar
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="card-hover-lift">
          <CardContent className="p-6">
            <p className="text-sm text-[var(--muted-foreground)]">Joriy plan</p>
            <p className="mt-2 text-3xl font-bold">{user.plan === "premium" ? "Premium" : "Free"}</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {user.is_verified ? "Email tasdiqlangan" : "Email tasdiqlanmagan"}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover-lift">
          <CardContent className="p-6">
            <p className="text-sm text-[var(--muted-foreground)]">Tayyorlik</p>
            <p className="mt-2 text-3xl font-bold">{Math.round(progress.dashboard.overview.readiness_score)}%</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{progress.dashboard.overview.pass_prediction_label}</p>
          </CardContent>
        </Card>
        <Card className="card-hover-lift">
          <CardContent className="p-6">
            <p className="text-sm text-[var(--muted-foreground)]">Review queue</p>
            <p className="mt-2 text-3xl font-bold">{progress.dashboard.overview.total_due}</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Bugun qayta ko'rish kerak bo'lgan mavzular</p>
          </CardContent>
        </Card>
        <Card className="card-hover-lift">
          <CardContent className="p-6">
            <p className="text-sm text-[var(--muted-foreground)]">Trening darajasi</p>
            <p className="mt-2 text-3xl font-bold">{progress.dashboard.overview.current_training_level}</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Adaptive engine signali</p>
          </CardContent>
        </Card>
        <Card className="card-hover-lift">
          <CardContent className="p-6">
            <p className="text-sm text-[var(--muted-foreground)]">Simulyatsiya</p>
            <p className="mt-2 text-3xl font-bold">{simulation.title}</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{simulation.body}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="card-hover-lift">
            <CardContent className="p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <Avatar
                  src={null}
                  fallback={(user.full_name ?? user.email).slice(0, 2).toUpperCase()}
                  className="h-20 w-20 rounded-[1.5rem] text-lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold">{user.full_name ?? "Foydalanuvchi"}</h2>
                    {user.is_verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Pending</Badge>}
                    {user.is_premium ? <Badge>Premium</Badge> : null}
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <CalendarDays className="h-4 w-4" />
                    Qo'shilgan sana: {formatDate(user.created_at)}
                  </p>
                </div>
                <Button variant="outline" onClick={() => void logout()}>
                  Sessiyani yopish
                </Button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Instruktor profili</p>
                  <p className="mt-2 font-semibold">{user.has_instructor_profile ? "Mavjud" : "Yo'q"}</p>
                </div>
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Maktab profili</p>
                  <p className="mt-2 font-semibold">{user.has_school_profile ? "Mavjud" : "Yo'q"}</p>
                </div>
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Akkount holati</p>
                  <p className="mt-2 font-semibold">{user.is_active ? "Faol" : "Nofaol"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover-lift">
            <CardHeader>
              <CardTitle>So'nggi urinishlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {progress.summary.last_attempts.length === 0 ? (
                <EmptyState title="Urinishlar topilmadi" description="Birinchi amaliyotni boshlagach tarix shu yerda ko'rinadi." />
              ) : (
                progress.summary.last_attempts.map((attempt) => (
                  <div key={attempt.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{attempt.test_title}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{formatRelativeTime(attempt.finished_at)}</p>
                      </div>
                      <Badge variant={attempt.score >= 70 ? "success" : "warning"}>{attempt.score}%</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="card-hover-lift">
            <CardHeader>
              <CardTitle>Learning summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-[var(--muted)] p-4">
                <p className="text-sm text-[var(--muted-foreground)]">Keyingi challenge</p>
                <p className="mt-2 text-lg font-semibold">{progress.dashboard.recommendation.topic ?? "Umumiy mashq"}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {progress.dashboard.recommendation.action_label ?? "Tavsiya hozircha tayyor emas."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Eng yaxshi natija</p>
                  <p className="mt-2 text-2xl font-bold">{Math.round(progress.dashboard.overview.best_score)}%</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">O'rtacha natija</p>
                  <p className="mt-2 text-2xl font-bold">{Math.round(progress.dashboard.overview.average_score)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover-lift">
            <CardHeader>
              <CardTitle>So'nggi bildirishnomalar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.notifications.length === 0 ? (
                <EmptyState title="Bildirishnoma yo'q" description="Yangi hodisalar paydo bo'lsa shu yerda ko'rinadi." />
              ) : (
                notifications.notifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{notification.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{notification.message}</p>
                      </div>
                      {!notification.is_read ? <Badge>Yangi</Badge> : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="card-hover-lift">
            <CardHeader>
              <CardTitle>Account summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl bg-[var(--muted)] p-4">
                <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <p className="font-medium">Verifikatsiya holati</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {user.is_verified ? "Email tasdiqlangan" : "Tasdiqlash kutilmoqda"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-[var(--muted)] p-4">
                <Target className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <p className="font-medium">Simulation holati</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{simulation.body}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-[var(--muted)] p-4">
                <Sparkles className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <p className="font-medium">Bugungi tavsiya</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {progress.dashboard.recommendation.action_label ?? "Tavsiya hozircha tayyor emas"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  return (
    <AppShell>
      <ProfilePageContent />
    </AppShell>
  );
}
