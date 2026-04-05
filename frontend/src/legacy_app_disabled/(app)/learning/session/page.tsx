"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

import { useLearningSession } from "@/hooks/useLearningSession";
import SessionProgress from "@/components/learning/SessionProgress";
import SessionQuestion from "@/components/learning/SessionQuestion";
import SessionComplete from "@/components/learning/SessionComplete";

export default function LearningSessionPage() {
    const router = useRouter();
    useSearchParams();

    const {
        session,
        currentIdx,
        answers,
        answeredCount,
        totalCount,
        loading,
        submitting,
        error,
        completed,
        result,
        startSession,
        answerQuestion,
        goToQuestion,
        submitSession,
    } = useLearningSession();

    const hasFetched = useRef(false);
    const [timeLeft, setTimeLeft] = useState(0);

    // Auto-start session
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        void (async () => {
            const sess = await startSession(20);
            if (sess) {
                setTimeLeft(sess.questions.length * 60);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!session || completed) return;
        if (timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((t) => Math.max(0, t - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [session, completed, timeLeft]);

    function handleRestart() {
        hasFetched.current = false;
        void (async () => {
            const sess = await startSession(20);
            if (sess) setTimeLeft(sess.questions.length * 60);
        })();
    }

    // Wrap the returned component in a themed container
    const Container = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-[calc(100vh-80px)] w-full bg-slate-50 transition-colors duration-300 dark:bg-[#0b1324] dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-px">
            {children}
        </div>
    );

    // Loading skeleton
    if (loading) {
        return (
            <Container>
                <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
                    <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                        ))}
                    </div>
                </div>
            </Container>
        );
    }

    // Error state
    if (error && !session) {
        return (
            <Container>
                <div className="mx-auto max-w-lg px-4 py-16 text-center">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-8 shadow-sm dark:border-red-400/30 dark:bg-red-500/10 dark:shadow-none">
                        <p className="mb-4 text-3xl">⚠️</p>
                        <p className="text-lg font-semibold text-red-900 dark:text-white">Xatolik yuz berdi</p>
                        <p className="mt-2 text-sm text-red-700 dark:text-red-200">{error}</p>
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <button
                                type="button"
                                onClick={handleRestart}
                                className="rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-300/30 dark:bg-red-500/10 dark:text-red-100 dark:hover:bg-red-500/20"
                            >
                                Qayta urinish
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push("/dashboard")}
                                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:scale-[1.02] active:scale-95 dark:bg-gradient-to-r dark:from-sky-400 dark:to-emerald-400 dark:text-slate-950 dark:hover:brightness-110"
                            >
                                Dashboardga qaytish
                            </button>
                        </div>
                    </div>
                </div>
            </Container>
        );
    }

    // Completed
    if (completed && result) {
        return (
            <Container>
                <div className="px-4 py-12">
                    <SessionComplete
                        score={result.score}
                        passed={result.passed}
                        passPredictionLabel={result.pass_prediction_label}
                        totalQuestions={totalCount}
                        answeredCount={answeredCount}
                        onRestart={handleRestart}
                    />
                </div>
            </Container>
        );
    }

    if (!session) return null;

    const currentQuestion = session.questions[currentIdx];
    const isLast = currentIdx === totalCount - 1;
    const allAnswered = answeredCount === totalCount;

    return (
        <Container>
            <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI Moslashuvchi Sessiya</h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Zaif mavzular asosida tanlangan savollar</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard")}
                        className="text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        ← Chiqish
                    </button>
                </div>

                {/* Progress */}
                <SessionProgress
                    current={currentIdx + 1}
                    total={totalCount}
                    answered={answeredCount}
                    timeLeft={timeLeft}
                />

                {/* Question */}
                {currentQuestion && (
                    <SessionQuestion
                        question={currentQuestion}
                        questionNumber={currentIdx + 1}
                        selectedOptionId={answers[currentQuestion.id]}
                        onAnswer={answerQuestion}
                    />
                )}

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pt-4">
                    <button
                        type="button"
                        onClick={() => goToQuestion(Math.max(0, currentIdx - 1))}
                        disabled={currentIdx === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:shadow-none dark:hover:bg-slate-700/50"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Oldingi
                    </button>

                    {/* Question dots */}
                    <div className="flex flex-wrap justify-center gap-2 px-2">
                        {session.questions.map((q, idx) => (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => goToQuestion(idx)}
                                className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${idx === currentIdx
                                    ? "scale-125 bg-blue-500 dark:bg-cyan-400"
                                    : answers[q.id]
                                        ? "bg-emerald-500 dark:bg-emerald-400/70"
                                        : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
                                    }`}
                            />
                        ))}
                    </div>

                    {isLast ? (
                        <button
                            type="button"
                            onClick={() => void submitSession()}
                            disabled={submitting || !allAnswered}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] active:scale-95 disabled:hover:scale-100 disabled:opacity-50 dark:bg-gradient-to-r dark:from-emerald-400 dark:to-cyan-400 dark:text-slate-950 dark:shadow-none dark:hover:brightness-110"
                        >
                            {submitting ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-slate-900 border-t-transparent" />
                                    Yuklanmoqda...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Yuborish
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => goToQuestion(Math.min(totalCount - 1, currentIdx + 1))}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:shadow-none dark:hover:bg-slate-700/50"
                        >
                            Keyingi
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Submit helper */}
                {!allAnswered && isLast && (
                    <p className="text-center text-xs font-medium text-amber-600 dark:text-amber-300">
                        Yuborish uchun barcha {totalCount} savollarga javob bering. {answeredCount}/{totalCount} javob berildi.
                    </p>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                        {error}
                    </div>
                )}
            </div>
        </Container>
    );
}
