"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PracticeSessionExperience } from "@/components/practice-session-experience";
import { useProgressSnapshot } from "@/components/providers/progress-provider";
import { useWeakTopicPreferences } from "@/hooks/use-weak-topic-preferences";
import { useUser } from "@/hooks/use-user";
import { resolveTopicMasteryState } from "@/lib/learning";
import { startIntelligentPracticeSession, type PracticeSessionPayload } from "@/lib/practice-session";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Car,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Play,
  RefreshCcw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";

function DashboardExButton({
  className,
  size = "default",
  asChild = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  size?: "default" | "sm" | "lg";
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const sizeClassName =
    size === "lg"
      ? "h-10 rounded-md px-6 [&_svg:not([class*='size-'])]:size-4"
      : size === "sm"
        ? "h-8 rounded-md gap-1.5 px-3"
        : "h-9 px-4 py-2";

  const baseClassName =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

  if (asChild) {
    return (
      <span className={cn(baseClassName, sizeClassName, className)}>
        {children}
      </span>
    );
  }

  return (
    <button className={cn(baseClassName, sizeClassName, className)} {...props}>
      {children}
    </button>
  );
}

function DashboardExProgress({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  return (
    <div className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}>
      <div
        className={cn("bg-emerald-500 h-full w-full flex-1 transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </div>
  );
}

function activityLabel(testTitle: string) {
  const normalizedTitle = testTitle.toLowerCase();
  if (normalizedTitle.includes("lesson") || normalizedTitle.includes("learning")) return "Dars o'rganildi";
  return "Mashq bajarildi";
}

function activityIcon(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("dars")) return FileText;
  if (normalized.includes("random") || normalized.includes("mashq")) return RefreshCcw;
  return FileText;
}

function readinessLabel(score: number) {
  if (score >= 70) return "Yuqori";
  if (score >= 45) return "O'rta";
  return "Past";
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveTopicIcon(topicName: string, index: number) {
  const normalized = topicName.toLowerCase();
  if (normalized.includes("chorraha")) return AlertTriangle;
  if (normalized.includes("qoida")) return FileText;
  if (normalized.includes("madaniyat")) return Car;
  if (normalized.includes("chiziq")) return MapPin;

  return [AlertTriangle, FileText, Car, MapPin][index] ?? Target;
}

function CircularProgress({ value }: { value: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative size-44">
      <svg className="size-full -rotate-90" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-white/10"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-[var(--foreground)]">{`${value}%`}</span>
        <span className="text-sm font-medium text-emerald-400">{readinessLabel(value)}</span>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { authenticated, loading: authLoading, error: authError, refreshUser } = useUser();
  const progress = useProgressSnapshot();
  const [startingSession, setStartingSession] = useState(false);
  const [activeSession, setActiveSession] = useState<PracticeSessionPayload | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [animateBars, setAnimateBars] = useState(false);

  const dashboardData = progress.dashboard;
  const weakTopics = useMemo(() => {
    if (!dashboardData) {
      return [];
    }

    return dashboardData.topic_breakdown
      .slice()
      .sort((left, right) => left.accuracy - right.accuracy)
      .map((topic) => ({
        topic: topic.topic,
        percentage: Math.max(6, Math.round(topic.accuracy)),
        state: resolveTopicMasteryState(topic.topic, dashboardData),
      }))
      .filter((topic) => topic.state !== "mastered")
      .slice(0, 4);
  }, [dashboardData]);
  const weakTopicAnimationKey = useMemo(
    () => weakTopics.map((topic) => `${topic.topic}:${topic.percentage}`).join("|"),
    [weakTopics],
  );
  const weakTopicPreferences = useWeakTopicPreferences(
    weakTopics.map((topic) => ({ topic: topic.topic, state: topic.state })),
  );
  const currentFocusTopic = dashboardData?.recommendation.topic ?? weakTopics[0]?.topic ?? null;
  const topicPreferences =
    weakTopicPreferences.selectedTopics.length > 0
      ? weakTopicPreferences.selectedTopics
      : currentFocusTopic
        ? [currentFocusTopic]
        : [];

  useEffect(() => {
    setAnimateBars(false);
    const frame = window.requestAnimationFrame(() => setAnimateBars(true));
    return () => window.cancelAnimationFrame(frame);
  }, [weakTopicAnimationKey]);

  const launchSession = async (sessionTopics: string[]) => {
    if (startingSession || !progress.dashboard) return;

    setActionError(null);
    setStartingSession(true);
    try {
      const response = await startIntelligentPracticeSession({
        topicPreferences: sessionTopics,
        questionCount: 20,
      });
      setActiveSession(response);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Mashqni boshlashda xatolik.");
    } finally {
      setStartingSession(false);
    }
  };

  const startRecommendedSession = async () => {
    await launchSession(topicPreferences);
  };

  const startFocusedTopicSession = async (topic: string) => {
    weakTopicPreferences.rememberTopic(topic);
    await launchSession([topic]);
  };

  if (activeSession) {
    return (
      <PracticeSessionExperience
        session={activeSession}
        onExit={() => setActiveSession(null)}
        onFinished={() => void progress.reload()}
      />
    );
  }

  if (authLoading || progress.dashboardLoading || progress.summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="h-80 animate-pulse rounded-2xl bg-[var(--muted)]/60" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <div className="h-52 animate-pulse rounded-2xl bg-[var(--muted)]/60" />
          <div className="h-52 animate-pulse rounded-2xl bg-[var(--muted)]/60" />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <ErrorState
        title={authError ? "Sessiya tekshirilmadi" : "Kirish talab qilinadi"}
        description={
          authError
            ? "Foydalanuvchi sessiyasini serverdan tekshirib bo'lmadi. Qayta urinib ko'ring yoki qayta kiring."
            : "Dashboardni ko'rish uchun hisobingizga qayta kiring."
        }
        error={authError ?? new Error("Unauthorized")}
        onRetry={authError ? () => void refreshUser() : undefined}
      />
    );
  }

  if (progress.dashboardError || progress.summaryError || !progress.dashboard || !progress.summary) {
    return (
      <ErrorState
        description="Asosiy sahifa ma'lumotlari yuklanmadi."
        error={progress.dashboardError ?? progress.summaryError}
        onRetry={() => void progress.reload()}
      />
    );
  }

  const { dashboard, summary } = progress;
  const recentActivity = summary.last_attempts.slice(0, 1);
  const focusTopic = currentFocusTopic ?? "Chorrahalar";
  const readinessScore = clampPercent(
    dashboard.simulation_status?.readiness_gate_score ?? dashboard.overview.readiness_score,
  );
  const nextActionQuestionCount = Math.max(5, Math.min(10, dashboard.recommendation.question_count || 8));
  const quickSessionMinutes = Math.max(8, Math.round(nextActionQuestionCount * 1.5));
  const successChance = clampPercent(
    dashboard.overview.pass_probability ?? dashboard.overview.readiness_score ?? 70,
  );
  const highlightedTopic = focusTopic;
  const highlightedTopicQuestionCount =
    dashboard.recommendation.kind === "repeated_mistake"
      ? 5
      : Math.max(5, Math.min(10, dashboard.recommendation.question_count || 8));
  const nextActionLabel =
    dashboard.recommendation.kind === "repeated_mistake"
      ? "Takrorlangan xatolar"
      : dashboard.recommendation.kind === "weak_topic"
        ? "Zaif mavzu"
        : "Review mashqi";
  const recentActivityItem = recentActivity[0] ?? null;
  const RecentActivityIcon = recentActivityItem ? activityIcon(activityLabel(recentActivityItem.test_title)) : FileText;

  return (
    <div className="space-y-6">
      {actionError ? <ErrorState description={actionError} /> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-emerald-950/20 p-6">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute -right-10 bottom-0 size-48 rounded-full bg-emerald-600/5 blur-2xl" />
            <svg className="absolute bottom-0 right-0 h-full w-1/2 opacity-20" viewBox="0 0 400 300" aria-hidden="true">
              <path
                d="M400 300 Q 350 250, 300 200 T 200 100 T 100 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="60"
                className="text-white/5"
              />
              <path
                d="M400 300 Q 350 250, 300 200 T 200 100 T 100 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="20 20"
                className="text-white/30"
              />
            </svg>
          </div>

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
              <Sparkles className="size-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {nextActionLabel}
              </span>
            </div>

            <div className="mb-2 flex items-start gap-3">
              <div className="mt-1 flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                <Target className="size-5 text-white" />
              </div>
            </div>

            <div className="mb-6 ml-11 flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4" />
              <span className="text-sm">{`${quickSessionMinutes} daqiqa`}</span>
              <span className="text-sm">•</span>
              <span className="text-sm">{`${successChance}% o'tish ehtimoli`}</span>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <DashboardExButton
                size="lg"
                onClick={() => void startRecommendedSession()}
                disabled={startingSession}
                className="border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700"
              >
                {startingSession ? "Yuklanmoqda..." : "Mashqni boshlash"}
              </DashboardExButton>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="size-4" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Savollar</p>
                <p className="text-2xl font-bold text-foreground">{nextActionQuestionCount}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Qayta ko&apos;rish</p>
                <p className="text-2xl font-bold text-foreground">{dashboard.overview.total_due}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Fokus</p>
                <p className="text-lg font-bold text-foreground">{highlightedTopic}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dashboard.recommendation.kind === "repeated_mistake" ? "Takrorlangan xatolar ustuvor" : "Zaif mavzu ustuvor"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/8 p-4">
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="h-full rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/20">
                <Bot className="size-4 text-emerald-400" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fokus tavsiyasi
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Tavsiya:</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {dashboard.recommendation.kind === "repeated_mistake"
                      ? `Takrorlangan xato: ${highlightedTopic}`
                      : `Zaif mavzu: ${highlightedTopic}`}
                  </p>
                  <ArrowRight className="size-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">{`${highlightedTopicQuestionCount} savol`}</span>
                  <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Xatolar va qayta ko&apos;rish navbatiga tushgan savollar shu mavzudan boshlanadi.
                </p>
              </div>

              <DashboardExButton
                onClick={() => void startFocusedTopicSession(highlightedTopic)}
                disabled={startingSession}
                className="w-full bg-emerald-500 font-medium text-white hover:bg-emerald-600"
              >
                {startingSession ? "Yuklanmoqda..." : "Mashq qilish"}
              </DashboardExButton>
            </div>
          </div>

          <div className="h-full rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground">Real imtihon:</span>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <Play className="size-5 text-emerald-400" />
              <span className="text-lg font-semibold text-foreground">Simulyatsiyani boshlash</span>
            </div>

            <Link href="/simulation" className="block">
              <DashboardExButton className="w-full border border-emerald-500/30 bg-transparent font-medium text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10">
                <ArrowRight className="mr-2 size-4" />
                Simulyatsiyani boshlash
              </DashboardExButton>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-6">
            <h3 className="mb-1 text-lg font-semibold text-foreground">Zaif mavzular</h3>
            <p className="text-sm text-muted-foreground">{weakTopics.length > 0 ? "Hozir eng ko'p e'tibor talab qiladigan mavzular." : "Zaif mavzular ro'yxati vaqtincha bo'sh."}</p>
          </div>

          {weakTopics.length === 0 ? (
            <EmptyState
              title={"Zaif mavzu yo'q"}
              description={"Mavzular yaxshilangach bu ro'yxat qisqaradi."}
            />
          ) : (
            <div className="space-y-3">
              {weakTopics.map((topic, index) => {
                const isHighlighted = index === 0;
                const Icon = resolveTopicIcon(topic.topic, index);

                return (
                  <div
                    key={topic.topic}
                    className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/[0.07]"
                  >
                    <div className={`flex size-10 items-center justify-center rounded-lg ${isHighlighted ? "bg-orange-500/20" : "bg-white/10"}`}>
                      <Icon className={`size-5 ${isHighlighted ? "text-orange-400" : "text-muted-foreground"}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{topic.topic}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <DashboardExProgress
                          value={animateBars ? topic.percentage : 0}
                          className="flex-1 bg-white/10"
                        />
                      </div>
                    </div>

                    <span className="w-12 text-right text-sm font-semibold text-muted-foreground">{`${topic.percentage}%`}</span>

                    <DashboardExButton
                      size="sm"
                      onClick={() => void startFocusedTopicSession(topic.topic)}
                      disabled={startingSession}
                      className={
                        isHighlighted
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "border border-white/20 bg-transparent text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      }
                    >
                      <ArrowRight className="mr-1.5 size-4" />
                      {isHighlighted ? "Review mashq" : "Mashq qilish"}
                    </DashboardExButton>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 to-card p-6">
          <h3 className="mb-2 text-lg font-semibold text-foreground">Simulyatsiya tayyorligi</h3>
          <p className="mb-6 text-sm text-muted-foreground">Imtihonga qanchalik yaqin ekaningizni ko&apos;rsatadi.</p>

          {dashboard.simulation_status?.warning_message ? (
            <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {dashboard.simulation_status.warning_message}
            </div>
          ) : null}

          <div className="mb-6 flex items-center justify-between">
            <DashboardExButton
              onClick={() => void startRecommendedSession()}
              disabled={startingSession}
              className="border border-emerald-500/30 bg-transparent text-foreground hover:bg-emerald-500/10"
            >
              <ArrowRight className="mr-2 size-4" />
              Mashq qilish
            </DashboardExButton>
            <CircularProgress value={readinessScore} />
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="mb-3 text-sm font-semibold text-foreground">So&apos;nggi faoliyat</h4>
            {recentActivityItem ? (
              <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-white/10">
                  <RecentActivityIcon className="size-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{activityLabel(recentActivityItem.test_title)}</p>
                  <p className="text-xs text-muted-foreground">{recentActivityItem.test_title}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(recentActivityItem.finished_at)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-white/10">
                  <FileText className="size-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Faollik yo&apos;q</p>
                  <p className="text-xs text-muted-foreground">Birinchi mashqdan keyin shu yerda ko&apos;rinadi.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
