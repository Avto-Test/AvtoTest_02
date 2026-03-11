"use strict";

import { Target } from "lucide-react";
import { ActivityPoint } from "@/analytics/types";

export function DailyGoalCard({ testActivity }: { testActivity: ActivityPoint[] }) {
    // testActivity is sorted chronological (oldest to newest day) typically, or we trust the last element is 'today' per the backend rules.
    // We'll grab the last element. If array is empty, it's 0 attempts today.
    const todayCount = testActivity.length > 0 ? testActivity[testActivity.length - 1].tests_count : 0;
    const goal = 5; // Default goal
    const progress = Math.min(100, (todayCount / goal) * 100);
    const isComplete = todayCount >= goal;

    return (
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                    <h3 className="font-semibold text-slate-900 dark:text-white">Bugungi maqsad</h3>
                </div>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {todayCount} / {goal}
                </span>
            </div>

            <div className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                {isComplete ? (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        Ajoyib! Bugungi maqsad bajarildi. 🎉
                    </span>
                ) : (
                    <span>{goal} ta test ishlashni yakunlang</span>
                )}
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${isComplete
                            ? "bg-emerald-500 dark:bg-emerald-400"
                            : "bg-indigo-500 dark:bg-indigo-500"
                        }`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
