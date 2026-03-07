"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/store/useAuth";
import {
  LessonRecommendationsCard,
  RecentAttempts,
  RecommendationCard,
  SystemStatusBar,
} from "@/components/dashboard";
import { ZonePrimaryAIV2 } from "@/components/dashboard/zones/ZonePrimaryAIV2";
import { ZoneActionCenterV2 } from "@/components/dashboard/zones/ZoneActionCenterV2";
import { ZonePerformanceV2 } from "@/components/dashboard/zones/ZonePerformanceV2";
import { ZonePremiumV2 } from "@/components/dashboard/zones/ZonePremiumV2";
import { ZoneRevenueTriggersV2 } from "@/components/dashboard/zones/ZoneRevenueTriggersV2";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeV2, ButtonV2, CardV2, SectionWrapperV2 } from "@/components/ui-v2";
import type { DashboardAnalyticsViewModel, RecommendationInsight } from "@/analytics/types";
import type { UserAttemptSummary } from "@/schemas/analytics.schema";
import { useI18n } from "@/components/i18n-provider";

interface TopicRecommendationPayload {
  topic: string;
  accuracy: number;
  action_label: string;
  [key: string]: unknown;
}

interface LessonRecommendationPayload {
  lesson_id: string;
  title: string;
  content_type: string;
  content_url: string;
  topic?: string | null;
  section?: string | null;
  reason: string;
  match_score: number;
  [key: string]: unknown;
}

interface DashboardOverviewPayload {
  total_attempts?: number;
  drift_status?: string;
  model_version?: string;
  last_retrained?: string;
  inference_latency?: number;
  confidence_score?: number;
  total_due?: number;
  cognitive_stability?: string | null;
  last_attempts?: UserAttemptSummary[];
  [key: string]: unknown;
}

interface DashboardApiResponse {
  overview?: DashboardOverviewPayload;
  retention_vector?: Array<{
    retention?: number;
    [key: string]: unknown;
  }>;
  recommendation?: TopicRecommendationPayload | null;
  lesson_recommendations?: LessonRecommendationPayload[];
  [key: string]: unknown;
}

