
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    Brain,
    Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOptionFunctionLabelById } from "@/lib/testOptionLabels";
import { PublicQuestion } from "@/types/test";

interface AnswerReviewAccordionProps {
    answers: Array<{
        question_id: string;
        selected_option_id: string;
        correct_option_id: string;
        is_correct: boolean;
        dynamic_difficulty_score?: number;
        difficulty_label?: string;
        reinforcement_message?: string;
    }>;
    questions: PublicQuestion[];
}

export function AnswerReviewAccordion({
    answers,
    questions
}: AnswerReviewAccordionProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    return (
        <section className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 px-2">
                <Target className="w-6 h-6 text-[#00B37E]" />
                Detailed Answer Analysis
            </h2>

            <div className="space-y-4">
                {answers.map((ans, idx) => {
                    const question = questions.find(q => q.id === ans.question_id);
                    const isExpanded = expandedIds.has(ans.question_id);
                    const selectedOption = question?.answer_options.find((o) => o.id === ans.selected_option_id);
                    const correctOption = question?.answer_options.find((o) => o.id === ans.correct_option_id);
                    const selectedOptionLabel = question ? getOptionFunctionLabelById(question, ans.selected_option_id) : null;
                    const correctOptionLabel = question ? getOptionFunctionLabelById(question, ans.correct_option_id) : null;

                    if (!question) return null;

                    return (
                        <Card
                            key={ans.question_id}
                            className={cn(
                                "rounded-2xl border transition-all duration-300",
                                ans.is_correct ? "border-emerald-100" : "border-red-100 shadow-sm"
                            )}
                        >
                            <div
                                className="p-4 cursor-pointer flex items-center justify-between"
                                onClick={() => toggleExpand(ans.question_id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                                        ans.is_correct ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                                    )}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1 max-w-md">
                                            {question.text}
                                        </h3>
                                        <div className="flex gap-2 items-center mt-1">
                                            {ans.dynamic_difficulty_score !== undefined && (
                                                <Badge variant="outline" className={cn(
                                                    "text-[9px] uppercase px-1.5 py-0",
                                                    ans.difficulty_label === 'Hard' ? "text-orange-600 bg-orange-50 border-orange-100" : "text-slate-400 bg-slate-50 border-slate-100"
                                                )}>
                                                    {ans.difficulty_label || (ans.dynamic_difficulty_score > 0.7 ? "Hard" : "Normal")}
                                                </Badge>
                                            )}
                                            {!ans.is_correct && (
                                                <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 text-red-600 bg-red-50 border-red-100">
                                                    Incorrect
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </div>

                            {isExpanded && (
                                <CardContent className="pt-0 pb-6 px-14 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-6">
                                        <p className="text-slate-600 font-medium leading-relaxed italic text-sm">
                                            &quot;{question.text}&quot;
                                        </p>

                                        <div className="grid gap-3">
                                            <div className={cn(
                                                "p-4 rounded-xl border flex items-center gap-3",
                                                ans.is_correct ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                                            )}>
                                                {ans.is_correct ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Your Answer</span>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        {selectedOptionLabel ? (
                                                            <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                                {selectedOptionLabel}
                                                            </span>
                                                        ) : null}
                                                        <p className={cn("font-bold text-slate-900", ans.is_correct ? "text-emerald-900" : "text-red-900")}>
                                                            {selectedOption?.text || "None selected"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {!ans.is_correct && (
                                                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 flex items-center gap-3">
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Correct Answer</span>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            {correctOptionLabel ? (
                                                                <span className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                                                                    {correctOptionLabel}
                                                                </span>
                                                            ) : null}
                                                            <p className="font-bold text-emerald-900">
                                                                {correctOption?.text}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {ans.reinforcement_message && (
                                            <div className="p-4 rounded-xl bg-slate-900 text-white flex gap-4">
                                                <div className="mt-1">
                                                    <Brain className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-2">AI Reinforcement</h4>
                                                    <p className="text-sm font-medium leading-relaxed text-slate-200">
                                                        {ans.reinforcement_message}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}
