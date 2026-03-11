"use client";
/* eslint-disable react/no-unescaped-entities */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BookOpen,
  CircleAlert,
  Clock3,
  Flame,
  RefreshCcw,
  Play,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { fetchWithSessionRefresh } from "@/lib/fetch-with-session";
import { useAuth } from "@/store/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

type TrendPoint = { label: string; value: number };
type ActivityPoint = { label: string; tests_count: number };
type TopicAccuracy = {
  topic: string;
  accuracy: number;
  last_practiced_days?: number | null;
  last_practiced_at?: string | null;
};

type QuestionBankMastery = {
  total_questions: number;
  seen_questions: number;
  correct_questions: number;
  mastered_questions: number;
  needs_review_questions: number;
};

type PassProbabilityFactor = {
  key: string;
  label: string;
  weight: number;
  score: number;
  weighted_score: number;
};

type LessonRecommendation = {
  lesson_id: string;
  title: string;
  reason: string;
  match_score: number;
  content_url: string;
};

type UserAttemptSummary = {
  id: string;
  test_title: string;
  score: number;
  finished_at: string | null;
};

type DashboardOverview = {
  total_attempts: number;
  average_score: number;
  best_score: number;
  improvement_delta: number;
  improvement_direction: "up" | "down" | "stable";
  readiness_score: number;
  pass_probability: number;
  pass_prediction_label: string;
  last_attempts?: UserAttemptSummary[];
};

type DashboardApiResponse = {
  overview: DashboardOverview;
  recommendation?: { topic?: string; accuracy?: number; action_label?: string } | null;
  topic_breakdown: TopicAccuracy[];
  lesson_recommendations: LessonRecommendation[];
  progress_trend: TrendPoint[];
  test_activity: ActivityPoint[];
  question_bank_mastery: QuestionBankMastery;
  pass_probability_breakdown?: {
    explanation: string;
    factors: PassProbabilityFactor[];
  } | null;
};

const CATEGORY_ORDER = [
  "Yo'l belgilari",
  "Yo'l harakati qoidalari",
  "Chorrahalar",
  "Yo'l chiziqlari",
  "Haydovchi madaniyati",
] as const;

const MASTERY_COLORS = {
  seen: "#38bdf8",
  correct: "#34d399",
  mastered: "#818cf8",
  review: "#f59e0b",
};

const PASS_FACTOR_LABEL_MAP: Record<string, string> = {
  accuracy: "Test aniqligi",
  score_accuracy: "Test aniqligi",
  test_accuracy: "Test aniqligi",
  mastery: "Savollar bazasi o'zlashtirish",
  question_bank_mastery: "Savollar bazasi o'zlashtirish",
  category_balance: "Kategoriya balansi",
  stability: "Bilim barqarorligi",
  knowledge_stability: "Bilim barqarorligi",
  trend: "Rivojlanish trendi",
  improvement_trend: "Rivojlanish trendi",
  recent_trend: "Rivojlanish trendi",
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatDateLabel(iso: string | null) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
}

function normalizeFactorLabel(factor: PassProbabilityFactor) {
  const mappedByKey = PASS_FACTOR_LABEL_MAP[factor.key?.toLowerCase?.() ?? ""];
  if (mappedByKey) return mappedByKey;

  const normalizedLabel = factor.label?.toLowerCase?.().trim?.() ?? "";
  if (normalizedLabel.includes("accuracy")) return "Test aniqligi";
  if (normalizedLabel.includes("mastery")) return "Savollar bazasi o'zlashtirish";
  if (normalizedLabel.includes("category")) return "Kategoriya balansi";
  if (normalizedLabel.includes("stability")) return "Bilim barqarorligi";
  if (normalizedLabel.includes("trend")) return "Rivojlanish trendi";

  return factor.label || "Omil";
}

function getReadinessBadge(probability: number) {
  if (probability >= 90) {
    return {
      label: "Imtihonga tayyor",
      className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    };
  }
  if (probability >= 75) {
    return {
      label: "Yuqori tayyorgarlik",
      className: "border-indigo-400/40 bg-indigo-500/15 text-indigo-200",
    };
  }
  if (probability >= 50) {
    return {
      label: "O'rtacha tayyorgarlik",
      className: "border-cyan-400/40 bg-cyan-500/15 text-cyan-200",
    };
  }
  return {
    label: "Boshlovchi",
    className: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  };
}

