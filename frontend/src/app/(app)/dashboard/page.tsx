"use client";
/* eslint-disable react/no-unescaped-entities */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, PlayCircle, RefreshCcw, Sparkles, TrendingUp, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/store/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";
import { consumePremiumActivationBanner } from "@/lib/payments";

const PassProbabilityGauge = dynamic(() => import("@/components/dashboard/PassProbabilityGauge"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const ScoreTrendChart = dynamic(() => import("@/components/dashboard/ScoreTrendChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const CategoryRadarChart = dynamic(() => import("@/components/dashboard/CategoryRadarChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const TopicPerformanceCards = dynamic(() => import("@/components/dashboard/TopicPerformanceCards"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const QuestionBankMasteryCard = dynamic(() => import("@/components/dashboard/QuestionBankMasteryCard"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const RecommendationCard = dynamic(() => import("@/components/dashboard/RecommendationCard"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export default function DashboardPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { data, loading, error, hasEnoughAttempts, refetch } = useDashboardAnalytics();
  const [premiumBannerDismissed, setPremiumBannerDismissed] = useState(false);
  const [storageBannerTriggered] = useState(() => consumePremiumActivationBanner());

  const displayName = useMemo(() => {
    return user?.full_name || user?.email?.split("@")[0] || "Foydalanuvchi";
  }, [user?.full_name, user?.email]);
  const isPremium = user?.plan === "premium";
  const queryTriggered = isPremium && searchParams.get("upgraded") === "true";
  const showPremiumBanner =
    isPremium &&
    !premiumBannerDismissed &&
    (queryTriggered || storageBannerTriggered);

  useEffect(() => {
    if (queryTriggered && typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", "/dashboard");
    }
  }, [queryTriggered]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 md:px-6 xl:px-8">
        <Skeleton className="h-56 rounded-3xl" />
        <div className="grid gap-6 xl:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 xl:px-8">
        <section className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6">
          <h1 className="text-xl font-semibold text-white">Boshqaruv paneli</h1>
          <p className="mt-2 text-sm text-red-200">{error ?? "Analitika ma'lumotlarini olishda xatolik yuz berdi."}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300/30 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/30"
          >
            <RefreshCcw className="h-4 w-4" />
            Qayta urinish
          </button>
        </section>
      </div>
    );
  }

  const trendLabel =
    data.improvementDelta > 0 ? `+${data.improvementDelta.toFixed(1)}%` : `${data.improvementDelta.toFixed(1)}%`;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 md:px-6 xl:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-[#1F2A44] bg-[radial-gradient(120%_160%_at_8%_0%,rgba(14,116,144,0.25)_0%,rgba(11,19,36,0.92)_56%,#0B1324_100%)] p-6">
        <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,420px)]">
          <div>
            <p className="text-sm text-cyan-200">Assalomu alaykum, {displayName}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Imtihonga tayyorgarlik holati</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              O'tish ehtimoli sizning test natijalaringiz, savollarni o'zlashtirish va rivojlanish trendi asosida hisoblanadi.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <span className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]">
                O'rtacha natija: <strong>{Math.round(data.averageScore)}%</strong>
              </span>
              <span className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-100 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]">
                Eng yuqori natija: <strong>{Math.round(data.bestScore)}%</strong>
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100">
                <TrendingUp className="h-3.5 w-3.5" />
                So'nggi o'sish: <strong>{trendLabel}</strong>
              </span>
              <span className="rounded-xl border border-slate-400/30 bg-slate-500/10 px-3 py-1.5 text-xs text-slate-200">
                Testlar soni: <strong>{data.totalAttempts}</strong>
              </span>
              <span className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-100">
                Ko'rilgan savollar: <strong>{data.questionBankMastery.seenQuestions}</strong>
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/tests/adaptive?count=20"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                <PlayCircle className="h-4 w-4" />
                Aqlli testni boshlash
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                Premium tahlil
              </span>
            </div>
          </div>

          <div className="flex items-stretch">
            <PassProbabilityGauge passProbability={data.passProbability} />
          </div>
        </div>
      </section>

      {showPremiumBanner && isPremium ? (
        <section className="rounded-2xl border border-emerald-400/25 bg-[linear-gradient(135deg,rgba(6,78,59,0.92)_0%,rgba(6,95,70,0.82)_35%,rgba(8,47,73,0.92)_100%)] p-4 shadow-[0_18px_50px_rgba(4,120,87,0.18)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-emerald-100 ring-1 ring-white/10">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100/80">Premium faol</p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  Premium obuna faollashtirildi
                </h2>
                <p className="mt-1 text-sm leading-6 text-emerald-50/85">
                  Premium imkoniyatlari ochildi. Kengaytirilgan tavsiyalar va analitikani shu dashboard ichida ko'rishingiz mumkin.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="#premium-insights"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
              >
                <Sparkles className="h-4 w-4" />
                Premium imkoniyatlarini ko'rish
              </Link>
              <button
                type="button"
                onClick={() => setPremiumBannerDismissed(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Yopish
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!hasEnoughAttempts && !data.isEmptyState && (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">Analitikani to'liq ko'rish uchun yana bir nechta test yeching.</p>
        </section>
      )}

      {data.isEmptyState ? (
        <section className="rounded-3xl border border-[#1F2A44] bg-[linear-gradient(180deg,#101a2e_0%,#0b1324_100%)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.26)]">
          <h2 className="text-xl font-semibold text-white">Analitika uchun hali yetarli ma'lumot yo'q.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Kamida bir nechta test yakunlang. Shundan keyin kuchli va zaif mavzular, tavsiya va trendlar shu yerda ko'rinadi.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/tests"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              <PlayCircle className="h-4 w-4" />
              Testni boshlash
            </Link>
            <Link
              href="/lessons"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Darslarni ko'rish
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
            <ScoreTrendChart data={data.scoreTrend} />
            <CategoryRadarChart data={data.categoryMetrics} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
            <TopicPerformanceCards data={data.weakTopicMetrics} />
            <QuestionBankMasteryCard
              totalQuestions={data.questionBankMastery.totalQuestions}
              seenQuestions={data.questionBankMastery.seenQuestions}
              correctQuestions={data.questionBankMastery.correctQuestions}
              masteredQuestions={data.questionBankMastery.masteredQuestions}
              needsReviewQuestions={data.questionBankMastery.needsReviewQuestions}
            />
          </section>

          <section id="premium-insights">
            <RecommendationCard
              recommendation={data.recommendation}
              lessons={data.lessonRecommendations}
              isPremium={isPremium}
            />
          </section>
        </>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-[320px] rounded-2xl" />;
}
