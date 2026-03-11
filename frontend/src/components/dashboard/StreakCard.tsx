"use strict";

import { Flame } from "lucide-react";
import { ActivityPoint } from "@/analytics/types";

export function getStreakCount(testActivity: ActivityPoint[]): number {
    if (!testActivity || testActivity.length === 0) return 0;

    // The testActivity array is typically up to 14 days of history. 
    // Let's iterate backwards.
    // testActivity[testActivity.length - 1] is 'today'.
    // We allow the user to have 0 today IF they had >=1 yesterday, their streak hasn't "broken" entirely until tomorrow, 
    // but traditionally a currently active streak includes today or yesterday. 

    let currentStreak = 0;
    let isActive = false;

    // Starting from the last element (today)
    const todayIndex = testActivity.length - 1;
    const todayCount = testActivity[todayIndex].tests_count;
    const yesterdayCount = todayIndex > 0 ? testActivity[todayIndex - 1].tests_count : 0;

    if (todayCount > 0 || yesterdayCount > 0) {
        isActive = true;
    }

    if (!isActive) return 0;

    // Count backwards from today
    for (let i = todayIndex; i >= 0; i--) {
        if (testActivity[i].tests_count > 0) {
            currentStreak++;
        } else {
            // If we see a 0, we only break the streak if it's NOT today.
            // E.g., if today is 0 but yesterday was 1, we don't break, we just don't count today.
            if (i === todayIndex) {
                continue; // They have time to complete today's goal
            } else {
                break; // Streak is broken
            }
        }
    }

    return currentStreak;
}

export function StreakCard({ testActivity }: { testActivity: ActivityPoint[] }) {
    const streak = getStreakCount(testActivity);

    return (
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10 ${streak > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    <Flame className={`h-6 w-6 ${streak > 0 ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {"O'qish seriyasi"}
                    </h3>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                        {streak > 0 ? `${streak} kun` : "Boshlanmadi"}
                    </p>
                </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                {streak > 0
                    ? "Ajoyib! Har kuni test yechish orqali seriyani davom ettiring."
                    : "Bugun test ishlab, o'qish seriyangizni boshlang!"}
            </p>
        </div>
    );
}