function getMotivationMessage(probability: number) {
  if (probability < 50) return "Yaxshi boshlanish. Davom eting.";
  if (probability < 70) return "Barqaror rivojlanish kuzatilmoqda.";
  if (probability < 85) return "Siz imtihonga yaqinlashyapsiz.";
  return "Siz deyarli tayyorsiz.";
}

function daysBetween(left: Date, right: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const leftMid = new Date(left.getFullYear(), left.getMonth(), left.getDate()).getTime();
  const rightMid = new Date(right.getFullYear(), right.getMonth(), right.getDate()).getTime();
  return Math.round((leftMid - rightMid) / msPerDay);
}

function computePracticeStreak(attempts: UserAttemptSummary[]) {
  const validDates = attempts
    .map((attempt) => attempt.finished_at)
    .filter((iso): iso is string => Boolean(iso))
    .map((iso) => new Date(iso))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (validDates.length === 0) return 0;

  validDates.sort((a, b) => b.getTime() - a.getTime());
  const uniqueDayMap = new Map<string, Date>();
  for (const date of validDates) {
    const key = date.toISOString().slice(0, 10);
    if (!uniqueDayMap.has(key)) uniqueDayMap.set(key, date);
  }

  const uniqueDays = Array.from(uniqueDayMap.values()).sort((a, b) => b.getTime() - a.getTime());
  if (uniqueDays.length === 0) return 0;

  const today = new Date();
  const gapFromToday = daysBetween(today, uniqueDays[0]);
  if (gapFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i += 1) {
    const gap = daysBetween(uniqueDays[i - 1], uniqueDays[i]);
    if (gap === 1) streak += 1;
    else break;
  }

  return streak;
}

