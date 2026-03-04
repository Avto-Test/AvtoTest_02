"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, Crown } from "lucide-react";
import { memo } from "react";

type Recommendation = {
  topic: string | null;
  accuracy: number | null;
  actionLabel: string | null;
};

type LessonRecommendation = {
  lessonId: string;
  title: string;
  reason: string;
  topic: string | null;
  contentType: string | null;
};

type Props = {
  recommendation: Recommendation;
  lessons: LessonRecommendation[];
  isPremium: boolean;
};

function PremiumRecommendationCardV2Component({ recommendation, lessons, isPremium }: Props) {
  const topLesson = lessons[0];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#1F2A44] bg-[radial-gradient(120%_170%_at_10%_0%,rgba(56,189,248,0.18)_0%,rgba(11,19,36,0.95)_56%,#0B1324_100%)] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-5 w-5 text-cyan-300" />
            Bugungi tavsiya
          </h3>
          <p className="mt-1 text-sm text-slate-300">Qaysi mavzuni kuchaytirish orqali ehtimolni tezroq oshirish mumkin.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
          <Crown className="h-3.5 w-3.5" />
          Premium
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-2 rounded-2xl border border-[#22324e] bg-[#0f1b31]/90 p-4">
          <p className="text-sm text-slate-300">
            {recommendation.topic ? (
              <>
                Sizda <span className="font-semibold text-cyan-200">{recommendation.topic}</span> mavzusida
                {recommendation.accuracy !== null ? (
                  <>
                    {" "}
                    aniqlik <span className="font-semibold text-amber-300">{Math.round(recommendation.accuracy)}%</span>.
                  </>
                ) : (
                  "."
                )}{" "}
                Shu yo'nalishda mashqni ko'paytirish tavsiya etiladi.
              </>
            ) : (
              "Tavsiya uchun hali yetarli ma'lumot yo'q. Yana bir nechta test yeching."
            )}
          </p>
          {topLesson ? (
            <p className="text-sm text-slate-200">
              Dars tavsiyasi: <span className="font-semibold text-white">{topLesson.title}</span>
              {topLesson.topic ? <span className="text-cyan-200"> - {topLesson.topic}</span> : null}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tests/adaptive?count=20"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Shu mavzuda mashq qilish
            <ArrowRight className="h-4 w-4" />
          </Link>
          {isPremium ? (
            <Link
              href="/lessons"
              className="inline-flex items-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Tavsiya darsni ochish
            </Link>
          ) : (
            <Link
              href="/upgrade"
              className="inline-flex items-center rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
            >
              Premiumga o'tish
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(PremiumRecommendationCardV2Component);
