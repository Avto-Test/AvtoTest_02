"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import type { CategoryMetric } from "@/analytics/types";

type Props = {
    topics: CategoryMetric[];
};

function AccuracyBar({ accuracy }: { accuracy: number }) {
    const clamp = Math.max(0, Math.min(100, accuracy));
    const pct = Math.round(clamp);

    // Smooth transition width for the bar
    // Color logic
    let colorClass = "bg-emerald-500 dark:bg-emerald-400";
    if (pct < 40) colorClass = "bg-red-500 dark:bg-red-400";
    else if (pct < 70) colorClass = "bg-amber-500 dark:bg-amber-400";

    return (
        <div className="flex items-center gap-3">
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/60">
                <div
                    className={`absolute left-0 top-0 h-full rounded-full ${colorClass} transition-all duration-700 ease-out`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-300">
                {pct}%
            </span>
        </div>
    );
}

function TopicCard({ topic }: { topic: CategoryMetric }) {
    const pct = Math.round(Math.max(0, Math.min(100, topic.accuracy)));
    const levelColor =
        pct < 40
            ? "text-red-700 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-400/30 dark:bg-red-500/10"
            : pct < 70
                ? "text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-400 dark:border-amber-400/30 dark:bg-amber-500/10"
                : "text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-400/30 dark:bg-emerald-500/10";

    return (
        <div className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
            <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{topic.category}</p>
                        {topic.attempts != null && (
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                {topic.attempts} urinish
                            </p>
                        )}
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors ${levelColor}`}>
                        {pct}%
                    </span>
                </div>

                <AccuracyBar accuracy={topic.accuracy} />
            </div>

            <Link
                href={`/tests?topic=${encodeURIComponent(topic.category)}`}
                className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-all duration-300 hover:scale-[1.02] hover:bg-slate-200 active:scale-95 dark:bg-slate-700/50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
                <Zap className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                Mashq qilish
            </Link>
        </div>
    );
}

export default function WeakTopicsZone({ topics }: Props) {
    if (topics.length === 0) {
        return (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Zaif Mavzular
                </p>
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
                    <span className="mb-3 text-3xl">🎯</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Zaif mavzular aniqlanmadi</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Ko&apos;proq test yeching va zaif joylar bu yerda ko&apos;rinadi.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        Zaif Mavzular
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                        E&apos;tibor talab qiluvchi sohalar
                    </h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-300">
                    {topics.length} mavzu
                </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {topics.map((topic) => (
                    <TopicCard key={topic.id ?? topic.category} topic={topic} />
                ))}
            </div>
        </section>
    );
}
