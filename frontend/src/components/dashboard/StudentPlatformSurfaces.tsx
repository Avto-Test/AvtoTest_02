"use client";

export { default as StudentDashboardSurface } from "@/components/dashboard/StudentDashboardSurface";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  FileBadge2,
  Gem,
  History,
  Lock,
  ListChecks,
  Radar,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import {
  IntelligenceTrendChart,
  IntelligenceProgressChart,
  IntelligenceTopicBarChart,
} from "@/components/intelligence/IntelligenceCharts";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import {
  ActionCard,
  Avatar,
  ChartCard,
  PageContainer,
  PrimaryButton,
  ProductCard,
  ProductEmptyState,
  ProductErrorState,
  ProductMotivationPill,
  ProductProgressBar,
  ProductSkeletonCard,
  SectionHeader,
  SecondaryButton,
  StatCard,
  TierBadge,
} from "@/components/ui/product-primitives";
import {
  buildWeeklyActivity,
  computePracticeStreak,
  getXpTierProgress,
} from "@/lib/gamification";
import { getAvailableCheckoutPlans } from "@/lib/payments";
import {
  downloadReadinessCertificate,
  getUserIntelligenceBundle,
  getUserProfileBundle,
  type UserIntelligenceBundle,
} from "@/lib/intelligence";
import {
  buildSeededSimulationHistory,
  buildWeakTopicInsight,
  mergeSimulationHistory,
  readSimulationHistory,
  type SimulationHistoryEntry,
} from "@/lib/simulationHistory";
import { cn } from "@/lib/utils";
import type { CheckoutPlan } from "@/schemas/payment.schema";
import { useAuth } from "@/store/useAuth";
import { DailyGoalCard } from "@/components/dashboard/DailyGoalCard";

function useEnsureUserHydrated() {
  const { user, token, hydrated, fetchUser } = useAuth();

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!user && token) {
      void fetchUser();
    }
  }, [fetchUser, hydrated, token, user]);

  return { user, token, hydrated };
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Jarayonda";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Noma'lum";
  }

  return date.toLocaleDateString("uz-UZ");
}

function toPercent(value: number | undefined | null): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.min(100, n));
}

function buildLearningPathTopics(bundle: UserIntelligenceBundle) {
  const focusSet = new Set([
    ...bundle.coach.focus_topics,
    ...bundle.readiness.weak_topics,
  ]);

  return bundle.analytics.categoryMetrics
    .slice()
    .sort((left, right) => {
      const leftMastery = ((left.accuracy ?? 0) * 0.7) + (((left.coverage ?? 0) * 100) * 0.3);
      const rightMastery = ((right.accuracy ?? 0) * 0.7) + (((right.coverage ?? 0) * 100) * 0.3);
      return leftMastery - rightMastery;
    })
    .slice(0, 8)
    .map((item, index) => {
      const mastery = Number((((item.accuracy ?? 0) * 0.7) + (((item.coverage ?? 0) * 100) * 0.3)).toFixed(1));
      const hasSeenTopic = (item.attempts ?? 0) > 0 || (item.coverage ?? 0) > 0;
      const unlocked = index < 2 || hasSeenTopic;

      return {
        topic: item.category,
        mastery: Math.max(0, Math.min(100, mastery)),
        accuracy: toPercent(item.accuracy),
        coverage: toPercent((item.coverage ?? 0) * 100),
        unlocked,
        recommended: focusSet.has(item.category),
      };
    });
}

