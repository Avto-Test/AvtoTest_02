"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

type Props = {
    score: number;
    passed: boolean;
    passPredictionLabel?: string;
    totalQuestions: number;
    answeredCount: number;
    onRestart: () => void;
};

export default function SessionComplete({
    score,
    passed,
    passPredictionLabel,
    totalQuestions,
    answeredCount,
    onRestart,
}: Props) {
    const pct = Math.round(Math.max(0, Math.min(100, score)));

    return (
        <div className="mx-auto max-w-xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg transition-colors duration-300 dark:border-slate-700 dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900 dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
                {/* Icon */}
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
                    {passed ? (
                        <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-50 shadow-[0_0_32px_rgba(16,185,129,0.15)] dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:shadow-[0_0_32px_rgba(16,185,129,0.25)]">
                            <CheckCircle2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
                        </div>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-red-200 bg-red-50 shadow-[0_0_32px_rgba(239,68,68,0.1)] dark:border-red-400/50 dark:bg-red-500/15 dark:shadow-[0_0_32px_rgba(239,68,68,0.2)]">
                            <XCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
                        </div>
                    )}
                </div>

                {/* Result */}
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                    Sessiya natijasi
                </p>
                <h1 className="mt-2 text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {pct}%
                </h1>
                <p className={`mt-3 text-base font-semibold ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500"}`}>
                    {passed ? "Excellent work! You passed the session. 🎉" : "Great progress! Keep practicing weak topics."}
                </p>

                {passPredictionLabel && (
                    <span className="mt-4 inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-400/30 dark:bg-slate-500/15 dark:text-slate-300">
                        {passPredictionLabel}
                    </span>
                )}

                {/* Stats */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/50">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Javob berildi</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{answeredCount}</p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">/ {totalQuestions} savol</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/50">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ball</p>
                        <p className={`mt-1 text-2xl font-bold ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                            {pct}%
                        </p>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">umumiy natija</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        onClick={onRestart}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:bg-slate-50 active:scale-95 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/20"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Start New Session
                    </button>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md active:scale-95 dark:bg-gradient-to-r dark:from-sky-400 dark:to-emerald-400 dark:text-slate-950 dark:hover:brightness-110 dark:shadow-none"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
