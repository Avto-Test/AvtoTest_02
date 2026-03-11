"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, RotateCcw, Zap } from "lucide-react";
import type { RecommendationInsight } from "@/analytics/types";

type LessonRec = {
    lessonId: string;
    title: string;
    reason: string;
    topic: string | null;
    contentType: string | null;
};

type Props = {
    recommendation: RecommendationInsight;
    lessonRecommendations: LessonRec[];
};

function RecommendationItem({
    icon,
    title,
    description,
    action,
    href,
    onAction,
    actionLoading,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action: string;
    href?: string;
    onAction?: () => void;
    actionLoading?: boolean;
}) {
    return (
        <div className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-cyan-400">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
                <div className="mt-4">
                    {href ? (
                        <a
                            href={href}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-all duration-300 hover:scale-[1.02] hover:bg-slate-200 active:scale-95 dark:bg-slate-700/50 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            {action}
                        </a>
                    ) : (
                        <button
                            type="button"
                            onClick={onAction}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-all duration-300 hover:scale-[1.02] hover:bg-slate-200 active:scale-95 disabled:opacity-50 dark:bg-slate-700/50 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            {actionLoading ? (
                                <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent dark:border-slate-200" />
                                    Yuklanmoqda...
                                </>
                            ) : (
                                <>{action}</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function RecommendationsZone({ recommendation, lessonRecommendations }: Props) {
    const router = useRouter();
    const [starting, setStarting] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);

    async function handleStartSession() {
        setStarting(true);
        setSessionError(null);
        try {
            const res = await fetch("/api/learning/session", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question_count: 20 }),
            });
            if (res.status === 401) {
                router.push("/login");
                return;
            }
            if (!res.ok) {
                setSessionError("Session yaratishda xatolik yuz berdi.");
                return;
            }
            const data = (await res.json()) as { session_id?: string };
            const sessionId = data.session_id ?? "";
            router.push(`/learning/session${sessionId ? `?id=${sessionId}` : ""}`);
        } catch {
            setSessionError("Tarmoq xatosi yuz berdi.");
        } finally {
            setStarting(false);
        }
    }

    return (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Tavsiyalar
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                    Keyingi qadamlar
                </h2>
            </div>

            <div className="space-y-4">
                {/* Weak topic practice */}
                {recommendation.topic && (
                    <RecommendationItem
                        icon={<Zap className="h-5 w-5" />}
                        title="Practice Weak Topics"
                        description={
                            recommendation.topic
                                ? `Sizning zaif mavzuingiz "${recommendation.topic}" (${Math.round(recommendation.accuracy ?? 0)}%).`
                                : "Sizda mashq qilish uchun zaif mavzular bor."
                        }
                        action="Practice Now"
                        href={
                            recommendation.topic
                                ? `/tests?topic=${encodeURIComponent(recommendation.topic)}`
                                : "/tests"
                        }
                    />
                )}

                {/* Lesson recommendations */}
                {lessonRecommendations.length > 0 && (
                    <RecommendationItem
                        icon={<BookOpen className="h-5 w-5" />}
                        title="Darsni ko'rib chiqing"
                        description={lessonRecommendations[0].reason || "Tavsiya etilgan dars mavjud."}
                        action="Darsga o'tish"
                        href={`/lessons/${lessonRecommendations[0].lessonId}`}
                    />
                )}

                {/* Review overdue */}
                <RecommendationItem
                    icon={<RotateCcw className="h-5 w-5" />}
                    title="Muddati o'tgan savollarni takrorlang"
                    description="Spaced repetition asosida takrorlash navbati keyingi mavzularni kuchaytiradi."
                    action="Takrorlashni boshlash"
                    href="/review-queue"
                />

                {/* Start learning session — primary CTA */}
                <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md dark:border-emerald-400/20 dark:bg-gradient-to-br dark:from-emerald-500/10 dark:to-cyan-500/10 text-center sm:text-left">
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Moslashuvchi Sessiya</h3>
                                <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-300">
                                    Zaif mavzularingiz asosida sun&apos;iy intellekt tomonidan tanlangan savollar bilan mashq qiling.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleStartSession()}
                                disabled={starting}
                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-95 disabled:opacity-60 dark:bg-gradient-to-r dark:from-emerald-400 dark:to-cyan-400 dark:text-slate-950 dark:shadow-none dark:hover:brightness-110"
                            >
                                {starting ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-slate-900" />
                                        Yaratilmoqda...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="h-4 w-4" />
                                        Start Learning Session
                                    </>
                                )}
                            </button>
                        </div>
                        {sessionError && (
                            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{sessionError}</p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
