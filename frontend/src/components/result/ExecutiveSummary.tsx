
"use client";

import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Trophy,
    XCircle,
    Zap,
    Brain,
    Activity,
    AlertTriangle,
    Sparkles
} from "lucide-react";
import { MemoryStabilityBadge } from "@/components/dashboard";

interface ExecutiveSummaryProps {
    score: number;
    total: number;
    passed: boolean;
    probability: number;
    confidenceScore?: number;
    cognitiveProfile?: string;
    topicStability?: Record<string, string>;
    pressureMode?: boolean;
    driftStatus?: string;
    trainingLevel?: string;
}

export function ExecutiveSummary({
    score,
    total,
    passed,
    probability,
    confidenceScore,
    cognitiveProfile,
    topicStability,
    pressureMode,
    driftStatus,
    trainingLevel
}: ExecutiveSummaryProps) {
    const [animatedProb, setAnimatedProb] = useState(0);
    const percentage = Math.round((score / total) * 100);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedProb(probability);
        }, 100);
        return () => clearTimeout(timer);
    }, [probability]);

    const executiveMessage = useMemo(() => {
        if (probability >= 75) return "You are likely to pass the actual exam.";
        if (probability >= 50) return "Performance is improving, but some risk remains.";
        return "Critical knowledge gaps detected. High risk of failure.";
    }, [probability]);

    const gaugeColors = useMemo(() => {
        const p = Math.min(100, Math.max(0, probability));
        if (p < 50) return { stroke: "stroke-amber-500", text: "text-amber-600" };
        if (p < 75) return { stroke: "stroke-blue-500", text: "text-blue-600" };
        return { stroke: "stroke-emerald-500", text: "text-emerald-600" };
    }, [probability]);

    const getCognitiveStyle = (profile: string) => {
        switch (profile) {
            case "Stable-Fast": return "bg-indigo-50 text-indigo-700 border-indigo-200";
            case "Stable": return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "Unstable": return "bg-red-50 text-red-700 border-red-200";
            case "Slow-Deliberate": return "bg-blue-50 text-blue-700 border-blue-200";
            default: return "bg-slate-50 text-slate-700 border-slate-200";
        }
    };

    // Circular Progress Math
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedProb / 100) * circumference;

    return (
        <div className={cn(
            "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-8 shadow-xl",
            "animate-in fade-in slide-in-from-bottom-4 duration-700"
        )}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* LEFT: MAIN SCORE */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
                    <div className={cn(
                        "w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner",
                        passed ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                        {passed ? <Trophy className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 justify-center lg:justify-start">
                            <span className="text-5xl font-black tracking-tighter text-slate-900">{percentage}%</span>
                            <Badge className={cn(
                                "px-3 py-1 rounded-lg uppercase font-black text-[10px] tracking-widest",
                                passed ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                            )}>
                                {passed ? "Passed" : "Failed"}
                            </Badge>
                        </div>
                        <p className="text-xl font-bold text-slate-800 mt-1">{score} / {total} Correct</p>
                        <p className="text-sm text-slate-500 font-medium mt-2 max-w-xs">{executiveMessage}</p>
                    </div>
                </div>

                {/* CENTER: AI PROBABILITY GAUGE */}
                <div className="flex flex-col items-center justify-center py-4 border-y lg:border-y-0 lg:border-x border-slate-100">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-slate-100"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className={cn("transition-all duration-1000 ease-out", gaugeColors.stroke)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-2xl font-black tracking-tight", gaugeColors.text)}>
                                {Math.round(animatedProb)}%
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Pass Prob</span>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col items-center">
                        <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full">
                            <Sparkles className="w-3 h-3 text-violet-600" />
                            <span className="text-[10px] font-bold uppercase text-violet-700 tracking-wide">AI Analytics</span>
                        </div>
                        {confidenceScore !== undefined && (
                            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                                Confidence: {Math.round(confidenceScore * 100)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* RIGHT: STABILITY BADGES */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center lg:text-left">Intelligence Badges</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {cognitiveProfile && (
                            <div className={cn("px-3 py-2 rounded-xl border flex items-center gap-2", getCognitiveStyle(cognitiveProfile))}>
                                <Brain className="w-4 h-4" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold opacity-70 uppercase leading-none">Cognitive</span>
                                    <span className="text-[10px] font-black leading-tight uppercase">{cognitiveProfile}</span>
                                </div>
                            </div>
                        )}
                        {trainingLevel && (
                            <div className="px-3 py-2 rounded-xl border border-purple-100 bg-purple-50 text-purple-700 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold opacity-70 uppercase leading-none">Training</span>
                                    <span className="text-[10px] font-black leading-tight uppercase">{trainingLevel}</span>
                                </div>
                            </div>
                        )}
                        {pressureMode && (
                            <div className="px-3 py-2 rounded-xl border border-orange-100 bg-orange-50 text-orange-700 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold opacity-70 uppercase leading-none">Pressure</span>
                                    <span className="text-[10px] font-black leading-tight uppercase">Simulation</span>
                                </div>
                            </div>
                        )}
                        {driftStatus && driftStatus !== 'stable' && (
                            <div className={cn(
                                "px-3 py-2 rounded-xl border flex items-center gap-2",
                                driftStatus === 'severe' ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100"
                            )}>
                                <AlertTriangle className="w-4 h-4" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold opacity-70 uppercase leading-none">System</span>
                                    <span className="text-[10px] font-black leading-tight uppercase">Drift Alert</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Memory Summary */}
                    {topicStability && Object.keys(topicStability).length > 0 && (
                        <div className="flex gap-2 flex-wrap justify-center lg:justify-start mt-2">
                            {Object.entries(topicStability).slice(0, 3).map(([topic, stability]) => (
                                <MemoryStabilityBadge key={topic} stability={stability as string} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
