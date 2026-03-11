"use client";

import { useCallback, useState } from "react";

export type QuestionOption = {
    id: string;
    text: string;
};

export type SessionQuestion = {
    id: string;
    question_text: string;
    options: QuestionOption[];
};

export type LearningSession = {
    session_id: string;
    questions: SessionQuestion[];
};

type SessionState = {
    session: LearningSession | null;
    currentIdx: number;
    answers: Record<string, string>; // question_id -> option_id
    timeLeft: number;
    loading: boolean;
    submitting: boolean;
    error: string | null;
    completed: boolean;
    result: { score: number; passed: boolean; pass_prediction_label?: string } | null;
};

export function useLearningSession() {
    const [state, setState] = useState<SessionState>({
        session: null,
        currentIdx: 0,
        answers: {},
        timeLeft: 0,
        loading: false,
        submitting: false,
        error: null,
        completed: false,
        result: null,
    });

    const startSession = useCallback(async (questionCount = 20) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const res = await fetch("/api/learning/session", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question_count: questionCount }),
            });
            if (!res.ok) {
                const detail =
                    res.status === 401
                        ? "Tizimga kiring."
                        : "Session yaratishda xatolik yuz berdi.";
                setState((prev) => ({ ...prev, loading: false, error: detail }));
                return null;
            }
            const session = (await res.json()) as LearningSession;
            setState((prev) => ({
                ...prev,
                session,
                currentIdx: 0,
                answers: {},
                completed: false,
                result: null,
                loading: false,
                timeLeft: questionCount * 60, // 1 min per question
            }));
            return session;
        } catch {
            setState((prev) => ({ ...prev, loading: false, error: "Tarmoq xatosi." }));
            return null;
        }
    }, []);

    const answerQuestion = useCallback((questionId: string, optionId: string) => {
        setState((prev) => {
            const newAnswers = { ...prev.answers, [questionId]: optionId };
            const total = prev.session?.questions.length ?? 0;
            // Advance to next unanswered question
            let nextIdx = prev.currentIdx;
            if (prev.currentIdx < total - 1) {
                nextIdx = prev.currentIdx + 1;
            }
            return { ...prev, answers: newAnswers, currentIdx: nextIdx };
        });
    }, []);

    const goToQuestion = useCallback((idx: number) => {
        setState((prev) => ({ ...prev, currentIdx: idx }));
    }, []);

    const submitSession = useCallback(async () => {
        setState((prev) => ({ ...prev, submitting: true, error: null }));
        try {
            const { session, answers } = state;
            if (!session) return;

            const res = await fetch("/api/attempts/submit", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: session.session_id,
                    answers,
                }),
            });

            if (!res.ok) {
                setState((prev) => ({
                    ...prev,
                    submitting: false,
                    error: "Natijalarni yuborishda xatolik.",
                }));
                return;
            }

            const result = (await res.json()) as {
                score: number;
                passed: boolean;
                pass_prediction_label?: string;
            };
            setState((prev) => ({
                ...prev,
                submitting: false,
                completed: true,
                result,
            }));
        } catch {
            setState((prev) => ({
                ...prev,
                submitting: false,
                error: "Tarmoq xatosi yuz berdi.",
            }));
        }
    }, [state]);

    const answeredCount = Object.keys(state.answers).length;
    const totalCount = state.session?.questions.length ?? 0;

    return {
        ...state,
        answeredCount,
        totalCount,
        startSession,
        answerQuestion,
        goToQuestion,
        submitSession,
    };
}
