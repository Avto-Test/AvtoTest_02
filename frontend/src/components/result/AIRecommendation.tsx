
"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Sparkles,
    ListRestart,
    Zap,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AIRecommendationProps {
    probability: number;
    weakestTopic?: string;
}

export function AIRecommendation({
    probability,
    weakestTopic
}: AIRecommendationProps) {

    const advice = useMemo(() => {
        if (probability >= 75) {
            return {
                title: "Maintain Consistency",
                message: "You're in a strong position. Focus on reinforcing your mastery and maintaining this performance level.",
                icon: CheckCircle2,
                color: "text-emerald-600",
                bgColor: "bg-emerald-50",
                borderColor: "border-emerald-100"
            };
        }
        if (probability >= 50) {
            return {
                title: "Targeted Reinforcement",
                message: weakestTopic
                    ? `Your performance in "${weakestTopic}" is holding you back. Focus your next adaptive session there.`
                    : "Focus on your weak spots and schedule structured reviews to stabilize your pass probability.",
                icon: AlertCircle,
                color: "text-amber-600",
                bgColor: "bg-amber-50",
                borderColor: "border-amber-100"
            };
        }
        return {
            title: "Immediate Action Required",
            message: "Critical gaps identified. You are currently at high risk for the real exam. Immediate adaptive reinforcement is required.",
            icon: Zap,
            color: "text-red-600",
            bgColor: "bg-red-50",
            borderColor: "border-red-100"
        };
    }, [probability, weakestTopic]);

    const Icon = advice.icon;

    return (
        <Card className={cn(
            "rounded-2xl border bg-muted/30 p-8 shadow-sm",
            advice.borderColor
        )}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-xl font-bold text-slate-900">AI Recommendation</h2>
                    </div>

                    <div className={cn("p-4 rounded-xl border flex gap-4", advice.bgColor, advice.borderColor)}>
                        <div className={cn("mt-0.5", advice.color)}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={cn("font-bold text-sm uppercase tracking-wider mb-1", advice.color)}>
                                {advice.title}
                            </h3>
                            <p className="text-slate-700 font-medium leading-relaxed">
                                {advice.message}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto">
                    <Button
                        asChild
                        className="bg-[#00B37E] hover:bg-[#009468] text-white shadow-lg h-12 px-6 rounded-xl font-bold flex items-center justify-center gap-2 min-w-[200px]"
                    >
                        <Link href="/tests?mode=adaptive">
                            <Zap className="w-4 h-4 fill-current" />
                            Adaptive Practice
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="bg-white border-slate-200 h-12 px-6 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <Link href="/review-queue">
                            <ListRestart className="w-4 h-4" />
                            Review Due Topics
                        </Link>
                    </Button>
                </div>
            </div>
        </Card>
    );
}
