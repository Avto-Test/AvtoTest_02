"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  CalendarRange,
  Layers3,
  Radar,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { IntelligenceProgressChart } from "@/components/intelligence/IntelligenceCharts";
import { useI18n } from "@/components/i18n-provider";
import {
  InsightCard,
  PageContainer,
  PrimaryButton,
  ProductCard,
  ProductEmptyState,
  ProductMotivationPill,
  ProductProgressBar,
  ProductSkeletonCard,
  SectionHeader,
  SecondaryButton,
  StatCard,
} from "@/components/ui/product-primitives";
import { getUserIntelligenceBundle, type UserIntelligenceBundle } from "@/lib/intelligence";
import {
  buildSeededSimulationHistory,
  buildWeakTopicInsight,
  mergeSimulationHistory,
  readSimulationHistory,
  type SimulationHistoryEntry,
} from "@/lib/simulationHistory";
import { useAuth } from "@/store/useAuth";

function isToday(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  );
}

function isWithinLastDays(value: string | null, days: number): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const diffMs = Date.now() - date.getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

function computePracticeStreak(lastAttempts: UserIntelligenceBundle["summary"]["last_attempts"]): number {
  const dates = [...new Set(
    lastAttempts
      .map((attempt) => attempt.finished_at)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).toISOString().slice(0, 10)),
  )].sort((left, right) => right.localeCompare(left));

  if (dates.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDate = new Date(dates[0]);
  firstDate.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor((today.getTime() - firstDate.getTime()) / 86_400_000);

  if (dayDiff > 1) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(dates[index - 1]);
    const current = new Date(dates[index]);
    previous.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    const diff = Math.floor((previous.getTime() - current.getTime()) / 86_400_000);
    if (diff !== 1) {
      break;
    }
    streak += 1;
  }

  return streak;
}

function DashboardSkeleton() {
  return (
    <PageContainer className="product-page-stack">
      <div className="product-skeleton h-24" />
      <div className="grid gap-6 xl:grid-cols-12">
        <ProductSkeletonCard className="xl:col-span-5 min-h-[280px]" lines={4} />
        <ProductSkeletonCard className="xl:col-span-4 min-h-[280px]" lines={4} />
        <ProductSkeletonCard className="xl:col-span-3 min-h-[280px]" lines={4} />
        <ProductSkeletonCard className="xl:col-span-4 min-h-[240px]" lines={4} />
        <ProductSkeletonCard className="xl:col-span-8 min-h-[240px]" lines={4} />
        <ProductSkeletonCard className="xl:col-span-7 min-h-[320px]" lines={4} />
        <ProductSkeletonCard className="xl:col-span-5 min-h-[320px]" lines={4} />
      </div>
    </PageContainer>
  );
}

