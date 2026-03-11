"use client";

import type { SessionQuestion as SessionQuestionType, QuestionOption } from "@/hooks/useLearningSession";

type Props = {
    question: SessionQuestionType;
    questionNumber: number;
    selectedOptionId: string | undefined;
    onAnswer: (questionId: string, optionId: string) => void;
};

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

function OptionButton({
    option,
    label,
    isSelected,
    onSelect,
}: {
    option: QuestionOption;
    label: string;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-all duration-300 hover:scale-[1.01] active:scale-95 ${isSelected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-100 dark:shadow-[0_0_0_1px_rgba(16,185,129,0.2)]"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700/50"
                }`}
        >
            <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-colors duration-300 ${isSelected
                        ? "bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-900"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                    }`}
            >
                {label}
            </span>
            <span className="leading-6">{option.text}</span>
        </button>
    );
}

export default function SessionQuestion({
    question,
    questionNumber,
    selectedOptionId,
    onAnswer,
}: Props) {
    return (
        <div className="space-y-6">
            {/* Question header */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Savol {questionNumber}
                </p>
                <p className="text-base font-medium leading-7 text-slate-900 dark:text-white">
                    {question.question_text}
                </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
                {question.options.map((option, idx) => (
                    <OptionButton
                        key={option.id}
                        option={option}
                        label={OPTION_LABELS[idx] ?? String(idx + 1)}
                        isSelected={selectedOptionId === option.id}
                        onSelect={() => onAnswer(question.id, option.id)}
                    />
                ))}
            </div>
        </div>
    );
}
