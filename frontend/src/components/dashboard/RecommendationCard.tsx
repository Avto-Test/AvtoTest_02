"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { memo, useMemo } from "react";

import type { DashboardAnalyticsViewModel } from "@/analytics/types";
import { topicsMatch } from "@/lib/dashboardTopic";

type Props = {
  recommendation: DashboardAnalyticsViewModel["recommendation"];
  lessons: DashboardAnalyticsViewModel["lessonRecommendations"];
  isPremium: boolean;
};

function getReasoningLabel(reasoning: DashboardAnalyticsViewModel["recommendation"]["reasoning"]) {
  if (reasoning === "lowest_accuracy") {
    return "Aniqlik past";
  }
  if (reasoning === "low_coverage") {
    return "Qamrov past";
  }
  if (reasoning === "practice_recommended") {
    return "Mashq tavsiya etiladi";
  }
  return "Bugungi tavsiya";
}

function RecommendationCardComponent({ recommendation, lessons, isPremium }: Props) {
  const displayTopic = recommendation.topic || "Ma'lumot yetarli emas";
  const topLesson = useMemo(() => {
    if (!lessons.length) {
      return null;
    }

    if (!recommendation.topic) {
      return lessons[0];
    }

    return (
      lessons.find(
        (lesson) => topicsMatch(lesson.topic, recommendation.topic) || topicsMatch(lesson.reason, recommendation.topic)
      ) ?? lessons[0]
    );
  }, [lessons, recommendation.topic]);

  const practiceHref = recommendation.topic ? `/tests?topic=${encodeURIComponent(recommendation.topic)}` : "/tests";
  const lessonHref =
    topLesson?.topic || recommendation.topic
      ? `/lessons?topic=${encodeURIComponent(topLesson?.topic ?? recommendation.topic ?? "")}`
      : "/lessons";
  const accuracyLabel = recommendation.accuracy === null ? null : `${Math.round(recommendation.accuracy)}%`;
  const coverageLabel = recommendation.coverage === null ? null : `${Math.round(recommendation.coverage)}%`;
  const tone =
    recommendation.accuracy === null
      ? "border-slate-400/20 bg-slate-500/10 text-slate-200"
      : recommendation.accuracy < 30
      ? "border-red-400/30 bg-red-500/10 text-red-200"
      : recommendation.accuracy < 60
      ? "border-amber-300/30 bg-amber-500/10 text-amber-200"
      : recommendation.accuracy < 80
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : "border-teal-400/30 bg-teal-500/10 text-teal-100";

  return (
    <section
      aria-label="Bugungi tavsiya kartasi"
      className="relative overflow-hidden rounded-3xl border border-[#1F2A44] bg-[radial-gradient(120%_170%_at_10%_0%,rgba(56,189,248,0.18)_0%,rgba(11,19,36,0.95)_56%,#0B1324_100%)] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.28)]"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-5 w-5 text-cyan-300" />
            Bugungi tavsiya
          </h3>
          <p className="mt-1 text-sm text-slate-300">Keyingi mashq uchun eng muhim fokus mavzu.</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
          {getReasoningLabel(recommendation.reasoning)}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3 rounded-2xl border border-[#22324e] bg-[#0f1b31]/90 p-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-lg font-semibold text-cyan-200">{displayTopic}</p>
            {accuracyLabel ? <span className="text-base font-semibold text-amber-300">Aniqlik {accuracyLabel}</span> : null}
            {coverageLabel ? <span className="text-sm text-slate-400">Qamrov {coverageLabel}</span> : null}
          </div>
          <p className="text-sm leading-6 text-slate-300/88">{recommendation.explanation}</p>
          {topLesson ? (
            <p className="text-sm text-slate-200">
              Tavsiya dars: <span className="font-semibold text-white">{topLesson.title}</span>
              {topLesson.topic ? <span className="text-cyan-200"> - {topLesson.topic}</span> : null}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={practiceHref}
            aria-label={`${displayTopic} mavzusi bo'yicha mashq qilish`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            {recommendation.actionLabel || "Shu mavzuda mashq qilish"}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={lessonHref}
            aria-label={`${displayTopic} bo'yicha tavsiya darsni ochish`}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
          >
            <BookOpen className="h-4 w-4" />
            Tavsiya darsni ochish
          </Link>
        </div>
      </div>

      {isPremium ? (
        <div className="relative mt-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
          Premium tavsiya darajasi faol
        </div>
      ) : null}
    </section>
  );
}

const RecommendationCard = memo(RecommendationCardComponent);

export { RecommendationCard };
export default RecommendationCard;