function StudentSkeleton({
  cards = 3,
}: {
  cards?: number;
}) {
  return (
    <PageContainer className="product-page-stack">
      <div className="product-skeleton h-24" />
      <div className={`grid gap-6 ${cards === 3 ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        {Array.from({ length: cards }).map((_, index) => (
          <ProductSkeletonCard key={index} className="min-h-[250px]" lines={4} />
        ))}
      </div>
    </PageContainer>
  );
}

export function PracticeHub() {
  const { t } = useI18n();
  const { hydrated } = useEnsureUserHydrated();

  if (!hydrated) {
    return <StudentSkeleton cards={3} />;
  }

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <SectionHeader
          eyebrow={t("student.practice.eyebrow", "Mashq")}
          title={t("student.practice.title", "Bugun qaysi rejimda mashq qilasiz?")}
          description={t("student.practice.description", "O'qishni murakkablashtirmadik. Bir rejim tanlang va darhol boshlang.")}
        />
      </ProductCard>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          href="/tests"
          icon={Target}
          eyebrow="1-rejim"
          title={t("student.practice.card_tests_title", "Mashq testlari")}
          description={t("student.practice.card_tests_description", "Aralash savollar bilan umumiy tayyorgarlikni mustahkamlang.")}
          meta={(
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <Badge className="border-slate-200 bg-slate-100 text-slate-600">{"Qiyinlik: O'rta"}</Badge>
                <Badge className="border-slate-200 bg-slate-100 text-slate-600">20 ta savol</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">+10 XP</Badge>
                <Badge className="border-blue-200 bg-blue-50 text-blue-700">Real exam savollari</Badge>
              </div>
            </div>
          )}
          cta={t("student.practice.open_tests", "Boshlash")}
        />
        <ActionCard
          href="/learning/session"
          icon={BookOpen}
          eyebrow="2-rejim"
          title={t("student.practice.card_learning_title", "O'rganish sessiyasi")}
          description={t("student.practice.card_learning_description", "Tavsiya qilingan mavzular bo'yicha fokuslangan mashq qiling.")}
          meta={(
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <Badge className="border-slate-200 bg-slate-100 text-slate-600">Qiyinlik: Moslashuvchan</Badge>
                <Badge className="border-slate-200 bg-slate-100 text-slate-600">10-15 ta savol</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">+8 XP</Badge>
                <Badge className="border-blue-200 bg-blue-50 text-blue-700">Mavzuga fokus</Badge>
              </div>
            </div>
          )}
          cta={t("student.practice.open_learning", "Sessiyani ochish")}
        />
        <ActionCard
          href="/review-queue"
          icon={ListChecks}
          eyebrow="3-rejim"
          title={t("student.practice.card_review_title", "Qayta ko'rish navbati")}
          description={t("student.practice.card_review_description", "Oldingi xatolarni qayta ko'rib, zaif mavzularni yopib boring.")}
          meta={(
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <Badge className="border-slate-200 bg-slate-100 text-slate-600">Qiyinlik: Shaxsiy</Badge>
                <Badge className="border-slate-200 bg-slate-100 text-slate-600">{"Noto'g'ri savollar"}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">+5 XP</Badge>
                <Badge className="border-blue-200 bg-blue-50 text-blue-700">Xatolarni yopish</Badge>
              </div>
            </div>
          )}
          cta={t("student.practice.open_review", "Navbatni ochish")}
        />
      </div>
    </PageContainer>
  );
}

export function AnalyticsHub() {
  const { t } = useI18n();
  const { hydrated, token } = useEnsureUserHydrated();
  const [bundle, setBundle] = useState<UserIntelligenceBundle | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (active) {
          setBundle(response);
          setSimulationHistory(
            mergeSimulationHistory(
              readSimulationHistory(),
              buildSeededSimulationHistory(response.summary.last_attempts),
            ),
          );
        }
      } catch {
        if (active) {
          setBundle(null);
          setError(t("student.analytics.load_error", "Ma'lumot topilmadi."));
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

  const analyticsData = useMemo(() => {
    if (!bundle) {
      return null;
    }

    const toPercent = (value: number | undefined | null) => {
      const n = Number(value ?? 0);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.min(100, n));
    };

    const accuracyTrend = bundle.analytics.scoreTrend.map((point) => ({
      label: `#${point.testIndex}`,
      value: toPercent(point.score),
    }));

    const topicPerformance = bundle.analytics.categoryMetrics
      .slice()
      .sort((left, right) => (left.accuracy ?? 0) - (right.accuracy ?? 0))
      .slice(0, 6)
      .map((item) => ({
        topic: item.category,
        value: toPercent(item.accuracy),
      }));
    const testHistory = bundle.summary.last_attempts.slice(0, 5);
    const simulationTrend = simulationHistory
      .slice()
      .sort((left, right) => new Date(left.completed_at).getTime() - new Date(right.completed_at).getTime())
      .slice(-5)
      .map((entry) => ({
        label: new Date(entry.completed_at).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" }),
        value: toPercent(entry.pass_probability),
      }));
    const weakTopicInsight = buildWeakTopicInsight(simulationHistory);
    const readinessInsight =
      bundle.prediction.exam_pass_probability >= 85
        ? "Kuchli tayyorgarlik"
        : bundle.prediction.exam_pass_probability >= 70
          ? "Imtihonga deyarli tayyor"
          : "Ko'proq mashq kerak";

    return {
      accuracyTrend,
      readinessInsight,
      simulationTrend,
      testHistory,
      topicPerformance,
      weakTopicInsight,
    };
  }, [bundle, simulationHistory]);

  if (!hydrated || loading) {
    return <StudentSkeleton cards={4} />;
  }

  if (error || !bundle || !analyticsData) {
    return (
      <PageContainer>
        <ProductCard className="product-card-shell">
          <SectionHeader
            eyebrow={t("nav.analytics", "Analitika")}
            title={t("student.analytics.unavailable_title", "Ma'lumot topilmadi")}
            description={error ?? t("student.analytics.unavailable_description", "Qayta urinib ko'ring.")}
          />
          <ProductEmptyState
            title="Analitika hali tayyor emas"
            description="Analitika testlar yakunlangandan keyin ko'rinadi. Avval mashq yoki simulyatsiyani tugating."
            action={<PrimaryButton onClick={() => window.location.reload()}>{t("common.retry", "Qayta urinib ko'ring")}</PrimaryButton>}
          />
        </ProductCard>
      </PageContainer>
    );
  }

  const {
    accuracyTrend,
    readinessInsight,
    simulationTrend,
    testHistory,
    topicPerformance,
    weakTopicInsight,
  } = analyticsData;

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <SectionHeader
          eyebrow="Performance Analytics"
          title="Performance Analytics"
          description="Track your learning progress and identify weak areas."
        />
      </ProductCard>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Average Score"
          title="Average Score"
          value={`${Math.max(0, Math.min(100, Number.isFinite(bundle.analytics.averageScore) ? bundle.analytics.averageScore : 0)).toFixed(1)}%`}
          description="Average score across all completed tests."
          icon={Radar}
        />
        <StatCard
          label="Tests Completed"
          title="Tests Completed"
          value={bundle.summary.total_attempts}
          description="Number of completed attempts."
          icon={History}
        />
        <StatCard
          label="Correct Answers"
          title="Correct Answers"
          value={bundle.analytics.questionBankMastery.correctQuestions}
          description="Total questions answered correctly."
          icon={Target}
        />
        <StatCard
          label="XP Earned"
          title="XP Earned"
          value={bundle.xp.xp_total}
          description="Total XP you have earned so far."
          icon={Trophy}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-7"
          eyebrow={t("student.analytics.accuracy_trend", "Aniqlik trendi")}
          title={t("student.analytics.accuracy_trend_title", "So'nggi testlardagi o'sish")}
          description={t("student.analytics.accuracy_trend_description", "Har bir yakunlangan test bo'yicha natijangiz.")}
        >
          {accuracyTrend.length > 0 ? (
            <IntelligenceProgressChart data={accuracyTrend} color="#2563EB" theme="light" />
          ) : (
            <ProductEmptyState
              title="Trend hali shakllanmagan"
              description="Bir nechta test yakunlangach aniqlik o'zgarishi shu yerda chiziq ko'rinishida chiqadi."
            />
          )}
        </ChartCard>
        <ChartCard
          className="xl:col-span-5"
          eyebrow={t("student.analytics.topic_performance", "Mavzu natijalari")}
          title={t("student.analytics.topic_performance_title", "Zaifdan kuchliga qarab")}
          description={t("student.analytics.topic_performance_description", "Aniqligi past mavzular oldinroq ko'rsatiladi.")}
        >
          {topicPerformance.length > 0 ? (
            <IntelligenceTopicBarChart
              data={topicPerformance}
              colorScale={["#f97316", "#fb7185", "#38bdf8", "#22c55e"]}
              theme="light"
            />
          ) : (
            <ProductEmptyState
              title="Mavzu ma'lumoti hali yo'q"
              description="Savollar yechilgach zaif va kuchli mavzular shu yerda ko'rinadi."
            />
          )}
        </ChartCard>
      </div>

      <ChartCard
        eyebrow="Topic mastery"
        title="Topic mastery overview"
        description="See how confident you are in each topic."
      >
        {bundle.analytics.categoryMetrics.length === 0 ? (
          <ProductEmptyState
            title="No topic data yet"
            description="Complete a few tests to unlock topic mastery analytics."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bundle.analytics.categoryMetrics
              .slice()
              .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))
              .map((item) => {
              const raw = Number.isFinite(item.accuracy) ? item.accuracy : 0;
              const accuracy = Math.max(0, Math.min(100, Number(raw.toFixed(1))));
              let tone = "bg-rose-50 text-rose-700 border-rose-100";
              if (accuracy >= 90) tone = "bg-emerald-50 text-emerald-700 border-emerald-100";
              else if (accuracy >= 70) tone = "bg-sky-50 text-sky-700 border-sky-100";
              else if (accuracy >= 50) tone = "bg-amber-50 text-amber-700 border-amber-100";
              return (
                <div
                  key={item.category}
                  className={cn(
                    "flex flex-col rounded-2xl border px-4 py-3 text-sm",
                    tone,
                  )}
                >
                  <span className="font-medium">{item.category}</span>
                  <span className="mt-1 text-xs opacity-80">
                    Accuracy: {accuracy.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

      <ChartCard
        eyebrow="Zaif mavzular"
        title="Keyingi mashq uchun zaif mavzular"
        description="Keyingi mashqni aniqligi past bo'lgan mavzularga qaratish tavsiya qilinadi."
      >
        {topicPerformance.length === 0 ? (
          <ProductEmptyState
            title="Zaif mavzu hali aniqlanmadi"
            description="Yana bir nechta test yakunlang. Shundan keyin zaif mavzular shu yerda ko'rinadi."
            action={
              <PrimaryButton asChild>
                <Link href="/tests">Mashqni boshlash</Link>
              </PrimaryButton>
            }
          />
        ) : (
          <div className="space-y-2">
            {topicPerformance.slice(0, 6).map((topic) => (
              <div
                key={topic.topic}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{topic.topic}</p>
                  <p className="text-xs text-slate-500">
                    Aniqlik {topic.value.toFixed(1)}%
                  </p>
                </div>
                <PrimaryButton asChild size="sm">
                  <Link href={`/tests?topic=${encodeURIComponent(topic.topic)}`}>
                    Mashq qilish
                  </Link>
                </PrimaryButton>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-7"
          eyebrow="Simulyatsiya trendi"
          title="Imtihon signali qanday o'zgaryapti"
          description="Oxirgi simulyatsiyalardagi o'tish ehtimoli yo'nalishi shu yerda ko'rinadi."
        >
          {simulationTrend.length > 0 ? (
            <IntelligenceTrendChart data={simulationTrend} color="#22C55E" theme="light" />
          ) : (
            <ProductEmptyState
              title="Simulyatsiya trendi mavjud emas"
              description="Trendni ko'rish uchun kamida bitta imtihon simulyatsiyasini yakunlang."
            />
          )}
        </ChartCard>
        <ChartCard
          className="xl:col-span-5"
          eyebrow="Insight"
          title="Qayerga e'tibor berish kerak"
          description="Readiness signal va takrorlanayotgan zaif mavzu shu blokda ko'rsatiladi."
        >
          <div className="space-y-4">
            <div className="product-subtle-card p-[var(--space-stack)]">
              <p className="product-meta-text">
                Tayyorgarlik signali
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-950">{readinessInsight}</p>
              <p className="mt-2 text-sm text-slate-500">
                Joriy o&apos;tish ehtimoli: {bundle.prediction.exam_pass_probability.toFixed(1)}%
              </p>
            </div>
            <div className="product-subtle-card p-[var(--space-stack)]">
              <p className="product-meta-text">
                Takrorlangan zaif mavzu
              </p>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {weakTopicInsight.topic ?? "Aniq signal yo'q"}
              </p>
              <p className="mt-2 text-sm text-slate-500">{weakTopicInsight.message}</p>
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        eyebrow={t("student.analytics.history", "Test tarixi")}
        title={t("student.analytics.history_title", "So'nggi urinishlar")}
        description={t("student.analytics.history_description", "Yaqinda yakunlangan testlar bo'yicha qisqa tarix.")}
      >
        {testHistory.length === 0 ? (
          <ProductEmptyState
            title="Hali yakunlangan test yo'q"
            description="Birinchi testni tugatganingizdan keyin tarix shu yerda saqlanadi."
          />
        ) : (
          <div className="space-y-3">
            {testHistory.map((attempt) => (
              <div key={attempt.id} className="product-subtle-card-plain flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{attempt.test_title}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(attempt.finished_at)}</p>
                </div>
                <span className="text-sm font-semibold text-slate-900">{attempt.score}%</span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </PageContainer>
  );
}

export function AchievementsHub() {
  const { t } = useI18n();
  const { hydrated, token } = useEnsureUserHydrated();
  const [bundle, setBundle] = useState<UserIntelligenceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (active) {
          setBundle(response);
        }
      } catch {
        if (active) {
          setBundle(null);
          setError(t("student.achievements.load_error", "Ma'lumot topilmadi."));
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

  if (!hydrated || loading) {
    return <StudentSkeleton cards={3} />;
  }

  if (error || !bundle) {
    return (
      <PageContainer>
        <ProductCard className="product-card-shell">
          <SectionHeader
            eyebrow={t("nav.achievements", "Yutuqlar")}
            title={t("student.achievements.unavailable_title", "Ma'lumot topilmadi")}
            description={error ?? t("student.achievements.unavailable_description", "Qayta urinib ko'ring.")}
          />
          <ProductErrorState
            description={t("student.achievements.unavailable_body", "Yutuqlar ma'lumotlari vaqtincha yuklanmadi. Sahifani yangilab qayta urinib ko'ring.")}
            action={<PrimaryButton onClick={() => window.location.reload()}>{t("common.retry", "Qayta urinib ko'ring")}</PrimaryButton>}
          />
        </ProductCard>
      </PageContainer>
    );
  }

  const xpTotal = Math.max(0, bundle.xp.xp_total ?? 0);
  const tierProgress = getXpTierProgress(xpTotal);

  const unlockedAchievements = bundle.achievements.slice().sort((a, b) => {
    const aTime = a.awarded_at ? new Date(a.awarded_at).getTime() : 0;
    const bTime = b.awarded_at ? new Date(b.awarded_at).getTime() : 0;
    return bTime - aTime;
  });

  const DESIGN_ACHIEVEMENTS = [
    {
      id: "first_test",
      title: "Birinchi test",
      description: "Birinchi mashq yoki simulyatsiyani yakunlang.",
    },
    {
      id: "tests_10",
      title: "10 ta test",
      description: "Barqaror odat yaratish uchun 10 ta test tugating.",
    },
    {
      id: "tests_50",
      title: "50 ta test",
      description: "Uzoq muddatli odat uchun 50 ta testni yakunlang.",
    },
    {
      id: "accuracy_master",
      title: "Aniqlik ustasi",
      description: "O'rtacha 90% yoki undan yuqori aniqlikka chiqing.",
    },
    {
      id: "streak_7",
      title: "7 kunlik seriya",
      description: "7 kun ketma-ket mashq qilib seriya yarating.",
    },
    {
      id: "xp_1000",
      title: "1000 XP marrasi",
      description: "Kamida 1000 XP to'plang.",
    },
  ];

  const achievementCards = DESIGN_ACHIEVEMENTS.map((design) => {
    const unlocked = unlockedAchievements.find((achievement) => achievement.code === design.id);
    return {
      ...design,
      unlocked: Boolean(unlocked),
      awarded_at: unlocked?.awarded_at ?? null,
    };
  });

  const currentStreakDays = computePracticeStreak(bundle.summary.last_attempts);
  const weeklyActivity = buildWeeklyActivity(bundle.summary.last_attempts);
  const coachTopic = bundle.coach.focus_topics[0] ?? bundle.readiness.weak_topics[0] ?? null;
  const coachMessage = coachTopic
    ? `${coachTopic} mavzusida aniqlik pastroq. Shu mavzu bo'yicha mashq tavsiya qilinadi.`
    : bundle.coach.message;

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <SectionHeader
          eyebrow={t("nav.achievements", "Yutuqlar")}
          title="Yutuqlar, seriyalar va XP tier"
          description="Har bir mashq sizni keyingi badge, yangi tier va barqaror ritmga olib boradi."
          action={(
            <SecondaryButton asChild>
              <Link href="/learning-path">O&apos;qish yo&apos;lini ochish</Link>
            </SecondaryButton>
          )}
        />
      </ProductCard>

      <div className="grid gap-6 xl:grid-cols-12">
        <ProductCard className="xl:col-span-5">
          <div className="product-card-shell">
            <SectionHeader
              eyebrow="XP tier"
              title={`${xpTotal} XP`}
              description="Mashq va simulyatsiyalar orqali tier darajangiz oshib boradi."
              action={<TierBadge tier={tierProgress.tier} />}
            />
            <div className="mt-4 space-y-3">
              <ProductProgressBar value={tierProgress.progressPercent} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="product-subtle-card-plain px-4 py-3">
                  <p className="product-meta-text">Joriy tier</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{tierProgress.tier.label}</p>
                </div>
                <div className="product-subtle-card-plain px-4 py-3">
                  <p className="product-meta-text">Keyingi tier</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {tierProgress.nextTier ? `${tierProgress.nextTier.label} uchun ${tierProgress.remainingXp} XP` : "Eng yuqori tier"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ProductMotivationPill tone="success">
                  <Gem className="h-4 w-4" />
                  {bundle.xp.level}-daraja
                </ProductMotivationPill>
                <ProductMotivationPill tone="neutral">
                  Keyingi darajaga {bundle.xp.xp_to_next_level} XP
                </ProductMotivationPill>
              </div>
            </div>
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-4">
          <div className="product-card-shell space-y-4">
            <SectionHeader
              eyebrow="Kunlik seriya"
              title={currentStreakDays > 0 ? `🔥 ${currentStreakDays} kunlik seriya` : "Seriyani boshlang"}
              description="Hafta davomida mashq qilingan kunlar shu yerda ko'rinadi."
            />
            {currentStreakDays > 0 ? (
              <>
                <div className="grid grid-cols-7 gap-2">
                  {weeklyActivity.map((day) => (
                    <div
                      key={day.dateKey}
                      className={cn(
                        "rounded-[var(--radius-soft)] border px-2 py-3 text-center",
                        day.active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-400",
                        day.isToday && "ring-2 ring-blue-200",
                      )}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em]">{day.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500">
                  Har kuni kamida bitta mashq tugatib seriyani davom ettiring.
                </p>
              </>
            ) : (
              <ProductEmptyState
                title="Seriya hali shakllanmadi"
                description="Har kuni mashq qilib seriya yarating."
              />
            )}
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-3">
          <div className="product-card-shell space-y-4">
            <SectionHeader
              eyebrow="Coach tavsiyasi"
              title="Bugungi asosiy signal"
              description="Zaif mavzu va readiness signaliga qarab tavsiya."
            />
            <div className="product-subtle-card p-[var(--space-stack)]">
              <div className="flex items-center gap-3">
                <div className="product-icon-shell border-blue-100 bg-blue-50 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {coachTopic ?? "Barqaror tayyorgarlik"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{coachMessage}</p>
                </div>
              </div>
            </div>
            <PrimaryButton asChild>
              <Link href={coachTopic ? `/tests?topic=${encodeURIComponent(coachTopic)}` : "/practice"}>
                Tavsiya qilingan mashqni boshlash
              </Link>
            </PrimaryButton>
          </div>
        </ProductCard>
      </div>

      {/* Achievements grid */}
      <ChartCard
        eyebrow="Badge va marralar"
        title="Ochilayotgan yutuqlar"
        description="Mashq qilganingiz sari badge va milestone'lar ochilib boradi."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {achievementCards.map((achievement) => (
              <div
                key={achievement.id}
                className={cn(
                  "relative flex flex-col rounded-[var(--radius-card)] border px-4 py-4",
                  achievement.unlocked
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50 text-slate-400",
                )}
              >
                <div className="mb-3 flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-[var(--radius-soft)]",
                      achievement.unlocked ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500",
                    )}
                  >
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className={cn("text-sm font-semibold", !achievement.unlocked && "text-slate-500")}>
                      {achievement.title}
                    </p>
                    <p className="text-xs leading-5 text-slate-500">{achievement.description}</p>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  {achievement.unlocked ? (
                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
                      Ochildi {achievement.awarded_at ? formatDate(achievement.awarded_at) : ""}
                    </Badge>
                  ) : (
                    <Badge className="border-slate-200 bg-slate-200 text-slate-600">
                      Qulf yopiq
                    </Badge>
                  )}
                  {achievement.id === "xp_1000" ? <TierBadge tier={tierProgress.tier} /> : null}
                </div>
              </div>
            ))}
          </div>
      </ChartCard>

      {/* Streak section */}
      <ChartCard
        eyebrow="Mashq ritmi"
        title="Seriya xulosasi"
        description="Doimiy mashq barqaror tayyorgarlikni ushlab turadi."
      >
        {currentStreakDays > 0 ? (
          <div className="space-y-4">
            <p className="text-xl font-semibold text-slate-900">🔥 {currentStreakDays} kunlik seriya</p>
          </div>
        ) : (
          <ProductEmptyState
            title="Seriya hali shakllanmadi"
            description="Har kuni mashq qilib seriya yarating."
          />
        )}
      </ChartCard>

      {/* Recent unlocks */}
      <ChartCard
        eyebrow="So'nggi ochilgan yutuqlar"
        title="Yaqindagi badge'lar"
        description="Oxirgi ochilgan badge va milestone'lar shu yerda ko'rinadi."
      >
        {unlockedAchievements.length === 0 ? (
          <ProductEmptyState
            title="Hali yutuq ochilmadi"
            description="Bir nechta mashq tugatganingizdan keyin eng yangi yutuqlar shu yerda paydo bo'ladi."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {unlockedAchievements.slice(0, 6).map((achievement) => (
              <div
                key={`${achievement.code}-${achievement.awarded_at}`}
                className="product-subtle-card-plain min-w-0 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{achievement.name}</p>
                  <ProductMotivationPill tone="success">Ochildi</ProductMotivationPill>
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatDate(achievement.awarded_at)}</p>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </PageContainer>
  );
}

export function ProfileHub() {
  const { locale, t } = useI18n();
  const { hydrated, token } = useEnsureUserHydrated();
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof getUserProfileBundle>> | null>(null);
  const [intelligence, setIntelligence] = useState<UserIntelligenceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [profileResponse, intelligenceResponse] = await Promise.all([
          getUserProfileBundle(),
          getUserIntelligenceBundle(),
        ]);
        if (!active) return;
        setBundle(profileResponse);
        setIntelligence(intelligenceResponse);
      } catch {
        if (!active) return;
        setBundle(null);
        setIntelligence(null);
        setError(t("student.profile.load_error", "Ma'lumot topilmadi."));
      } finally {
        if (!active) return;
        setLoading(false);
        setHistoryLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [hydrated, t, token]);

  async function handleDownloadCertificate() {
    setDownloading(true);
    setCertificateError(null);
    try {
      const blob = await downloadReadinessCertificate();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "readiness-certificate.pdf";
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setCertificateError(error instanceof Error ? error.message : t("student.profile.certificate_download_error", "Sertifikatni yuklab bo'lmadi."));
    } finally {
      setDownloading(false);
    }
  }

  if (!hydrated || loading) {
    return <StudentSkeleton cards={4} />;
  }

  if (error || !bundle) {
    return (
      <PageContainer>
        <ProductCard className="product-card-shell">
          <SectionHeader
            eyebrow={t("nav.profile", "Profil")}
            title={t("student.profile.unavailable_title", "Ma'lumot topilmadi")}
            description={error ?? t("student.profile.unavailable_description", "Qayta urinib ko'ring.")}
          />
          <ProductErrorState
            description={t("student.profile.unavailable_body", "Profil ma'lumotlari vaqtincha yuklanmadi. Sahifani yangilang va qayta urinib ko'ring.")}
            action={<PrimaryButton onClick={() => window.location.reload()}>{t("common.retry", "Qayta urinib ko'ring")}</PrimaryButton>}
          />
        </ProductCard>
      </PageContainer>
    );
  }

  const xpTotal = Math.max(0, bundle.xp.xp_total ?? 0);
  const tierProgress = getXpTierProgress(xpTotal);
  const xpToNextLevel = Math.max(0, bundle.xp.xp_to_next_level ?? 0);
  const profileLevel = bundle.xp.level;
  const safeAverageScore = intelligence ? toPercent(intelligence.analytics.averageScore) : 0;

  const totalAttempts = intelligence?.summary.total_attempts ?? 0;

  const recentAttempts = intelligence?.summary.last_attempts.slice(0, 6) ?? [];
  const dailyGoalActivity = intelligence?.analytics.testActivity ?? [];

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={bundle.user.full_name || bundle.user.email} className="h-16 w-16 rounded-[var(--radius-card)] text-base" />
            <div>
              <p className="product-meta-text">{t("nav.profile", "Profil")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-slate-950">{bundle.user.full_name || bundle.user.email}</h2>
                <TierBadge tier={tierProgress.tier} />
              </div>
              <p className="mt-1 text-sm text-slate-500">{t("student.profile.description", "Profil ma'lumotlari, XP, yutuqlar va obuna holati.")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton asChild>
              <Link href="/billing">{t("nav.billing", "To'lovlar")}</Link>
            </PrimaryButton>
            <SecondaryButton asChild>
              <Link href="/learning-path">O&apos;qish yo&apos;li</Link>
            </SecondaryButton>
            <SecondaryButton asChild>
              <Link href="/achievements">{t("nav.achievements", "Yutuqlar")}</Link>
            </SecondaryButton>
          </div>
        </div>
      </ProductCard>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jami XP"
          title="Jami XP"
          value={xpTotal}
          description={t("student.profile.xp_description", "To'plangan umumiy XP.")}
          icon={Trophy}
        />
        <StatCard
          label="Daraja"
          title="Joriy daraja"
          value={profileLevel}
          description="XP bo'yicha hisoblangan daraja."
          icon={FileBadge2}
        />
        <StatCard
          label="Yakunlangan testlar"
          title="Yakunlangan testlar"
          value={totalAttempts}
          description="Umumiy yakunlangan urinishlar."
          icon={History}
        />
        <StatCard
          label="O'rtacha aniqlik"
          title="O'rtacha aniqlik"
          value={`${safeAverageScore.toFixed(1)}%`}
          description="Barcha testlar bo'yicha o'rtacha natija."
          icon={Radar}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <ProductCard className="xl:col-span-4">
          <div className="product-card-shell">
            <SectionHeader
              eyebrow={t("student.profile.account_profile", "Hisob ma'lumotlari")}
              title="Asosiy profil"
              description="Foydalanuvchi ma'lumotlari va hisob holati."
            />
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p><span className="text-slate-400">{t("student.profile.email", "Email")}:</span> {bundle.user.email}</p>
              <p><span className="text-slate-400">{t("student.profile.created", "Yaratilgan")}:</span> {formatDate(bundle.user.created_at)}</p>
              <p><span className="text-slate-400">{t("student.profile.verified", "Tasdiqlangan")}:</span> {bundle.user.is_verified ? t("student.profile.yes", "Ha") : t("student.profile.no", "Yo'q")}</p>
              <p><span className="text-slate-400">{t("student.profile.current_language", "Joriy til")}:</span> {locale}</p>
            </div>
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-8">
          <div className="product-card-shell">
            <SectionHeader
              eyebrow="Daily goal"
              title="Bugungi mashq maqsadi"
              description="Har kuni kichik maqsadni bajarib, ritmni yo'qotmang."
            />
            <div className="mt-4">
              <DailyGoalCard testActivity={dailyGoalActivity} />
            </div>
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-4">
          <div className="product-card-shell">
            <SectionHeader
              eyebrow="XP progressi"
              title={`${bundle.xp.level}-daraja`}
              description={`Keyingi darajaga ${xpToNextLevel} XP qoldi.`}
              action={<TierBadge tier={tierProgress.tier} />}
            />
            <div className="mt-6 space-y-3">
              <ProductProgressBar value={Math.max(8, tierProgress.progressPercent)} />
              <p className="text-sm text-slate-500">{"Yangi yutuqlar va reyting o'sishi uchun mashqni davom ettiring."}</p>
            </div>
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-4">
          <div className="product-card-shell">
            <SectionHeader
              eyebrow={t("student.profile.certificate", "Sertifikat")}
              title={t("student.profile.readiness_certificate", "Tayyorlik sertifikati")}
              description={t("student.profile.certificate_description", "Sertifikat 80+ tayyorgarlik darajasida ochiladi.")}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              {bundle.readiness.strong_topics.slice(0, 3).map((topic) => (
                <Badge key={topic} className="border-emerald-200 bg-emerald-50 text-emerald-700">{topic}</Badge>
              ))}
            </div>
            <PrimaryButton className="mt-5" onClick={() => void handleDownloadCertificate()} disabled={!bundle.readiness.certificate_unlocked || downloading}>
              {downloading ? t("student.profile.downloading", "Yuklanmoqda...") : t("student.profile.download_certificate", "Sertifikatni yuklab olish")}
            </PrimaryButton>
            {certificateError ? <p className="mt-3 text-sm text-rose-600">{certificateError}</p> : null}
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-12">
          <div className="grid gap-[var(--space-stack)] p-[var(--space-card)] lg:grid-cols-[1fr_1fr]">
            <div>
              <SectionHeader
                eyebrow={t("student.profile.recent_achievements", "So'nggi yutuqlar")}
                title="Yutuqlar va obuna"
                description="Oxirgi badge'lar va joriy tarif holati."
              />
            </div>
            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
              <SecondaryButton asChild>
                <Link href="/feedback">{t("student.profile.feedback", "Fikr yuborish")}</Link>
              </SecondaryButton>
              <SecondaryButton asChild>
                <Link href="/learning-path">O&apos;qish yo&apos;li</Link>
              </SecondaryButton>
              <PrimaryButton asChild>
                <Link href="/billing">{t("nav.billing", "To'lovlar")}</Link>
              </PrimaryButton>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 lg:col-span-2">
              {bundle.achievements.slice(0, 3).map((achievement) => (
                <div key={`${achievement.code}-preview`} className="product-subtle-card-plain px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{achievement.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(achievement.awarded_at)}</p>
                </div>
              ))}
              {bundle.achievements.slice(0, 3).length === 0 ? (
                <ProductEmptyState
                  title="Hali yutuqlar yo'q"
                  description="Mashq qilganingiz sari oxirgi yutuqlar shu bo'limda ko'rinadi."
                />
              ) : null}
            </div>
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-8">
          <div className="product-card-shell">
            <SectionHeader
              eyebrow="O'quv tarixi"
              title="So'nggi urinishlar"
              description="Yaqindagi mashq va simulyatsiya natijalari shu yerda saqlanadi."
            />
            <div className="mt-5">
              {historyLoading ? (
                <div className="space-y-3">
                  <ProductSkeletonCard className="min-h-[60px]" lines={2} />
                  <ProductSkeletonCard className="min-h-[60px]" lines={2} />
                </div>
              ) : recentAttempts.length === 0 ? (
                <ProductEmptyState
                  title="Hali urinish yo'q"
                  description="Birinchi mashqni tugatganingizdan keyin o'quv tarixi shu yerda ko'rinadi."
                />
              ) : (
                <div className="space-y-2">
                  {recentAttempts.map((attempt) => {
                    const resultLabel =
                      attempt.score >= 70
                        ? t("student.profile.result_passed", "O'tdi")
                        : t("student.profile.result_failed", "O'tmadi");
                    return (
                      <div
                        key={attempt.id}
                        className="product-subtle-card-plain flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {attempt.test_title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(attempt.finished_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {attempt.score}%
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {resultLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ProductCard>
      </div>
    </PageContainer>
  );
}

export function LearningPathHub() {
  const { t } = useI18n();
  const { hydrated, token } = useEnsureUserHydrated();
  const [bundle, setBundle] = useState<UserIntelligenceBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (active) {
          setBundle(response);
        }
      } catch {
        if (active) {
          setBundle(null);
          setError("Ma'lumot topilmadi.");
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
  }, [hydrated, token]);

  if (!hydrated || loading) {
    return <StudentSkeleton cards={4} />;
  }

  if (error || !bundle) {
    return (
      <PageContainer>
        <ProductCard className="product-card-shell">
          <SectionHeader
            eyebrow="O'qish yo'li"
            title="Ma'lumot topilmadi"
            description={error ?? "Qayta urinib ko'ring."}
          />
          <ProductErrorState
            description="O'qish yo'li ma'lumotlari vaqtincha yuklanmadi. Sahifani yangilang va qayta urinib ko'ring."
            action={<PrimaryButton onClick={() => window.location.reload()}>{t("common.retry", "Qayta urinib ko'ring")}</PrimaryButton>}
          />
        </ProductCard>
      </PageContainer>
    );
  }

  const learningPathTopics = buildLearningPathTopics(bundle);
  const coachTopic = bundle.coach.focus_topics[0] ?? bundle.readiness.weak_topics[0] ?? null;
  const tierProgress = getXpTierProgress(bundle.xp.xp_total);
  const dailyGoalActivity = bundle.analytics.testActivity;

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <SectionHeader
          eyebrow="O'qish yo'li"
          title="Mavzular bo'yicha o'sish yo'li"
          description="Har bir mavzu bo'yicha qayerga kelganingiz, qaysi bloklar ochilgani va qayerga fokus qilish kerakligi shu yerda ko'rinadi."
          action={(
            <>
              <TierBadge tier={tierProgress.tier} />
              <SecondaryButton asChild>
                <Link href="/practice">Mashq markaziga o&apos;tish</Link>
              </SecondaryButton>
            </>
          )}
        />
      </ProductCard>

      <div className="grid gap-6 xl:grid-cols-12">
        <ProductCard className="xl:col-span-4">
          <div className="product-card-shell space-y-4">
            <SectionHeader
              eyebrow="Coach tavsiyasi"
              title={coachTopic ? `${coachTopic} ustida ishlang` : "Barqaror mashqni davom ettiring"}
              description={bundle.coach.message}
            />
            <div className="product-subtle-card p-[var(--space-stack)]">
              <p className="product-meta-text">Bugungi tavsiya</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {bundle.coach.recommended_questions_today} ta savol mashq qiling
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {coachTopic
                  ? `${coachTopic} mavzusi bo'yicha fokuslangan mashq natijani tezroq ko'taradi.`
                  : "Zaif mavzular paydo bo'lgach coach tavsiyasi shu yerda yangilanadi."}
              </p>
            </div>
            <PrimaryButton asChild>
              <Link href={coachTopic ? `/tests?topic=${encodeURIComponent(coachTopic)}` : "/practice"}>
                Tavsiya qilingan mashqni ochish
              </Link>
            </PrimaryButton>
          </div>
        </ProductCard>

        <ProductCard className="xl:col-span-8">
          <div className="product-card-shell">
            <SectionHeader
              eyebrow="Tier progressi"
              title={`${tierProgress.tier.label} bosqichi`}
              description={tierProgress.nextTier ? `${tierProgress.nextTier.label} uchun ${tierProgress.remainingXp} XP qoldi.` : "Siz eng yuqori tierdasiz."}
            />
            <div className="mt-5 space-y-3">
              <ProductProgressBar value={tierProgress.progressPercent} />
              <div className="flex flex-wrap gap-2">
                <ProductMotivationPill tone="success">
                  {bundle.xp.level}-daraja
                </ProductMotivationPill>
                <ProductMotivationPill tone="neutral">
                  {bundle.readiness.readiness_score.toFixed(1)} tayyorgarlik darajasi
                </ProductMotivationPill>
              </div>
            </div>
          </div>
        </ProductCard>
      </div>

      <ProductCard>
        <div className="product-card-shell">
          <SectionHeader
            eyebrow="Daily goal"
            title="Bugungi mashq maqsadi"
            description="Hafta davomida kamida bitta mashqni bajarib boring."
          />
          <div className="mt-4">
            <DailyGoalCard testActivity={dailyGoalActivity} />
          </div>
        </div>
      </ProductCard>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {learningPathTopics.length === 0 ? (
          <ProductCard className="md:col-span-2 xl:col-span-3">
            <ProductEmptyState
              title="O'qish yo'li hali shakllanmadi"
              description="Bir nechta test yakunlaganingizdan keyin mavzular bo'yicha mastery bloklari shu yerda ko'rinadi."
              action={(
                <PrimaryButton asChild>
                  <Link href="/practice">Mashqni boshlash</Link>
                </PrimaryButton>
              )}
            />
          </ProductCard>
        ) : learningPathTopics.map((topic) => {
          const difficultyAccuracy = topic.accuracy;
          let difficultyLabel = "Qiyin";
          let difficultyClass = "text-rose-600 bg-rose-50 border-rose-100";
          if (difficultyAccuracy >= 85) {
            difficultyLabel = "Oson";
            difficultyClass = "text-emerald-700 bg-emerald-50 border-emerald-100";
          } else if (difficultyAccuracy >= 60) {
            difficultyLabel = "O'rta";
            difficultyClass = "text-amber-700 bg-amber-50 border-amber-100";
          }
          return (
          <ProductCard key={topic.topic}>
            <div className="product-card-shell space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-slate-950">{topic.topic}</p>
                    {topic.recommended ? (
                      <Badge className="border-amber-200 bg-amber-50 text-amber-700">Tavsiya qilingan</Badge>
                    ) : null}
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", difficultyClass)}>
                      {difficultyLabel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {topic.unlocked
                      ? `${topic.accuracy.toFixed(1)}% aniqlik • ${topic.coverage.toFixed(0)}% qamrov`
                      : "Bu blok hali to'liq ochilmagan"}
                  </p>
                </div>
                {topic.unlocked ? (
                  <TierBadge className="border-emerald-200 bg-emerald-50 text-emerald-700" tier={tierProgress.tier} />
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    <Lock className="h-3.5 w-3.5" />
                    Yopiq
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Mastery</span>
                  <span className="font-semibold text-slate-900">{topic.mastery.toFixed(0)}%</span>
                </div>
                <ProductProgressBar value={topic.mastery} />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-soft)] border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Holat</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {topic.unlocked ? "Mashq qilish mumkin" : "Avval oldingi mavzuni mustahkamlang"}
                  </p>
                </div>
                {topic.unlocked ? (
                  <PrimaryButton asChild>
                    <Link href={`/tests?topic=${encodeURIComponent(topic.topic)}`}>Mashq qilish</Link>
                  </PrimaryButton>
                ) : (
                  <SecondaryButton disabled>Qulf yopiq</SecondaryButton>
                )}
              </div>
            </div>
          </ProductCard>
        ); })}
      </div>
    </PageContainer>
  );
}

export function BillingHub() {
  const { t } = useI18n();
  const { hydrated } = useEnsureUserHydrated();
  const { user } = useAuth();
  const [plans, setPlans] = useState<CheckoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getAvailableCheckoutPlans();
        if (active) {
          setPlans(response);
        }
      } catch {
        if (active) {
          setPlans([]);
          setError(t("student.billing.load_error", "Ma'lumot topilmadi."));
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
  }, [t]);

  if (!hydrated || loading) {
    return <StudentSkeleton cards={3} />;
  }

  if (error) {
    return (
      <PageContainer>
        <ProductCard className="product-card-shell">
          <SectionHeader
            eyebrow={t("nav.billing", "To'lovlar")}
            title={t("student.billing.unavailable_title", "Ma'lumot topilmadi")}
            description={error}
          />
          <ProductErrorState
            description={t("student.billing.unavailable_body", "Tariflar ro'yxatini yuklab bo'lmadi. Birozdan keyin qayta urinib ko'ring.")}
            action={<PrimaryButton onClick={() => window.location.reload()}>{t("common.retry", "Qayta urinib ko'ring")}</PrimaryButton>}
          />
        </ProductCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <SectionHeader
          eyebrow={t("nav.billing", "To'lovlar")}
          title={t("student.billing.title", "Obuna va tariflar")}
          description={t("student.billing.description", "Joriy tarifingizni va mavjud premium variantlarni ko'ring.")}
          action={(
            <PrimaryButton asChild>
              <Link href="/upgrade">{t("student.billing.open_upgrade", "Tarifni yangilash")}</Link>
            </PrimaryButton>
          )}
        />
      </ProductCard>

      {plans.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <ProductCard key={plan.id} className="product-interactive-card">
              <div className="product-card-shell">
                <p className="product-meta-text">{plan.name}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {Math.round(plan.price_cents / 100)} {plan.currency}
                </p>
                <p className="mt-2 text-sm text-slate-500">{plan.duration_days} {t("student.billing.days", "kun")}</p>
                <div className="product-subtle-card-plain mt-5 flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-slate-500">Joriy holat</span>
                  <span className="text-sm font-medium text-slate-900">
                    {user?.plan === "premium" ? t("student.billing.premium", "Premium") : t("student.billing.free", "Bepul")}
                  </span>
                </div>
                <PrimaryButton asChild className="mt-5">
                  <Link href={`/upgrade?plan=${plan.id}`}>{t("student.billing.select_plan", "Tanlash")}</Link>
                </PrimaryButton>
              </div>
            </ProductCard>
          ))}
        </div>
      ) : (
        <ProductCard className="product-card-shell">
          <ProductEmptyState
            title={t("student.billing.empty_title", "Tariflar hozircha ko'rinmayapti")}
            description={t("student.billing.empty_description", "Premium tariflar tayyor bo'lgach shu yerda chiqadi. Keyinroq qayta tekshirib ko'ring.")}
          />
        </ProductCard>
      )}
    </PageContainer>
  );
}