export default function DashboardV2Page() {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [forecastAnimated, setForecastAnimated] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const response = await fetchWithSessionRefresh("/api/analytics/dashboard", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });
        if (response.status === 401) {
          signOut();
          if (typeof window !== "undefined") {
            const next = `${window.location.pathname}${window.location.search}`;
            window.location.replace(`/login?next=${encodeURIComponent(next)}`);
          }
          return;
        }
        if (!response.ok) {
          throw new Error(`Dashboard API failed: ${response.status}`);
        }
        const payload = (await response.json()) as DashboardApiResponse;
        if (!active) return;
        setData(payload);
      } catch (error) {
        if (!active) return;
        console.error("Dashboard analytics yuklanmadi:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [signOut]);

  useEffect(() => {
    const timer = window.setTimeout(() => setForecastAnimated(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Foydalanuvchi";
  const overview = data?.overview;

  const passProbability = clamp(Number(overview?.pass_probability ?? 0));
  const readinessScore = clamp(Number(overview?.readiness_score ?? 0));
  const improvement = Number(overview?.improvement_delta ?? 0);
  const improvementDirection = overview?.improvement_direction ?? "stable";

  const categoryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data?.topic_breakdown ?? []) {
      map.set(item.topic, clamp(item.accuracy));
    }
    return map;
  }, [data?.topic_breakdown]);

  const categoryData = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        value: categoryMap.get(category) ?? 0,
      })),
    [categoryMap]
  );

  const weakCategories = useMemo(
    () => categoryData.filter((x) => x.value > 0 && x.value < 60).sort((a, b) => a.value - b.value),
    [categoryData]
  );

  const categoryAverage = useMemo(() => {
    const values = categoryData.map((x) => x.value);
    if (values.length === 0) return 0;
    return values.reduce((sum, current) => sum + current, 0) / values.length;
  }, [categoryData]);

  const mastery = useMemo(
    () =>
      data?.question_bank_mastery ?? {
        total_questions: 0,
        seen_questions: 0,
        correct_questions: 0,
        mastered_questions: 0,
        needs_review_questions: 0,
      },
    [data?.question_bank_mastery]
  );

  const masteryMetrics = useMemo(() => {
    const total = Math.max(1, mastery.total_questions);
    return [
      {
        key: "seen",
        label: "Ko'rilgan savollar",
        color: MASTERY_COLORS.seen,
        value: mastery.seen_questions,
        percent: clamp((mastery.seen_questions / total) * 100),
      },
      {
        key: "correct",
        label: "To'g'ri ishlangan",
        color: MASTERY_COLORS.correct,
        value: mastery.correct_questions,
        percent: clamp((mastery.correct_questions / total) * 100),
      },
      {
        key: "mastered",
        label: "O'zlashtirilgan",
        color: MASTERY_COLORS.mastered,
        value: mastery.mastered_questions,
        percent: clamp((mastery.mastered_questions / total) * 100),
      },
      {
        key: "review",
        label: "Qayta ko'rish kerak",
        color: MASTERY_COLORS.review,
        value: mastery.needs_review_questions,
        percent: clamp((mastery.needs_review_questions / total) * 100),
      },
    ];
  }, [mastery]);

  const passFactors = useMemo(
    () => [...(data?.pass_probability_breakdown?.factors ?? [])].sort((a, b) => b.weighted_score - a.weighted_score),
    [data?.pass_probability_breakdown?.factors]
  );
  const maxFactorScore = useMemo(
    () => Math.max(1, ...passFactors.map((factor) => Number(factor.weighted_score || 0))),
    [passFactors]
  );

  const passExplanation =
    "O'tish ehtimoli sizning test natijalaringiz, savollarni o'zlashtirish va rivojlanish trendi asosida hisoblanadi.";

  const trendSeries = data?.progress_trend?.length
    ? data.progress_trend
    : [{ label: "Boshlanish", value: 0 }];

  const lastTrendIndex = trendSeries.length - 1;

  const activitySeries = data?.test_activity?.length
    ? data.test_activity
    : [{ label: "Bugun", tests_count: 0 }];

  const recentAttempts = useMemo(() => overview?.last_attempts ?? [], [overview?.last_attempts]);
  const lessons = data?.lesson_recommendations ?? [];

  const signedTrendDelta =
    improvementDirection === "down"
      ? -Math.abs(improvement)
      : improvementDirection === "up"
      ? Math.abs(improvement)
      : 0;

  const readinessForecast = useMemo(
    () =>
      [
        { label: "Bugun", multiplier: 0 },
        { label: "3 kun", multiplier: 1.3 },
        { label: "1 hafta", multiplier: 2.9 },
        { label: "2 hafta", multiplier: 4.8 },
      ].map((point) => ({
        ...point,
        value:
          point.multiplier === 0
            ? passProbability
            : clamp(passProbability + signedTrendDelta * point.multiplier),
      })),
    [passProbability, signedTrendDelta]
  );

  const weakestTopic = useMemo(() => {
    if (weakCategories.length > 0) return weakCategories[0];
    return [...categoryData].sort((a, b) => a.value - b.value)[0] ?? { category: "Mavzu", value: 0 };
  }, [weakCategories, categoryData]);

  const readinessBadge = useMemo(() => getReadinessBadge(passProbability), [passProbability]);
  const motivationMessage = useMemo(() => getMotivationMessage(passProbability), [passProbability]);
  const estimatedGain = useMemo(() => {
    const rawGain = Math.round((100 - clamp(weakestTopic.value)) * 0.12);
    return Math.max(2, Math.min(12, rawGain));
  }, [weakestTopic.value]);

  const practiceStreakDays = useMemo(() => computePracticeStreak(recentAttempts), [recentAttempts]);

  const decayCandidates = useMemo(() => {
    const now = new Date();
    return (data?.topic_breakdown ?? [])
      .map((topic) => {
        let daysAgo = topic.last_practiced_days ?? null;

        if (daysAgo == null && topic.last_practiced_at) {
          const parsed = new Date(topic.last_practiced_at);
          if (!Number.isNaN(parsed.getTime())) {
            daysAgo = Math.max(0, daysBetween(now, parsed));
          }
        }

        if (daysAgo == null) {
          daysAgo = Math.round(5 + (100 - clamp(topic.accuracy)) / 6);
        }

        return {
          topic: topic.topic,
          daysAgo: Math.max(0, Math.round(daysAgo)),
          accuracy: clamp(topic.accuracy),
        };
      })
      .filter((item) => item.daysAgo >= 7)
      .sort((a, b) => b.daysAgo - a.daysAgo)
      .slice(0, 4);
  }, [data?.topic_breakdown]);

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,#0a1732_0%,#0f2345_48%,#12355a_100%)] p-6 shadow-[0_28px_90px_rgba(2,6,23,0.5)]">
        <div className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-[-120px] h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_420px]">
          <div className="space-y-5">
            <p className="text-sm font-medium text-cyan-200/95">Assalomu alaykum, {displayName}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Boshqaruv paneli</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              O'tish ehtimoli sizning test natijalaringiz, savollarni o'zlashtirish va rivojlanish
              trendi asosida hisoblanadi. Zaif yo'nalishlarni mustahkamlab ehtimolni tezroq oshiring.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricChip label="O'tish ehtimoli" value={`${Math.round(passProbability)}%`} />
              <MetricChip label="Tayyorgarlik darajasi" value={`${Math.round(readinessScore)}%`} />
              <MetricChip
                label="Trend o'zgarishi"
                value={
                  improvementDirection === "up"
                    ? `+${Math.abs(improvement).toFixed(1)}%`
                    : improvementDirection === "down"
                    ? `-${Math.abs(improvement).toFixed(1)}%`
                    : `${Math.abs(improvement).toFixed(1)}%`
                }
                icon={
                  improvementDirection === "down" ? (
                    <TrendingDown className="h-4 w-4 text-amber-300" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-emerald-300" />
                  )
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/tests/adaptive?count=20"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-300 via-cyan-300 to-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.28)] transition hover:brightness-110"
              >
                <Play className="h-4 w-4" />
                Testni boshlash
              </Link>
              <span className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
                So'nggi natija: {Math.round(overview?.average_score ?? 0)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/35 p-4 backdrop-blur-md">
            <HeroProgressRing
              value={passProbability}
              label="Imtihondan o'tish ehtimoli"
              readinessBadge={readinessBadge}
              motivationMessage={motivationMessage}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-white">Imtihonga tayyorlik prognozi</h2>
            <p className="text-sm text-slate-400">Doimiy mashq bilan ehtimol qanday o'zgarishi ko'rsatiladi</p>
          </header>
          <div className="space-y-3">
            {readinessForecast.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-100">{item.label}</span>
                  <span className="text-sm font-semibold text-cyan-300">{Math.round(item.value)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 transition-all duration-700"
                    style={{ width: `${forecastAnimated ? item.value : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Prognoz so'nggi natijalar va rivojlanish trendiga asoslanadi.
          </p>
        </article>

        <article className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-300" />
              <h3 className="text-base font-semibold text-white">{practiceStreakDays} kunlik mashq seriyasi</h3>
            </div>
            {practiceStreakDays > 0 ? (
              <p className="mt-2 text-sm text-amber-100/90">Har kuni mashq qilish bilimni mustahkamlaydi.</p>
            ) : (
              <p className="mt-2 text-sm text-amber-100/90">Bugun mashq qilib yangi seriyani boshlang.</p>
            )}
          </div>

          <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
            <h3 className="text-base font-semibold text-white">Ehtimolni tez oshirish</h3>
            <p className="mt-2 text-sm text-cyan-100">
              {weakestTopic.category} — {Math.round(weakestTopic.value)}%
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Bu mavzuni mustahkamlash ehtimolni oshirishi mumkin.
            </p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-sm font-semibold text-emerald-300">
              <TrendingUp className="h-4 w-4" />
              +{estimatedGain}% ehtimol o'sishi mumkin
            </div>
            <Link
              href={`/tests/adaptive?count=20&focus=${encodeURIComponent(weakestTopic.category)}`}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              Shu mavzuda mashq qilish
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm xl:col-span-2">
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-white">Rivojlanish trendi</h2>
            <p className="text-sm text-slate-400">So'nggi testlar bo'yicha natija dinamikasi</p>
          </header>

          <div className="h-72 rounded-xl bg-slate-950/35 p-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <AreaChart data={trendSeries} margin={{ top: 16, right: 14, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    color: "#e2e8f0",
                  }}
                  formatter={(value) => [`${Math.round(Number(value ?? 0))}%`, "Natija"]}
                />
                <Area type="monotone" dataKey="value" stroke="none" fill="url(#trendFill)" />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="url(#trendStroke)"
                  strokeWidth={3}
                  fill="none"
                  dot={(props: { cx?: number; cy?: number; index?: number }) => {
                    if (props.cx === undefined || props.cy === undefined || props.index === undefined) return null;
                    if (props.index !== lastTrendIndex) {
                      return <circle cx={props.cx} cy={props.cy} r={3.5} fill="#22d3ee" opacity={0.55} />;
                    }
                    return (
                      <g>
                        <circle cx={props.cx} cy={props.cy} r={11} fill="#22d3ee" opacity={0.2} />
                        <circle cx={props.cx} cy={props.cy} r={5} fill="#22d3ee" stroke="#cffafe" strokeWidth={2} />
                      </g>
                    );
                  }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-white">Test faolligi</h2>
            <p className="text-sm text-slate-400">Kunlik yechilgan testlar soni</p>
          </header>
          <div className="h-72 rounded-xl bg-slate-950/35 p-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <BarChart data={activitySeries} margin={{ top: 14, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    color: "#e2e8f0",
                  }}
                  formatter={(value) => [Number(value ?? 0), "Test soni"]}
                />
                <Bar
                  dataKey="tests_count"
                  fill="url(#activityBar)"
                  radius={[10, 10, 0, 0]}
                  activeBar={{ fill: "#38bdf8", opacity: 1 }}
                  animationDuration={700}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-white">Savollar banki o'zlashtirish</h2>
            <p className="text-sm text-slate-400">Ko'rilgan, to'g'ri ishlangan, o'zlashtirilgan va qayta ko'rish holati</p>
          </header>
          <MasteryRingPanel mastery={mastery} metrics={masteryMetrics} />
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm xl:col-span-2">
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-white">Kategoriyalar bo'yicha o'zlashtirish</h2>
            <p className="text-sm text-slate-400">Zaif mavzular issiq ranglarda ajratib ko'rsatiladi</p>
          </header>
          <CloverMasteryChart data={categoryData} average={categoryAverage} />
          {weakCategories.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <p className="mb-1 font-medium">Diqqat kerak bo'lgan mavzular:</p>
              <ul className="space-y-1">
                {weakCategories.map((item) => (
                  <li key={item.category}>- {item.category}: {Math.round(item.value)}%</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              Barcha asosiy yo'nalishlarda natija barqaror.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm xl:col-span-2">
          <header className="mb-3 flex items-center gap-2">
            <CircleAlert className="h-5 w-5 text-sky-300" />
            <h2 className="text-lg font-semibold text-white">O'tish ehtimoli tarkibi</h2>
          </header>
          <p className="mb-4 text-sm text-slate-400">{passExplanation}</p>
          {passFactors.length > 0 ? (
            <div className="space-y-3">
              {passFactors.map((factor) => (
                <div key={factor.key} className="rounded-xl border border-slate-700/60 bg-slate-950/35 p-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-100">{normalizeFactorLabel(factor)}</span>
                    <span className="text-slate-300">
                      {factor.weighted_score.toFixed(1)} ball (ulushi {factor.weight}%)
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-300 transition-all duration-500"
                      style={{ width: `${clamp((Number(factor.weighted_score || 0) / maxFactorScore) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard text="O'tish ehtimoli omillari uchun yetarli ma'lumot to'planmadi." />
          )}
        </article>

        <div className="space-y-6 xl:col-span-1">
          <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
            <header className="mb-3 flex items-center gap-2">
              <RefreshCcw className="h-5 w-5 text-amber-300" />
              <div>
                <h2 className="text-lg font-semibold text-white">Bilimni yangilash ogohlantirishi</h2>
                <p className="text-sm text-slate-400">Qayta mashq qilish tavsiya etiladigan mavzular</p>
              </div>
            </header>
            {decayCandidates.length > 0 ? (
              <div className="space-y-2">
                {decayCandidates.map((item) => (
                  <div
                    key={item.topic}
                    className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3"
                  >
                    <p className="text-sm font-medium text-amber-100">{item.topic}</p>
                    <p className="mt-1 text-xs text-amber-200/90">Oxirgi mashq: {item.daysAgo} kun oldin</p>
                  </div>
                ))}
                <p className="pt-1 text-xs text-slate-300">
                  Bilimni saqlash uchun qayta mashq tavsiya etiladi.
                </p>
              </div>
            ) : (
              <EmptyCard text="Barcha mavzular yaqinda mashq qilingan." />
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
            <header className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Tavsiya etilgan darslar</h2>
                <p className="text-sm text-slate-400">Zaif mavzular asosida</p>
              </div>
              <BookOpen className="h-5 w-5 text-sky-300" />
            </header>
            {lessons.length > 0 ? (
              <div className="space-y-3">
                {lessons.slice(0, 4).map((lesson) => (
                  <a
                    key={lesson.lesson_id}
                    href={lesson.content_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between rounded-xl border border-slate-700/70 bg-slate-950/40 p-3 transition hover:border-sky-500/40"
                  >
                    <div>
                      <p className="font-medium text-white">{lesson.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{lesson.reason}</p>
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 text-sky-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                ))}
              </div>
            ) : (
              <EmptyCard text="Hozircha tavsiya shakllanmadi." />
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
            <header className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">So'nggi faoliyat</h2>
                <p className="text-sm text-slate-400">Yaqinda ishlangan testlar</p>
              </div>
              <Clock3 className="h-5 w-5 text-cyan-300" />
            </header>
            {recentAttempts.length > 0 ? (
              <div className="space-y-2">
                {recentAttempts.slice(0, 6).map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{attempt.test_title}</p>
                      <p className="text-xs text-slate-400">{formatDateLabel(attempt.finished_at)}</p>
                    </div>
                    <span className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-sky-300">
                      {attempt.score}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyCard text="Birinchi testni boshlang va natijalarni kuzating." />
            )}
          </article>
        </div>
      </section>
    </div>
  );
}

function HeroProgressRing({
  value,
  label,
  readinessBadge,
  motivationMessage,
}: {
  value: number;
  label: string;
  readinessBadge: { label: string; className: string };
  motivationMessage: string;
}) {
  const [animated, setAnimated] = useState(false);
  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const progress = clamp(value);
  const visibleProgress = animated ? progress : 0;
  const offset = circumference - (visibleProgress / 100) * circumference;

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimated(true), 90);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative h-52 w-52">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 220 220">
          <defs>
            <linearGradient id="heroRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r={radius} fill="none" stroke="#1e293b" strokeWidth="16" />
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="url(#heroRing)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl font-bold text-white">{Math.round(visibleProgress)}%</p>
          <p className="mt-1 max-w-[130px] text-center text-[11px] leading-4 text-slate-300">{label}</p>
        </div>
      </div>
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${readinessBadge.className}`}>
        {readinessBadge.label}
      </span>
      <p className="max-w-xs text-center text-xs leading-5 text-slate-300">
        O'tish ehtimoli sizning test natijalaringiz, savollarni o'zlashtirish va rivojlanish trendi asosida hisoblanadi.
      </p>
      <p className="text-center text-xs font-medium text-cyan-200">{motivationMessage}</p>
    </div>
  );
}

function MasteryRingPanel({
  mastery,
  metrics,
}: {
  mastery: QuestionBankMastery;
  metrics: Array<{ key: string; label: string; color: string; value: number; percent: number }>;
}) {
  const totalMetricValue = Math.max(
    1,
    metrics.reduce((sum, metric) => sum + Math.max(0, metric.value), 0)
  );

  const donutData = metrics.map((metric) => ({
    ...metric,
    donutValue: Math.max(0, metric.value),
    donutPercent: ((Math.max(0, metric.value) / totalMetricValue) * 100).toFixed(1),
  }));

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
      <div className="relative mx-auto flex h-72 w-72 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-950/40">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
          <PieChart>
            <Pie
              data={donutData}
              dataKey="donutValue"
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={102}
              startAngle={90}
              endAngle={-270}
              cornerRadius={8}
              paddingAngle={2}
              isAnimationActive
              animationDuration={800}
            >
              {donutData.map((metric) => (
                <Cell key={metric.key} fill={metric.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#020617",
                border: "1px solid #1e293b",
                borderRadius: 12,
                color: "#e2e8f0",
              }}
              formatter={(value, _name, item) => {
                const payload = item?.payload as { donutPercent?: string } | undefined;
                return [`${Number(value ?? 0)} (${payload?.donutPercent ?? "0"}%)`, "Miqdor"];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">O'zlashtirish</p>
          <p className="text-xl font-semibold text-white">
            {mastery.mastered_questions} / {mastery.total_questions}
          </p>
          <p className="text-xs text-slate-400">O'zlashtirilgan / Jami</p>
        </div>
      </div>
      <div className="space-y-2">
        {donutData.map((metric) => (
          <div key={metric.key} className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm text-slate-100">{metric.label}</p>
              <p className="text-sm font-semibold text-white">
                {metric.value} <span className="text-xs text-slate-400">({metric.donutPercent}%)</span>
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${metric.percent}%`,
                  backgroundColor: metric.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CloverMasteryChart({
  data,
  average,
}: {
  data: Array<{ category: string; value: number }>;
  average: number;
}) {
  const [animated, setAnimated] = useState(false);
  const size = 320;
  const center = size / 2;
  const baseLength = 46;
  const variableLength = 84;
  const spread = 30;

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setAnimated(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-950/35 p-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[320px] w-full max-w-[420px]">
        <style>
          {`
            @keyframes cloverPulse {
              0% { filter: drop-shadow(0 0 0 rgba(251, 191, 36, 0)); }
              50% { filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.68)); }
              100% { filter: drop-shadow(0 0 0 rgba(251, 191, 36, 0)); }
            }
          `}
        </style>
        <defs>
          <radialGradient id="cloverCenterGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="cloverStrongPetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.34" />
          </linearGradient>
          <linearGradient id="cloverWeakPetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        <circle cx={center} cy={center} r={112} fill="url(#cloverCenterGlow)" />

        {data.map((item, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / data.length;
          const dirX = Math.cos(angle);
          const dirY = Math.sin(angle);
          const perpX = -dirY;
          const perpY = dirX;
          const len = baseLength + (clamp(item.value) / 100) * variableLength;

          const tipX = center + dirX * len;
          const tipY = center + dirY * len;
          const leftCx = center + dirX * (len * 0.55) + perpX * spread;
          const leftCy = center + dirY * (len * 0.55) + perpY * spread;
          const rightCx = center + dirX * (len * 0.55) - perpX * spread;
          const rightCy = center + dirY * (len * 0.55) - perpY * spread;

          const weak = item.value < 60;
          const veryWeak = item.value < 50;
          const fillColor = weak ? "url(#cloverWeakPetal)" : "url(#cloverStrongPetal)";
          const strokeColor = weak ? "rgba(251,191,36,0.95)" : "rgba(34,211,238,0.9)";
          const labelX = center + dirX * (len + 18);
          const labelY = center + dirY * (len + 18);
          const categoryLabel = item.category.length > 20 ? `${item.category.slice(0, 19)}…` : item.category;

          return (
            <g key={item.category}>
              <path
                d={`M ${center} ${center} Q ${leftCx} ${leftCy} ${tipX} ${tipY} Q ${rightCx} ${rightCy} ${center} ${center} Z`}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="1.4"
                filter={weak ? "url(#softGlow)" : undefined}
                style={{
                  opacity: animated ? 1 : 0,
                  transform: animated ? "scale(1)" : "scale(0.86)",
                  transformOrigin: `${center}px ${center}px`,
                  transition: `opacity 520ms ease ${index * 90}ms, transform 720ms cubic-bezier(0.2, 0.7, 0.2, 1) ${index * 90}ms`,
                  animation: veryWeak ? "cloverPulse 1.8s ease-in-out infinite" : undefined,
                }}
              />
              <text x={labelX} y={labelY - 8} fill="#94a3b8" textAnchor="middle" fontSize="9.5">
                {categoryLabel}
              </text>
              <text x={labelX} y={labelY + 7} fill="#cbd5e1" textAnchor="middle" fontSize="11" fontWeight="600">
                {Math.round(item.value)}%
              </text>
            </g>
          );
        })}

        <circle cx={center} cy={center} r={38} fill="#0b1220" stroke="#334155" strokeWidth="1.5" />
        <text x={center} y={center - 4} fill="#e2e8f0" textAnchor="middle" fontSize="11">
          O'rtacha
        </text>
        <text x={center} y={center + 16} fill="#22d3ee" textAnchor="middle" fontSize="20" fontWeight="700">
          {Math.round(average)}%
        </text>
      </svg>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((item) => (
          <div key={item.category} className="rounded-lg border border-slate-700/70 bg-slate-900/55 px-3 py-2 text-xs text-slate-300">
            <span className="block truncate">{item.category}</span>
            <span className={`font-semibold ${item.value < 60 ? "text-amber-300" : "text-cyan-300"}`}>
              {Math.round(item.value)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-100">
        {icon}
        {value}
      </p>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm leading-6 text-slate-400">
      {text}
    </div>
  );
}

