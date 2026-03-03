"use client";

import { useMemo } from "react";
import { AIPassProbabilityCard, ReadinessCard } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface ZonePrimaryAIProps {
    overview: {
        drift_status?: string;
        ml_status?: string;
        pass_probability?: number;
        pass_prediction_label?: string;
        confidence_score?: number;
        model_version?: string;
        last_retrained?: string;
        inference_latency?: number;
        readiness_score?: number;
    };
    user?: {
        plan?: string;
        is_premium?: boolean;
    } | null;
}

export function ZonePrimaryAI({ overview, user }: ZonePrimaryAIProps) {
    const { locale } = useI18n();
    const isPremium = user?.plan === "premium" || user?.is_premium === true;
    const driftStatus = overview?.drift_status || "stable";

    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    heading: "AI интеллект",
                    liveStable: "Жонли: Барқарор",
                    drift: "Дрифт",
                    needsImprovement: "Яхшилаш керак",
                };
            case "ru":
                return {
                    heading: "AI интеллект",
                    liveStable: "Live: Стабильно",
                    drift: "Дрифт",
                    needsImprovement: "Требуется улучшение",
                };
            case "en":
                return {
                    heading: "AI Intelligence",
                    liveStable: "Live: Stable",
                    drift: "Drift",
                    needsImprovement: "Needs Improvement",
                };
            default:
                return {
                    heading: "AI intellekt",
                    liveStable: "Jonli: Barqaror",
                    drift: "Drift",
                    needsImprovement: "Yaxshilash kerak",
                };
        }
    }, [locale]);

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-foreground font-display">{copy.heading}</h2>
                {overview?.ml_status && (
                    <Badge
                        variant="outline"
                        className={cn(
                            "capitalize font-semibold",
                            driftStatus === "severe"
                                ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300"
                                : driftStatus === "moderate"
                                    ? "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300"
                                    : "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300"
                        )}
                    >
                        {driftStatus === "stable" ? copy.liveStable : `${copy.drift}: ${driftStatus}`}
                    </Badge>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <AIPassProbabilityCard
                        probability={overview.pass_probability ?? 0}
                        label={overview.pass_prediction_label ?? copy.needsImprovement}
                        isPremium={isPremium}
                        confidenceScore={overview.confidence_score}
                        modelVersion={overview.model_version}
                        mlStatus={overview.ml_status}
                        driftStatus={driftStatus}
                        lastRetrained={overview.last_retrained}
                        inferenceLatency={overview.inference_latency}
                    />
                </div>
                <div className="lg:col-span-1">
                    <ReadinessCard
                        score={overview.readiness_score ?? 0}
                        isPremium={isPremium}
                    />
                </div>
            </div>
        </section>
    );
}
