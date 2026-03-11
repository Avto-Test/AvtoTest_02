"use client";

export { default as StudentDashboardSurface } from "@/components/dashboard/StudentDashboardSurface";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Coins,
  CreditCard,
  FileBadge2,
  History,
  ListChecks,
  Radar,
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
  ProductProgressBar,
  ProductSkeletonCard,
  SectionHeader,
  SecondaryButton,
  StatCard,
} from "@/components/ui/product-primitives";
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
import type { CheckoutPlan } from "@/schemas/payment.schema";
import { useAuth } from "@/store/useAuth";

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

    const accuracyTrend = bundle.analytics.scoreTrend.map((point) => ({
      label: `#${point.testIndex}`,
      value: point.score,
    }));
    const topicPerformance = bundle.analytics.categoryMetrics
      .slice()
      .sort((left, right) => left.accuracy - right.accuracy)
      .slice(0, 6)
      .map((item) => ({
        topic: item.category,
        value: Number(item.accuracy.toFixed(1)),
      }));
    const testHistory = bundle.summary.last_attempts.slice(0, 5);
    const simulationTrend = simulationHistory
      .slice()
      .sort((left, right) => new Date(left.completed_at).getTime() - new Date(right.completed_at).getTime())
      .slice(-5)
      .map((entry) => ({
        label: new Date(entry.completed_at).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" }),
        value: entry.pass_probability,
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
          eyebrow={t("nav.analytics", "Analitika")}
          title={t("student.analytics.title", "O'qishdagi o'sishni soddalashtirilgan ko'rinishda ko'ring")}
          description={t("student.analytics.description", "Aniqlik trendi, mavzu natijalari va so'nggi testlar bir joyda jamlangan.")}
        />
      </ProductCard>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("student.analytics.accuracy", "Aniqlik")}
          title={t("student.analytics.average_score", "O'rtacha natija")}
          value={`${bundle.analytics.averageScore.toFixed(1)}%`}
          description={t("student.analytics.average_score_description", "Yakunlangan testlar bo'yicha umumiy natija.")}
          icon={Radar}
        />
        <StatCard
          label={t("student.analytics.pass_signal", "Imtihon signali")}
          title={t("student.analytics.pass_probability", "O'tish ehtimoli")}
          value={`${bundle.prediction.exam_pass_probability.toFixed(1)}%`}
          description={t("student.analytics.pass_probability_description", "Joriy progress asosidagi umumiy ehtimol.")}
          icon={Target}
        />
        <StatCard
          label={t("student.analytics.tests", "Testlar")}
          title={t("student.analytics.total_attempts", "Jami urinishlar")}
          value={bundle.summary.total_attempts}
          description={t("student.analytics.total_attempts_description", "Analitikaga kirgan yakunlangan testlar soni.")}
          icon={History}
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
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof getUserProfileBundle>> | null>(null);
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
        const response = await getUserProfileBundle();
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

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <SectionHeader
          eyebrow={t("nav.achievements", "Yutuqlar")}
          title={t("student.achievements.title", "Yig'ilgan yutuqlar va XP bir joyda")}
          description={t("student.achievements.description", "Qaysi bosqichga yetganingizni va keyingi daraja uchun nima kerakligini ko'ring.")}
        />
      </ProductCard>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard label="XP" title={t("student.achievements.total_xp", "Jami XP")} value={bundle.xp.xp_total} description={t("student.achievements.total_xp_description", "Mashq va sessiyalardan to'plangan XP.")} icon={Trophy} />
        <StatCard label={t("student.achievements.coins", "Coinlar")} title={t("student.achievements.coin_balance", "Coin balansi")} value={bundle.coins.coins_total} description={t("student.achievements.coin_balance_description", "Mukofot sifatida yig'ilgan coinlar.")} icon={Coins} />
        <StatCard label={t("student.achievements.badges", "Yutuqlar")} title={t("student.achievements.achievements", "Badge'lar")} value={bundle.achievements.length} description={t("student.achievements.achievements_description", "Milestone asosida berilgan yutuqlar.")} icon={Award} />
      </div>

      <ChartCard
        eyebrow={t("student.achievements.badges", "Yutuqlar")}
        title={t("student.achievements.cabinet_title", "Yutuqlar ro'yxati")}
        description={t("student.achievements.cabinet_description", "Olingan barcha yutuqlar shu yerda saqlanadi.")}
      >
        {bundle.achievements.length === 0 ? (
          <ProductEmptyState
            title="Hali yutuq yo'q"
            description="Mashq, simulyatsiya va XP to'plaganingiz sari yangi yutuqlar ochiladi."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {bundle.achievements.map((achievement) => (
              <div key={`${achievement.code}-${achievement.awarded_at}`} className="product-subtle-card p-[var(--space-stack)]">
                <p className="text-base font-semibold text-slate-950">{achievement.name}</p>
                <p className="mt-2 text-xs text-slate-500">{achievement.code}</p>
                <p className="mt-3 text-xs text-slate-500">{formatDate(achievement.awarded_at)}</p>
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
  const [loading, setLoading] = useState(true);
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
        const response = await getUserProfileBundle();
        if (active) {
          setBundle(response);
        }
      } catch {
        if (active) {
          setBundle(null);
          setError(t("student.profile.load_error", "Ma'lumot topilmadi."));
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

  const xpToNextLevel = Math.max(0, 100 - (bundle.xp.xp_total % 100));

  return (
    <PageContainer className="product-page-stack">
      <ProductCard className="product-card-shell sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={bundle.user.full_name || bundle.user.email} className="h-16 w-16 rounded-[var(--radius-card)] text-base" />
            <div>
              <p className="product-meta-text">{t("nav.profile", "Profil")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{bundle.user.full_name || bundle.user.email}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("student.profile.description", "Profil ma'lumotlari, XP, yutuqlar va obuna holati.")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton asChild>
              <Link href="/billing">{t("nav.billing", "To'lovlar")}</Link>
            </PrimaryButton>
            <SecondaryButton asChild>
              <Link href="/achievements">{t("nav.achievements", "Yutuqlar")}</Link>
            </SecondaryButton>
          </div>
        </div>
      </ProductCard>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("student.profile.readiness", "Tayyorgarlik")} title={t("student.profile.score", "Tayyorgarlik darajasi")} value={`${bundle.readiness.readiness_score.toFixed(1)}%`} description={t("student.profile.score_description", "Joriy readiness ko'rsatkichi.")} icon={FileBadge2} />
        <StatCard label={t("student.profile.prediction", "Imtihon")} title={t("student.profile.pass_signal", "O'tish ehtimoli")} value={`${bundle.prediction.exam_pass_probability.toFixed(1)}%`} description={t("student.profile.pass_signal_description", "Joriy ML bashorati.")} icon={Radar} />
        <StatCard label="XP" title={t("student.profile.xp", "XP")} value={bundle.xp.xp_total} description={t("student.profile.xp_description", "To'plangan umumiy XP.")} icon={Trophy} />
        <StatCard label={t("student.profile.subscription", "Obuna")} title={t("student.profile.plan", "Tarif")} value={bundle.user.is_premium ? t("student.profile.premium", "Premium") : t("student.profile.free", "Bepul")} description={t("student.profile.plan_description", "Joriy obuna holati.")} icon={CreditCard} />
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

        <ProductCard className="xl:col-span-4">
          <div className="product-card-shell">
            <SectionHeader
              eyebrow="XP progressi"
              title={`${bundle.xp.level}-daraja`}
              description={`Keyingi darajaga ${xpToNextLevel} XP qoldi.`}
            />
            <div className="mt-6 space-y-3">
              <ProductProgressBar value={Math.max(8, 100 - xpToNextLevel)} />
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
