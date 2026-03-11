"use client";

import { memo, useMemo } from "react";

type Props = {
  totalQuestions: number;
  seenQuestions: number;
  correctQuestions: number;
  masteredQuestions: number;
  needsReviewQuestions: number;
};

function safeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}

function QuestionBankMasteryCardComponent({
  totalQuestions,
  seenQuestions,
  correctQuestions,
  masteredQuestions,
  needsReviewQuestions,
}: Props) {
  const stats = useMemo(() => {
    const total = safeCount(totalQuestions);
    const seen = Math.min(total, safeCount(seenQuestions));
    const correct = Math.min(seen, safeCount(correctQuestions));
    const mastered = Math.min(correct, safeCount(masteredQuestions));
    const review = Math.min(seen, safeCount(needsReviewQuestions));

    return {
      total,
      seen,
      correct,
      mastered,
      review,
      seenPercent: percent(seen, total),
      masteredPercent: percent(mastered, total),
      reviewPercent: percent(review, total),
    };
  }, [correctQuestions, masteredQuestions, needsReviewQuestions, seenQuestions, totalQuestions]);

  return (
    <section className="min-w-0 rounded-3xl border border-[#1F2A44] bg-gradient-to-b from-[#111a2f] to-[#0b1324] p-6 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Savollar bazasi</h3>
        <p className="text-sm text-slate-300">{"Ko'proq savollar ko'rish bilimni mustahkamlaydi."}</p>
      </div>

      <div className="rounded-2xl border border-[#22324e] bg-[#0f1b31]/90 p-4">
        <div className="mb-3 flex items-end justify-between gap-2">
          <p className="text-sm text-slate-300">{"Ko'rilgan savollar"}</p>
          <p className="text-xl font-bold text-white">
            {stats.seen} <span className="text-sm font-medium text-slate-400">/ {stats.total}</span>
          </p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800/90">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 transition-all duration-700"
            style={{ width: `${stats.seenPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">{Math.round(stats.seenPercent)}% savol bilan ishlangan</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatPill label="To'g'ri ishlangan" value={stats.correct} percent={percent(stats.correct, Math.max(1, stats.seen))} tone="emerald" />
        <StatPill label="O'zlashtirilgan" value={stats.mastered} percent={stats.masteredPercent} tone="indigo" />
        <StatPill label="Qayta ko'rish kerak" value={stats.review} percent={stats.reviewPercent} tone="amber" />
      </div>
    </section>
  );
}

function StatPill({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: number;
  percent: number;
  tone: "emerald" | "indigo" | "amber";
}) {
  const toneStyles: Record<typeof tone, string> = {
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    indigo: "border-indigo-400/30 bg-indigo-500/10 text-indigo-100",
    amber: "border-amber-300/35 bg-amber-500/10 text-amber-100",
  };

  return (
    <article className={`rounded-xl border px-3 py-2 ${toneStyles[tone]}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="text-xs opacity-90">{Math.round(percent)}%</p>
    </article>
  );
}

export default memo(QuestionBankMasteryCardComponent);