export default function DashboardV2Page() {
  const { user, fetchUser } = useAuth();
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<DashboardApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pressureEnabled] = useState(false);
  const [showCelebration, setShowCelebration] = useState<"gift" | "paid" | null>(null);
  const handledUpgradeKeyRef = useRef<string | null>(null);
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => {
        const colors = ["#22c55e", "#06b6d4", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7"];
        return {
          id: index,
          color: colors[index % colors.length],
          left: Math.random() * 100,
          delay: Math.random() * 0.35,
          duration: 1.9 + Math.random() * 1.1,
          size: 5 + Math.random() * 8,
          rotate: Math.random() * 360,
        };
      }),
    []
  );

  useEffect(() => {
    const upgraded = searchParams.get("upgraded") === "true";
    if (!upgraded) return;
    if (typeof window !== "undefined") {
      const dedupKey = `upgrade-toast:${window.location.pathname}${window.location.search}`;
      if (window.sessionStorage.getItem(dedupKey) === "1") {
        return;
      }
      window.sessionStorage.setItem(dedupKey, "1");
      window.setTimeout(() => {
        window.sessionStorage.removeItem(dedupKey);
      }, 5000);
    }

    const gift = searchParams.get("gift") === "true";
    const key = `${upgraded ? "1" : "0"}:${gift ? "1" : "0"}`;
    if (handledUpgradeKeyRef.current === key) return;
    handledUpgradeKeyRef.current = key;

    trackEvent("upgrade_success", {
      source: "dashboard_v2_return",
      gift,
    });

    setShowCelebration(gift ? "gift" : "paid");
    toast.success(gift ? "Premium gifted successfully!" : "Successfully upgraded to Premium!", {
      description: gift
        ? "You received Premium as a gift."
        : "You now have unlimited access to all features.",
    });

    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", "/dashboard-v2");
    }

    void fetchUser().catch(() => undefined);

    const timer = window.setTimeout(() => {
      setShowCelebration(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [searchParams, fetchUser]);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const { data } = await api.get("/analytics/me/dashboard");
        setOverview(data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  const dashboardData = useMemo(() => {
    if (!overview) return null;
    return overview.overview;
  }, [overview]);

  const lessonRecommendations = useMemo(() => {
    return Array.isArray(overview?.lesson_recommendations) ? overview.lesson_recommendations : [];
  }, [overview]);
  const recommendation = useMemo<RecommendationInsight>(() => {
    const raw = overview?.recommendation;
    const topic =
      typeof raw?.topic === "string" && raw.topic.trim().length > 0 ? raw.topic.trim() : null;
    const accuracy =
      typeof raw?.accuracy === "number" && Number.isFinite(raw.accuracy)
        ? Math.max(0, Math.min(100, raw.accuracy))
        : null;

    return {
      topic,
      accuracy,
      coverage: null,
      attempts: null,
      reasoning: accuracy === null ? null : accuracy < 40 ? "lowest_accuracy" : "practice_recommended",
      priorityScore: accuracy,
      explanation: topic
        ? accuracy === null
          ? `${topic} mavzusi bo'yicha tavsiya tayyor. Shu yo'nalishda mashq qilish foydali bo'ladi.`
          : accuracy < 40
            ? `Siz ${topic} mavzusida atigi ${Math.round(accuracy)}% aniqlikka egasiz. Bu sizning eng zaif yo'nalishlaringizdan biri.`
            : accuracy < 70
              ? `${topic} mavzusida sizning aniqligingiz ${Math.round(accuracy)}%. Bu yo'nalishni mustahkamlash orqali umumiy natijangizni tez oshirish mumkin.`
              : `${topic} mavzusi yaxshi o'zlashtirilgan, ammo qo'shimcha mashq yanada mustahkamlaydi.`
        : "Tavsiya uchun hali yetarli ma'lumot yo'q.",
      categoryId: null,
      normalizedTopicKey: topic ? topic.toLocaleLowerCase("uz-UZ") : null,
      actionLabel:
        typeof raw?.action_label === "string" && raw.action_label.trim().length > 0
          ? raw.action_label.trim()
          : "Shu mavzuda mashq qilish",
    };
  }, [overview]);
  const recommendationLessons = useMemo<DashboardAnalyticsViewModel["lessonRecommendations"]>(() => {
    return lessonRecommendations.map((lesson, index) => ({
      lessonId:
        typeof lesson.lesson_id === "string" && lesson.lesson_id.trim().length > 0
          ? lesson.lesson_id
          : `${lesson.title || "lesson"}-${index}`,
      title:
        typeof lesson.title === "string" && lesson.title.trim().length > 0
          ? lesson.title
          : "Tavsiya dars",
      reason:
        typeof lesson.reason === "string" && lesson.reason.trim().length > 0
          ? lesson.reason
          : "Qo'shimcha mashq tavsiya etiladi.",
      topic:
        typeof lesson.topic === "string" && lesson.topic.trim().length > 0 ? lesson.topic : null,
      contentType:
        typeof lesson.content_type === "string" && lesson.content_type.trim().length > 0
          ? lesson.content_type
          : null,
    }));
  }, [lessonRecommendations]);

  const premiumOverview = useMemo(() => {
    if (!dashboardData) return null;

    return {
      confidence_score:
        typeof dashboardData.confidence_score === "number" ? dashboardData.confidence_score : undefined,
      retention_vector: Array.isArray(overview?.retention_vector) ? overview.retention_vector : [],
      total_due: typeof dashboardData.total_due === "number" ? dashboardData.total_due : 0,
      cognitive_stability:
        typeof dashboardData.cognitive_stability === "string" ? dashboardData.cognitive_stability : null,
    };
  }, [dashboardData, overview]);

  const displayName = user?.full_name || user?.email?.split("@")[0] || "User";
  const isPremium = user?.plan === "premium";
  const passProbability = Number.isFinite(dashboardData?.pass_probability)
    ? Math.max(0, Math.min(100, Math.round(Number(dashboardData?.pass_probability))))
    : 0;
  const readinessScore = Number.isFinite(dashboardData?.readiness_score)
    ? Math.max(0, Math.min(100, Math.round(Number(dashboardData?.readiness_score))))
    : 0;

  const hasRetentionInstability = useMemo(() => {
    const stabilityText =
      typeof dashboardData?.cognitive_stability === "string"
        ? dashboardData.cognitive_stability.toLowerCase()
        : "";

    const unstableKeywords = ["variable", "unstable", "fragile", "declin", "risk"];
    const flaggedByStabilityText = unstableKeywords.some((keyword) =>
      stabilityText.includes(keyword)
    );

    const retentionValues = Array.isArray(overview?.retention_vector)
      ? overview.retention_vector
          .map((item) => (Number.isFinite(item?.retention) ? Number(item.retention) : NaN))
          .filter((value) => Number.isFinite(value))
          .map((value) => (value <= 1 ? value * 100 : value))
      : [];

    if (retentionValues.length === 0) {
      return flaggedByStabilityText;
    }

    const averageRetention =
      retentionValues.reduce((sum, value) => sum + value, 0) / retentionValues.length;
    return flaggedByStabilityText || averageRetention < 75;
  }, [dashboardData?.cognitive_stability, overview?.retention_vector]);

  const driftStatus = dashboardData?.drift_status || "stable";
  const driftVariant =
    driftStatus === "severe"
      ? "danger"
      : driftStatus === "moderate"
      ? "warning"
      : "success";
  const driftLabel =
    driftStatus === "stable"
      ? "Model Stable"
      : driftStatus === "moderate"
      ? "Monitoring Drift"
      : "Drift Detected";

  const copy = useMemo(() => {
    switch (locale) {
      case "ru":
        return {
          workspace: "Рабочая панель",
          title: "Умная аналитика",
          subtitle: `Анализ вашей динамики, ${displayName}`,
          planPremium: "Премиум",
          planFree: "Бесплатный",
          live: "Живая аналитика",
          history: "История",
          settings: "Настройки",
          startSmart: "Запустить умный тест",
          startSmartHint: "AI подбирает следующую тему по вашим слабым местам.",
          modelHint: "Модель v",
          startTitle: "Начните первую попытку",
          startDesc: "Завершите первый тест и откройте персональную аналитику.",
          firstTest: "Начать первый тест",
          premium: "Премиум",
          premiumTitle: "Продвинутая аналитика",
          premiumDesc: "Уверенность, повторение, стабильность памяти и очереди review.",
          rec: "Рекомендация",
          recTitle: "Следующий лучший шаг",
          recDesc: "Тема с наибольшим влиянием на ваш прогресс.",
          lessons: "Уроки",
          lessonsTitle: "Диагностические уроки",
          lessonsDesc: "Уроки по темам, где у вас больше всего ошибок.",
          system: "Система",
          systemTitle: "Состояние модели",
          systemDesc: "Drift, версия модели и latency.",
          intelligence: "Интеллект",
          intelligenceTitle: "Прогноз сдачи",
          intelligenceDesc: "Снимок вероятности, готовности и устойчивости.",
          activity: "Активность",
          activityTitle: "Последние попытки",
          activityDesc: "Недавние результаты и динамика.",
          viewAll: "Показать всё",
          congrats: "Поздравляем!",
          premiumGift: "Вы получили Premium в подарок.",
          premiumPaid: "Premium успешно активирован.",
        };
      case "en":
        return {
          workspace: "Workspace",
          title: "Smart Dashboard",
          subtitle: `Analyzing your performance path, ${displayName}`,
          planPremium: "Premium Plan",
          planFree: "Free Plan",
          live: "Live Analytics",
          history: "History",
          settings: "Settings",
          startSmart: "Start Smart Practice",
          startSmartHint: "AI targets your weakest areas with adaptive selection.",
          modelHint: "Model v",
          startTitle: "Start your first attempt",
          startDesc: "Complete your first test to unlock personalized analytics.",
          firstTest: "Take First Test",
          premium: "Premium",
          premiumTitle: "Advanced Intelligence",
          premiumDesc: "Confidence, retention, memory stability, and review queue.",
          rec: "Recommendation",
          recTitle: "Highest-impact next topic",
          recDesc: "The next topic that boosts your score fastest.",
          lessons: "Lessons",
          lessonsTitle: "Diagnostic lessons",
          lessonsDesc: "Lessons mapped to your frequent mistakes.",
          system: "System",
          systemTitle: "Model status",
          systemDesc: "Drift, model version, and live latency.",
          intelligence: "Intelligence",
          intelligenceTitle: "Pass outlook",
          intelligenceDesc: "Snapshot of pass probability and readiness.",
          activity: "Activity",
          activityTitle: "Recent attempts",
          activityDesc: "Latest results and trend.",
          viewAll: "View all",
          congrats: "Congratulations!",
          premiumGift: "You received Premium as a gift.",
          premiumPaid: "Premium plan activated successfully.",
        };
      default:
        return {
          workspace: "Ish maydoni",
          title: "Aqlli boshqaruv paneli",
          subtitle: `Natijalaringiz tahlil qilinmoqda, ${displayName}`,
          planPremium: "Premium tarif",
          planFree: "Bepul tarif",
          live: "Jonli analitika",
          history: "Tarix",
          settings: "Sozlamalar",
          startSmart: "Aqlli testni boshlash",
          startSmartHint: "AI sizning eng zaif mavzularingizni avtomatik tanlaydi.",
          modelHint: "Model v",
          startTitle: "Birinchi urinishni boshlang",
          startDesc: "Shaxsiy tahlil va tavsiyalar uchun birinchi testni tugating.",
          firstTest: "Birinchi testni boshlash",
          premium: "Premium",
          premiumTitle: "Kengaytirilgan tahlil",
          premiumDesc: "Ishonch, xotira barqarorligi va qayta ko‘rish navbati bir joyda.",
          rec: "Tavsiya",
          recTitle: "Eng samarali keyingi qadam",
          recDesc: "Natijani tez oshiradigan navbatdagi mavzu.",
          lessons: "Darslar",
          lessonsTitle: "Diagnostik darslar",
          lessonsDesc: "Ko‘p xato qilinayotgan mavzular bo‘yicha darslar.",
          system: "Tizim",
          systemTitle: "Model holati",
          systemDesc: "Drift, model versiyasi va jonli latency.",
          intelligence: "Intellekt",
          intelligenceTitle: "O‘tish prognozi",
          intelligenceDesc: "O‘tish ehtimoli, tayyorgarlik va barqarorlik ko‘rinishi.",
          activity: "Faollik",
          activityTitle: "So‘nggi urinishlar",
          activityDesc: "Yaqindagi natijalar va trend.",
          viewAll: "Barchasini ko‘rish",
          congrats: "Tabriklaymiz!",
          premiumGift: "Siz premiumni sovg‘a sifatida oldingiz.",
          premiumPaid: "Premium tarif muvaffaqiyatli yoqildi.",
        };
    }
  }, [locale, displayName]);

  if (isLoading && !dashboardData) {
    return (
      <div className="v2-page mx-auto max-w-7xl space-y-8 px-4 pb-10 md:px-0">
        <CardV2 className="p-6 md:p-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-64" />
          </div>
        </CardV2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl border border-[var(--v2-border)]" />
          <Skeleton className="h-40 rounded-2xl border border-[var(--v2-border)]" />
          <Skeleton className="h-40 rounded-2xl border border-[var(--v2-border)]" />
        </div>
        <Skeleton className="h-48 rounded-2xl border border-[var(--v2-border)]" />
        <Skeleton className="h-52 rounded-2xl border border-[var(--v2-border)]" />
      </div>
    );
  }

  return (
    <>
    <div className="v2-page relative mx-auto max-w-7xl space-y-7 overflow-hidden px-4 pb-12 md:px-0">
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <CardV2 className="relative overflow-hidden border-[var(--v2-border-strong)] bg-gradient-to-br from-[var(--v2-surface)] via-[var(--v2-surface)] to-[var(--v2-surface-subtle)] p-6 md:p-8">
        <div className="pointer-events-none absolute -top-10 right-0 h-36 w-36 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--v2-text-tertiary)]">
              {copy.workspace}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--v2-text-primary)]">
              {copy.title}
            </h1>
            <p className="text-sm text-[var(--v2-text-secondary)]">
              {copy.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <BadgeV2 variant={isPremium ? "info" : "neutral"}>
                {isPremium ? copy.planPremium : copy.planFree}
              </BadgeV2>
              {dashboardData && <BadgeV2 variant={driftVariant}>{driftLabel}</BadgeV2>}
              <BadgeV2 variant="neutral" className="gap-1">
                <Activity className="h-3 w-3" />
                {copy.live}
              </BadgeV2>
              <BadgeV2 variant="neutral" className="gap-1">
                {copy.modelHint}{dashboardData?.model_version || "—"}
              </BadgeV2>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonV2 variant="outline" className="flex-1 sm:flex-none" asChild>
              <Link href="/dashboard/history">{copy.history}</Link>
            </ButtonV2>
            <ButtonV2 variant="secondary" className="flex-1 sm:flex-none" asChild>
              <Link href="/dashboard/settings">{copy.settings}</Link>
            </ButtonV2>
            <div className="flex flex-1 flex-col gap-1 sm:flex-none">
              <ButtonV2 className="flex-1 sm:flex-none" asChild>
                <Link href={`/tests?mode=adaptive&pressure=${pressureEnabled}`}>
                  <Sparkles className="h-4 w-4" />
                  {copy.startSmart}
                </Link>
              </ButtonV2>
              <p className="text-xs text-[var(--v2-text-tertiary)]">
                {copy.startSmartHint}
              </p>
              {dashboardData?.model_version &&
              typeof dashboardData.total_attempts === "number" &&
              dashboardData.total_attempts > 0 ? (
                <p className="text-xs text-[var(--v2-text-tertiary)]">
                  {copy.modelHint}{dashboardData.model_version} &bull; {t("dashboard.start_desc")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </CardV2>

      {!dashboardData || dashboardData.total_attempts === 0 ? (
        <div className="space-y-7">
          <CardV2 className="p-8 md:p-10">
            <div className="mx-auto max-w-md space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--v2-border)] bg-[var(--v2-surface-subtle)]">
                <TrendingUp className="h-6 w-6 text-[var(--v2-text-secondary)]" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--v2-text-primary)]">{copy.startTitle}</h2>
              <p className="text-sm text-[var(--v2-text-tertiary)]">
                {copy.startDesc}
              </p>
              <div className="pt-2">
                <ButtonV2 asChild size="lg">
                  <Link href="/tests">{copy.firstTest}</Link>
                </ButtonV2>
              </div>
            </div>
          </CardV2>

          <div className="grid gap-7 xl:grid-cols-2">
            <SectionWrapperV2
              label={copy.premium}
              title={copy.premiumTitle}
              description={copy.premiumDesc}
              contentClassName="p-5 md:p-6"
            >
              <ZonePremiumV2 overview={premiumOverview} user={user} />
            </SectionWrapperV2>

            <SectionWrapperV2
              label={copy.rec}
              title={copy.recTitle}
              description={copy.recDesc}
              contentClassName="p-5 md:p-6"
            >
              <RecommendationCard
                recommendation={recommendation}
                isPremium={isPremium}
                lessons={recommendationLessons}
              />
            </SectionWrapperV2>
          </div>

          <SectionWrapperV2
            label={copy.lessons}
            title={copy.lessonsTitle}
            description={copy.lessonsDesc}
            contentClassName="p-5 md:p-6"
          >
            <LessonRecommendationsCard
              lessons={lessonRecommendations}
              isPremium={isPremium}
            />
          </SectionWrapperV2>
        </div>
      ) : (
        <div className="space-y-7">
          <SectionWrapperV2
            label={copy.system}
            title={copy.systemTitle}
            description={copy.systemDesc}
          >
            <SystemStatusBar
              driftStatus={dashboardData.drift_status}
              modelVersion={dashboardData.model_version}
              lastRetrained={dashboardData.last_retrained}
              inferenceLatency={dashboardData.inference_latency}
            />
          </SectionWrapperV2>

          <SectionWrapperV2 label={copy.intelligence} title={copy.intelligenceTitle} description={copy.intelligenceDesc} contentClassName="p-5 md:p-6">
            <ZonePrimaryAIV2 overview={dashboardData} user={user} />
          </SectionWrapperV2>

          <ZoneRevenueTriggersV2
            isPremium={isPremium}
            passProbability={passProbability}
            readinessScore={readinessScore}
            hasRetentionInstability={hasRetentionInstability}
            totalAttempts={dashboardData.total_attempts || 0}
          />

          <ZoneActionCenterV2 />

          <ZonePerformanceV2 overview={dashboardData} />

          <SectionWrapperV2
            label={copy.premium}
            title={copy.premiumTitle}
            description={copy.premiumDesc}
            contentClassName="p-5 md:p-6"
          >
            <ZonePremiumV2 overview={premiumOverview} user={user} />
          </SectionWrapperV2>

          <div className="grid gap-7 xl:grid-cols-2">
            <SectionWrapperV2
              label={copy.rec}
              title={copy.recTitle}
              description={copy.recDesc}
              contentClassName="p-5 md:p-6"
            >
              <RecommendationCard
                recommendation={recommendation}
                isPremium={isPremium}
                lessons={recommendationLessons}
              />
            </SectionWrapperV2>

            <SectionWrapperV2
              label={copy.lessons}
              title={copy.lessonsTitle}
              description={copy.lessonsDesc}
              contentClassName="p-5 md:p-6"
            >
              <LessonRecommendationsCard
                lessons={lessonRecommendations}
                isPremium={isPremium}
              />
            </SectionWrapperV2>
          </div>

          <SectionWrapperV2
            label={copy.activity}
            title={copy.activityTitle}
            description={copy.activityDesc}
            actions={
              <ButtonV2 variant="ghost" className="flex-1 sm:flex-none" asChild>
                <Link href="/dashboard/history">{copy.viewAll}</Link>
              </ButtonV2>
            }
            contentClassName="p-5 md:p-6"
          >
            <RecentAttempts attempts={dashboardData?.last_attempts || []} />
          </SectionWrapperV2>
        </div>
      )}
    </div>
    {showCelebration ? (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="absolute top-[-10%] block rounded-[2px]"
              style={{
                left: `${piece.left}%`,
                width: `${piece.size}px`,
                height: `${piece.size * 0.4}px`,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotate}deg)`,
                animation: `dashboard-v2-confetti-fall ${piece.duration}s linear ${piece.delay}s forwards`,
              }}
            />
          ))}
        </div>
        <CardV2 className="relative mx-4 w-full max-w-lg p-8 text-center">
          <h3 className="text-2xl font-semibold text-[var(--v2-text-primary)]">{copy.congrats}</h3>
          <p className="mt-3 text-[var(--v2-text-secondary)]">
            {showCelebration === "gift"
              ? copy.premiumGift
              : copy.premiumPaid}
          </p>
        </CardV2>
        <style jsx>{`
          @keyframes dashboard-v2-confetti-fall {
            0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            100% { transform: translate3d(0, 110vh, 0) rotate(720deg); opacity: 0.1; }
          }
        `}</style>
      </div>
    ) : null}
    </>
  );
}
