import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BulkSubmitResponse, PublicQuestion } from "@/types/test";

interface TestState {
    attemptId: string | null;
    questions: PublicQuestion[];
    currentQuestionIndex: number;
    answers: Record<string, string>; // questionId -> optionId
    startedAt: string | null;
    remainingTime: number; // in seconds
    isLoading: boolean;
    result: BulkSubmitResponse | null;

    // Actions
    setAttempt: (id: string, questions: PublicQuestion[], duration: number) => void;
    setAnswer: (questionId: string, optionId: string) => void;
    setResult: (result: BulkSubmitResponse | null) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    goToQuestion: (index: number) => void;
    tick: () => void;
    reset: () => void;
}

export const useTestStore = create<TestState>()(
    persist(
        (set) => ({
            attemptId: null,
            questions: [],
            currentQuestionIndex: 0,
            answers: {},
            startedAt: null,
            remainingTime: 0,
            isLoading: false,
            result: null,

            setAttempt: (id, questions, duration) => set({
                attemptId: id,
                questions,
                remainingTime: duration * 60, // assuming duration is in minutes
                startedAt: new Date().toISOString(),
                currentQuestionIndex: 0,
                answers: {},
                result: null,
            }),

            setAnswer: (questionId, optionId) => set((state) => ({
                answers: { ...state.answers, [questionId]: optionId }
            })),

            setResult: (result: BulkSubmitResponse | null) => set({ result }),

            nextQuestion: () => set((state) => ({
                currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1)
            })),

            prevQuestion: () => set((state) => ({
                currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0)
            })),

            goToQuestion: (index) => set({ currentQuestionIndex: index }),

            tick: () => set((state) => ({
                remainingTime: Math.max(state.remainingTime - 1, 0)
            })),

            reset: () => set({
                attemptId: null,
                questions: [],
                currentQuestionIndex: 0,
                answers: {},
                startedAt: null,
                remainingTime: 0,
                result: null,
            }),
        }),
        {
            name: "autotest-attempt-storage",
        }
    )
);
