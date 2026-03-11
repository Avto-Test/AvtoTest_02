"use strict";

import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface Props {
    passProbability: number;
}

export function MotivationBanner({ passProbability }: Props) {
    // Configured heuristics
    // if passProbability < 0.6 => encourage practice
    // if passProbability > 0.8 => encourage exam readiness

    // Notice: Requirements state probability comparing to 0.6 and 0.8. 
    // In our system, passProbability format is 0-100 (e.g., 60 and 80).
    const prob = passProbability;

    if (prob < 60) {
        return (
            <div className="flex w-full items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm transition-all duration-300 hover:shadow-md dark:border-indigo-500/30 dark:bg-indigo-500/10">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                            Yana 3 ta test ishlasangiz ehtimolingiz 60% ga chiqishi mumkin.
                        </p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300">
                            {"O'zlashtirishni kuchaytirishda davom eting!"}
                        </p>
                    </div>
                </div>
                <Link
                    href="/learning/session"
                    className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                    Mashq qilish
                </Link>
            </div>
        );
    }

    if (prob > 80) {
        return (
            <div className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm transition-all duration-300 hover:shadow-md dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                            Ajoyib natija! Siz imtihonga deyarli tayyorsiz.
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                            {"Bilimlarni sinovdan o'tkazish uchun bosim ostida ishlab ko'ring."}
                        </p>
                    </div>
                </div>
                <Link
                    href="/tests/pressure?count=20"
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                    Sinov testi <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        );
    }

    // Medium probability (60-80) banner
    return (
        <div className="flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm transition-all duration-300 hover:shadow-md dark:border-blue-500/30 dark:bg-blue-500/10">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        {"O'tish ehtimolingiz o'smoqda."}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        {"Yana biroz amaliyot bilan kuchli natijaga erishasiz!"}
                    </p>
                </div>
            </div>
        </div>
    );
}