export default function StudentDashboardSurface() {
  const { t } = useI18n();
  const { user, token, hydrated, fetchUser } = useAuth();
  const [bundle, setBundle] = useState<UserIntelligenceBundle | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!user && token) {
      void fetchUser();
    }
  }, [fetchUser, hydrated, token, user]);

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getUserIntelligenceBundle();
        if (!active) {
          return;
        }

        setBundle(response);
        setSimulationHistory(
          mergeSimulationHistory(
            readSimulationHistory(),
            buildSeededSimulationHistory(response.summary.last_attempts),
          ),
        );
      } catch {
        if (active) {
          setBundle(null);
          setError(t("student.dashboard.load_error", "Ma'lumot topilmadi."));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [hydrated, t, token]);

  const displayName = useMemo(() => {
    return user?.full_name || user?.email?.split("@")[0] || "O'quvchi";
  }, [user?.email, user?.full_name]);

  const dashboardData = useMemo(() => {
    if (!bundle) {
      return null;
    }

    const weakTopics = bundle.readiness.weak_topics.slice(0, 4);
    const nextTopic = bundle.coach.focus_topics[0] ?? weakTopics[0] ?? null;
    const nextAction = nextTopic
      ? `${nextTopic} bo'yicha mashq`
      : t("student.dashboard.next_action_fallback", "Imtihon simulyatsiyasiga tayyorlaning");
    const todayAttempts = bundle.summary.last_attempts.filter((attempt) => isToday(attempt.finished_at)).length;
    const dailyQuestionGoal = Math.max(10, bundle.coach.recommended_questions_today);
    const dailySessionGoal = Math.max(1, Math.ceil(dailyQuestionGoal / 10));
    const todayProgressPercent = Math.min(100, (todayAttempts / dailySessionGoal) * 100);
    const xpToNextLevel = bundle.xp.xp_to_next_level;
    const streak = computePracticeStreak(bundle.summary.last_attempts);
    const xpToday = todayAttempts * 10;
    const levelBaseXp = Math.max(0, 100 * ((bundle.xp.level - 1) ** 2));
    const nextLevelXp = 100 * (bundle.xp.level ** 2);
    const xpLevelSpan = Math.max(1, nextLevelXp - levelBaseXp);
    const xpLevelProgress = Math.max(
      0,
      Math.min(100, ((bundle.xp.xp_total - levelBaseXp) / xpLevelSpan) * 100),
    );
    const readinessTone =
      bundle.prediction.exam_pass_probability >= 80
        ? "Imtihonga yaqin holatdasiz"
        : bundle.prediction.exam_pass_probability >= 60
          ? "Yana bir necha mashq kerak"
          : "Asosiy mavzularni mustahkamlash kerak";
    const recentSimulationTrend = simulationHistory
      .slice()
      .sort((left, right) => new Date(left.completed_at).getTime() - new Date(right.completed_at).getTime())
      .slice(-4)
      .map((entry) => ({
        label: new Date(entry.completed_at).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" }),
        value: entry.pass_probability,
      }));
    const recentSimulationSummary = recentSimulationTrend.map((entry) => `${entry.value.toFixed(0)}%`).join(" -> ");
    const weakTopicInsight = buildWeakTopicInsight(simulationHistory);
    const simulationTrendDelta = recentSimulationTrend.length >= 2
      ? recentSimulationTrend[recentSimulationTrend.length - 1].value - recentSimulationTrend[0].value
      : 0;
    const weeklyTestsCompleted = bundle.analytics.testActivity
      .slice(-7)
      .reduce((total, point) => total + point.tests_count, 0);
    const weeklySimulations = simulationHistory.filter((entry) => isWithinLastDays(entry.completed_at, 7)).length;
    const weeklyXpGained = (weeklyTestsCompleted * 10) + (weeklySimulations * 10);
    const learningPath = bundle.analytics.categoryMetrics
      .slice()
      .sort((left, right) => {
        const leftProgress = ((left.accuracy ?? 0) * 0.7) + (((left.coverage ?? 0) * 100) * 0.3);
        const rightProgress = ((right.accuracy ?? 0) * 0.7) + (((right.coverage ?? 0) * 100) * 0.3);
        return rightProgress - leftProgress;
      })
      .slice(0, 4)
      .map((item) => ({
        topic: item.category,
        progress: Math.max(
          0,
          Math.min(
            100,
            Number((((item.accuracy ?? 0) * 0.7) + (((item.coverage ?? 0) * 100) * 0.3)).toFixed(1)),
          ),
        ),
        accuracy: item.accuracy ?? 0,
      }));

    const readinessSignal =
      bundle.prediction.exam_pass_probability >= 85 && bundle.summary.total_attempts >= 5
        ? {
            title: "Kuchli tayyorgarlik",
            description: "Oxirgi urinishlar va umumiy ehtimol imtihonga yaqin holatni ko'rsatmoqda.",
          }
        : bundle.prediction.exam_pass_probability >= 70 || simulationTrendDelta >= 8
          ? {
              title: "Imtihonga deyarli tayyor",
              description: "Signal ijobiy. Zaif mavzularni yopib, yana bir simulyatsiya bilan natijani mustahkamlang.",
            }
          : {
              title: "Yana mashq kerak",
              description: "Hozircha tayyorgarlik to'liq emas. Fokusli mashq va review sizga ko'proq foyda beradi.",
            };

    return {
      dailyQuestionGoal,
      dailySessionGoal,
      learningPath,
      nextAction,
      nextTopic,
      readinessSignal,
      readinessTone,
      recentSimulationSummary,
      recentSimulationTrend,
      simulationTrendDelta,
      streak,
      todayAttempts,
      todayProgressPercent,
      weakTopicInsight,
      weakTopics,
      weeklySimulations,
      weeklyTestsCompleted,
      weeklyXpGained,
      xpLevelProgress,
      xpToNextLevel,
      xpToday,
    };
  }, [bundle, simulationHistory, t]);

  if (!hydrated || loading) {
    return <DashboardSkeleton />;
  }

  if (error || !bundle || !dashboardData) {
    return (
      <PageContainer className="product-page-stack">
        <ProductCard className="product-card-shell">
          <SectionHeader
            eyebrow={t("nav.dashboard", "Dashboard")}
            title={t("student.dashboard.error_title", "Ma'lumot topilmadi")}
            description={error ?? t("student.dashboard.error_description", "Qayta urinib ko'ring.")}
          />
          <ProductEmptyState
            title="Ma'lumot topilmadi"
            description="Dashboard ma'lumotlari vaqtincha yuklanmadi. Sahifani yangilang yoki mashq sahifasidan davom eting."
            action={(
              <>
                <PrimaryButton onClick={() => window.location.reload()}>
                  {t("common.retry", "Qayta urinib ko'ring")}
                </PrimaryButton>
                <SecondaryButton asChild>
                  <Link href="/practice">{t("nav.practice", "Mashq")}</Link>
                </SecondaryButton>
              </>
            )}
          />
        </ProductCard>
      </PageContainer>
    );
  }

  const {
    dailyQuestionGoal,
    dailySessionGoal,
    learningPath,
    nextAction,
    nextTopic,
    readinessSignal,
    readinessTone,
    recentSimulationSummary,
    recentSimulationTrend,
    simulationTrendDelta,
    streak,
    todayAttempts,
    todayProgressPercent,
    weakTopicInsight,
    weakTopics,
    weeklySimulations,
    weeklyTestsCompleted,
    weeklyXpGained,
    xpLevelProgress,
    xpToNextLevel,
    xpToday,
  } = dashboardData;

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <SectionHeader
          eyebrow={t("student.dashboard.eyebrow", "Imtihonga tayyorgarlik")}
          title={`${displayName}, bugungi holat shu yerda.`}
          description={t("student.dashboard.hero_description", "Bu sahifa uch savolga javob beradi: imtihonga qanchalik tayyormansiz, qaysi mavzular zaif va keyin nima qilish kerak.")}
          action={(
            <>
              <PrimaryButton asChild>
                <Link href="/practice">{t("nav.practice", "Mashq")}</Link>
              </PrimaryButton>
              <SecondaryButton asChild>
                <Link href="/simulation">{t("nav.simulation", "Simulyatsiya")}</Link>
              </SecondaryButton>
            </>
          )}
        />
        <div className="mt-5 flex flex-wrap gap-2">
          <ProductMotivationPill tone={streak > 0 ? "success" : "neutral"}>
            <span>3 kunlik seriya</span>
            {streak > 0 ? `${streak} kun ketma-ket mashq` : "Seriya hali boshlanmadi"}
          </ProductMotivationPill>
          <ProductMotivationPill tone={xpToday > 0 ? "success" : "warning"}>
            <span>Bugungi XP</span>
            {xpToday > 0 ? `+${xpToday} XP` : "XP hali ochilmadi"}
          </ProductMotivationPill>
        </div>
      </ProductCard>

      <div className="product-page-grid">
        <StatCard
          className="xl:col-span-5"
          label={t("student.dashboard.pass_probability", "Imtihondan o'tish ehtimoli")}
          title={readinessSignal.title}
          value={`${bundle.prediction.exam_pass_probability.toFixed(1)}%`}
          description={readinessSignal.description}
          icon={Radar}
          footer={(
            <div className="space-y-3">
              <ProductProgressBar value={bundle.prediction.exam_pass_probability} />
              <div className="flex flex-wrap gap-2">
                <ProductMotivationPill tone="neutral">
                  {t("student.dashboard.confidence_note", "Ishonch darajasi")}:{" "}
                  <span className="font-medium capitalize">{bundle.prediction.confidence}</span>
                </ProductMotivationPill>
                <ProductMotivationPill tone={bundle.prediction.exam_pass_probability >= 75 ? "success" : "warning"}>
                  {readinessTone}
                </ProductMotivationPill>
              </div>
            </div>
          )}
        />

        <InsightCard
          className="xl:col-span-4"
          eyebrow={t("student.dashboard.next_recommendation", "Keyingi tavsiya")}
          title={nextAction}
          description={bundle.coach.message}
          action={(
            <div className="product-icon-shell border-blue-100 bg-blue-50 text-blue-600">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
        >
          <div className="space-y-4">
            <div className="product-subtle-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="product-meta-text">Bugungi mashq</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{dailyQuestionGoal} ta savol tavsiya qilingan</p>
              </div>
              <ProductMotivationPill tone={nextTopic ? "warning" : "neutral"}>
                {nextTopic ? `${nextTopic} ustida ishlang` : "Simulyatsiyaga o'tish mumkin"}
              </ProductMotivationPill>
            </div>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton asChild>
                <Link href={nextTopic ? `/tests?topic=${encodeURIComponent(nextTopic)}` : "/practice"}>
                  Hozir boshlash
                </Link>
              </PrimaryButton>
              <SecondaryButton asChild>
                <Link href="/analytics">Analitikani ochish</Link>
              </SecondaryButton>
            </div>
          </div>
        </InsightCard>

        <InsightCard
          className="xl:col-span-3"
          eyebrow={t("student.dashboard.weak_topics", "Zaif mavzular")}
          title={t("student.dashboard.weak_topics_title", "Ko'proq ishlash kerak bo'lgan mavzular")}
          action={(
            <div className="product-icon-shell border-rose-100 bg-rose-50 text-rose-500">
              <Target className="h-5 w-5" />
            </div>
          )}
        >
          <div className="space-y-3">
            {weakTopics.length > 0 ? weakTopics.map((topic) => (
              <div key={topic} className="product-subtle-card-plain flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-slate-800">{topic}</span>
                <span className="text-xs text-slate-500">Zaif mavzu</span>
              </div>
            )) : (
              <ProductEmptyState
                title="Zaif mavzu hali aniqlanmadi"
                description="Bir nechta test yakunlang. Shundan keyin qaysi mavzularda ko'proq adashayotganingiz shu yerda ko'rinadi."
              />
            )}
          </div>
        </InsightCard>

        <StatCard
          className="xl:col-span-4"
          label={t("student.dashboard.today_practice", "Bugungi progress")}
          title={t("student.dashboard.today_progress_title", "Kunlik mashq reja")}
          value={`${todayAttempts}/${dailySessionGoal}`}
          description={`${dailyQuestionGoal} ta savol tavsiya qilingan`}
          icon={BrainCircuit}
          footer={(
            <div className="space-y-3">
              <ProductProgressBar value={todayProgressPercent} />
              <p className="text-sm text-slate-500">
                {todayAttempts > 0
                  ? "Bugungi mashq boshlandi. Shu tempni ushlab turing."
                  : "Bugungi mashq hali boshlanmagan."}
              </p>
              <ProductMotivationPill tone={todayProgressPercent >= 70 ? "success" : "neutral"}>
                {`${dailyQuestionGoal} savoldan ${Math.round((todayProgressPercent / 100) * dailyQuestionGoal)} tasi bajarildi`}
              </ProductMotivationPill>
            </div>
          )}
        />

        <ProductCard className="xl:col-span-8">
          <div className="grid gap-[var(--space-stack)] p-[var(--space-card)] lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div>
                <p className="product-meta-text">XP o&apos;sishi</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                  {bundle.xp.level}-daraja - {bundle.xp.xp_total} XP
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Keyingi darajaga chiqish uchun yana {xpToNextLevel} XP kerak.
                </p>
              </div>
              <div className="product-subtle-card p-[var(--space-stack)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="product-meta-text">Bugungi XP</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">+{xpToday} XP</p>
                  </div>
                  <ProductMotivationPill tone={xpToday > 0 ? "success" : "warning"}>
                    <Zap className="h-4 w-4" />
                    {xpToday > 0 ? "Bugun ham oldinga yuribsiz" : "Bugungi progress hali ochilmadi"}
                  </ProductMotivationPill>
                </div>
                <div className="mt-4">
                  <ProductProgressBar value={xpLevelProgress} />
                </div>
              </div>
            </div>
            <div className="product-subtle-card p-[var(--space-stack)]">
              <p className="product-meta-text">Haftalik xulosa</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="product-subtle-card-plain bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">XP</span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">+{weeklyXpGained}</p>
                </div>
                <div className="product-subtle-card-plain bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CalendarRange className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">Testlar</span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{weeklyTestsCompleted}</p>
                </div>
                <div className="product-subtle-card-plain bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Radar className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">Simulyatsiya</span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{weeklySimulations}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Bu hafta siz {weeklyTestsCompleted} ta test va {weeklySimulations} ta simulyatsiya orqali progressni ushlab turdingiz.
              </p>
            </div>
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-7">
          <div className="product-card-shell">
            <div className="product-card-stack">
              <p className="product-meta-text">Simulyatsiya trendi</p>
              <h3 className="product-card-title text-slate-950">Oxirgi natijalar qanday o&apos;zgaryapti?</h3>
              <p className="product-body-text">
                So&apos;nggi simulyatsiyalar bo&apos;yicha o&apos;sish yo&apos;nalishi shu yerda ko&apos;rinadi.
              </p>
            </div>
            <div className="product-subtle-card-plain mt-4 px-4 py-3">
              <p className="product-meta-text">Qisqa trend</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {recentSimulationSummary || "Trend hali shakllanmagan"}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {recentSimulationTrend.length > 1
                  ? `Oxirgi o'sish: ${simulationTrendDelta > 0 ? "+" : ""}${simulationTrendDelta.toFixed(1)}%`
                  : "Birinchi simulyatsiyadan keyin natija o'zgarishi shu yerda ketma-ket ko'rinadi."}
              </p>
            </div>
            <div className="product-subtle-card mt-4 p-[var(--space-stack)]">
              {recentSimulationTrend.length > 0 ? (
                <IntelligenceProgressChart data={recentSimulationTrend} color="#2563EB" theme="light" />
              ) : (
                <ProductEmptyState
                  title="Simulyatsiya trendi hali yo'q"
                  description="Kamida bitta simulyatsiyani yakunlang. Shundan keyin natijalar o'sishi shu yerda chiziq sifatida ko'rinadi."
                />
              )}
            </div>
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-5">
          <div className="product-card-shell space-y-4">
            <div>
              <p className="product-meta-text">Asosiy insightlar</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">{readinessSignal.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{readinessSignal.description}</p>
            </div>
            <div className="product-subtle-card-plain px-4 py-3">
              <p className="product-meta-text">Zaif mavzu insighti</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {weakTopicInsight.topic ?? "Barqaror natija"}
              </p>
              <p className="mt-2 text-sm text-slate-500">{weakTopicInsight.message}</p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-dashed border-slate-200 bg-slate-50/80 px-[var(--space-card)] py-[var(--space-stack)] text-sm leading-6 text-slate-500">
              Eng muhim qadam: avval tavsiya qilingan mashqni bajaring, keyin bitta simulyatsiya bilan natijani tekshiring.
            </div>
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-12">
          <div className="grid gap-[var(--space-stack)] p-[var(--space-card)] lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div>
              <p className="product-meta-text">O&apos;qish yo&apos;li</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">Mavzular bo&apos;yicha o&apos;sish yo&apos;li</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Har bir blok mavzudagi aniqlik va qamrovni birga ko&apos;rsatadi. Zaif bo&apos;limlar keyingi mashq uchun signal beradi.
              </p>
            </div>
            <div className="grid gap-3">
              {learningPath.length > 0 ? learningPath.map((item) => (
                <div key={item.topic} className="product-subtle-card p-[var(--space-stack)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="product-icon-shell h-10 w-10 bg-white text-slate-600">
                        <Layers3 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-950">{item.topic}</p>
                        <p className="text-sm text-slate-500">{item.accuracy.toFixed(1)}% aniqlik</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{item.progress.toFixed(0)}%</span>
                  </div>
                  <div className="mt-4">
                    <ProductProgressBar value={item.progress} />
                  </div>
                </div>
              )) : (
                <ProductEmptyState
                  title="O'qish yo'li hali ko'rinmayapti"
                  description="3-4 ta test yakunlang. Shundan keyin mavzular bo'yicha progress bloklari shu yerda paydo bo'ladi."
                />
              )}
            </div>
          </div>
        </ProductCard>
      </div>
    </PageContainer>
  );
}
