"use client";

import { memo, useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
  totalQuestions: number;
  seenQuestions: number;
  correctQuestions: number;
  masteredQuestions: number;
  needsReviewQuestions: number;
};

const COLORS = {
  unseen: "#1E293B",
  review: "#F59E0B",
  correct: "#10B981",
  mastered: "#6366F1",
};

function clampCount(value: number, min = 0): number {
  return Number.isFinite(value) ? Math.max(min, Math.round(value)) : min;
}

function QuestionBankMasteryCardComponent({
  totalQuestions,
  seenQuestions,
  correctQuestions,
  masteredQuestions,
  needsReviewQuestions,
}: Props) {
  const values = useMemo(() => {
    const total = clampCount(totalQuestions);
    const seen = Math.min(total, clampCount(seenQuestions));
    const mastered = Math.min(seen, clampCount(masteredQuestions));
    const correctOnly = Math.max(0, Math.min(seen - mastered, clampCount(correctQuestions) - mastered));
    const review = Math.max(0, Math.min(seen - mastered - correctOnly, clampCount(needsReviewQuestions)));
    const unseen = Math.max(0, total - (mastered + correctOnly + review));

    return {
      total,
      seen,
      mastered,
      correctOnly,
      review,
      unseen,
      seenPercent: total > 0 ? Math.round((seen / total) * 100) : 0,
      masteredPercent: total > 0 ? Math.round((mastered / total) * 100) : 0,
    };
  }, [totalQuestions, seenQuestions, masteredQuestions, correctQuestions, needsReviewQuestions]);

  const chartData = useMemo(
    () => [
      { key: "mastered", label: "O'zlashtirilgan", value: values.mastered, color: COLORS.mastered },
      { key: "correct", label: "To'g'ri ishlangan", value: values.correctOnly, color: COLORS.correct },
      { key: "review", label: "Qayta ko'rish kerak", value: values.review, color: COLORS.review },
      { key: "unseen", label: "Hali ko'rilmagan", value: values.unseen, color: COLORS.unseen },
    ].filter((item) => item.value > 0),
    [values]
  );

  return (
    <section className="rounded-3xl border border-[#1F2A44] bg-gradient-to-br from-[#111a2f] to-[#0b1324] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Test bazasi o'zlashtirish</h3>
        <p className="text-sm text-slate-300">Ko'proq savollar ko'rish bilimni mustahkamlaydi.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
        <div className="relative h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92} paddingAngle={2} strokeWidth={0}>
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0b1324",
                  border: "1px solid #1F2A44",
                  borderRadius: 12,
                  color: "#e2e8f0",
                }}
                formatter={(value, name) => [value, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-wide text-slate-400">O'zlashtirish</span>
            <span className="mt-1 text-2xl font-bold text-white">
              {values.mastered} / {values.total}
            </span>
            <span className="text-xs text-indigo-300">{values.masteredPercent}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
            Ko'rilgan savollar: <span className="font-semibold">{values.seen}</span> ({values.seenPercent}%)
          </div>
          <LegendItem label="O'zlashtirilgan" value={values.mastered} color={COLORS.mastered} />
          <LegendItem label="To'g'ri ishlangan" value={values.correctOnly} color={COLORS.correct} />
          <LegendItem label="Qayta ko'rish kerak" value={values.review} color={COLORS.review} />
          <LegendItem label="Hali ko'rilmagan" value={values.unseen} color={COLORS.unseen} />
        </div>
      </div>
    </section>
  );
}

function LegendItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#22324e] bg-[#0f1b31] px-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-slate-200">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </div>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

export default memo(QuestionBankMasteryCardComponent);

