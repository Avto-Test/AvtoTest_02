"use client";

type Props = {
    current: number;
    total: number;
    answered: number;
    timeLeft?: number;
};

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SessionProgress({ current, total, answered, timeLeft }: Props) {
    const progressPct = total > 0 ? (current / total) * 100 : 0;
    const answeredPct = total > 0 ? (answered / total) * 100 : 0;

    return (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {current} / {total}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">savol</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Javob berildi</p>
                        <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{answered}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="text-center">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Qoldi</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{total - answered}</p>
                    </div>
                    {timeLeft != null && timeLeft > 0 && (
                        <>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                            <div className="text-center">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Vaqt</p>
                                <p className={`text-sm font-bold tabular-nums transition-colors duration-300 ${timeLeft < 60 ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-200"}`}>
                                    {formatTime(timeLeft)}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 space-y-1.5">
                <div className="relative h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/60">
                    <div
                        className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-500 ease-out"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                {answered > 0 && (
                    <div className="relative h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/60">
                        <div
                            className="absolute left-0 top-0 h-full rounded-full bg-cyan-300 dark:bg-cyan-500/50 transition-all duration-500 ease-out"
                            style={{ width: `${answeredPct}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
