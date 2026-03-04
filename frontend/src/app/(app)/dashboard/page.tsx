"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { PlayCircle, RefreshCcw, TrendingUp } from "lucide-react";
import { useAuth } from "@/store/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardAnalytics } from "@/hooks/useDashboardAnalytics";

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
const DifficultyProgressionChart = dynamic(() => import("@/components/dashboard/DifficultyProgressionChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
const WeakTopicsBar = dynamic(() => import("@/components/dashboard/WeakTopicsBar"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, hasEnoughAttempts, refetch } = useDashboardAnalytics();

  const displayName = useMemo(() => {
    return user?.full_name || user?.email?.split("@")[0] || "Foydalanuvchi";
  }, [user?.full_name, user?.email]);

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
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
      <div className="p-4 md:p-6">
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#1F2A44] bg-[radial-gradient(120%_160%_at_8%_0%,rgba(14,116,144,0.25)_0%,rgba(11,19,36,0.92)_56%,#0B1324_100%)] p-6">
        <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_380px]">
          <div>
            <p className="text-sm text-cyan-200">Assalomu alaykum, {displayName}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Boshqaruv paneli</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              O'tish ehtimoli sizning test natijalaringiz, savollarni o'zlashtirish va rivojlanish trendi asosida hisoblanadi.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100">
                O'rtacha natija: {Math.round(data.averageScore)}%
              </span>
              <span className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-100">
                Urinishlar: {data.totalAttempts}
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100">
                <TrendingUp className="h-3.5 w-3.5" />
                O'sish: {data.improvementDelta.toFixed(1)}%
              </span>
            </div>

            <div className="mt-6">
              <Link
                href="/tests/adaptive?count=20"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                <PlayCircle className="h-4 w-4" />
                Testni boshlash
              </Link>
            </div>
          </div>

          <PassProbabilityGauge passProbability={data.passProbability} />
        </div>
      </section>

      {!hasEnoughAttempts && (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">Analitikani to'liq ko'rish uchun yana bir nechta test yeching.</p>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <ScoreTrendChart data={data.scoreTrend} />
        <CategoryRadarChart data={data.categoryPerformance} />
      </section>

      <section>
        {data.difficultyProgression.length > 0 ? (
          <DifficultyProgressionChart data={data.difficultyProgression} />
        ) : (
          <section className="rounded-2xl border border-[#1F2A44] bg-[#0B1324] p-6">
            <h3 className="text-lg font-semibold text-white">Qiyinlik dinamikasi</h3>
            <p className="mt-2 text-sm text-slate-400">
              Qiyinlik bo'yicha yetarli tarix to'planmagan. Bir nechta adaptive testni yakunlang.
            </p>
          </section>
        )}
      </section>

      <section>
        {data.weakTopics.length > 0 ? (
          <WeakTopicsBar data={data.weakTopics} />
        ) : (
          <section className="rounded-2xl border border-[#1F2A44] bg-[#0B1324] p-6">
            <h3 className="text-lg font-semibold text-white">Zaif mavzular</h3>
            <p className="mt-2 text-sm text-slate-400">Zaif mavzular aniqlanmadi yoki ma'lumot yetarli emas.</p>
          </section>
        )}
      </section>
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-[320px] rounded-2xl" />;
}
