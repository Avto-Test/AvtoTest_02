"use client";

import { useMemo } from "react";
import { TrainingLevelCard, ImprovementCard, CognitiveProfileCard, PressureResilienceCard } from "@/components/dashboard";
import { useI18n } from "@/components/i18n-provider";

interface ZonePerformanceProps {
    overview: {
        current_training_level?: string;
        improvement_delta?: number;
        improvement_direction?: "up" | "down" | "stable";
        cognitive_stability?: string | null;
        avg_response_time?: number | null;
        pressure_resilience?: number;
    };
    user?: {
        plan?: string;
        is_premium?: boolean;
    } | null;
}

export function ZonePerformance({ overview, user }: ZonePerformanceProps) {
    const { locale } = useI18n();
    const isPremium = user?.plan === "premium" || user?.is_premium === true;
    const improvementDirection = overview.improvement_direction ?? "stable";
    const pressureResilience = overview.pressure_resilience ?? 0;

    const heading = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return "Натижа кўриниши";
            case "ru":
                return "Снимок прогресса";
            case "en":
                return "Performance Snapshot";
            default:
                return "Natija ko'rinishi";
        }
    }, [locale]);

    return (
        <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground font-display">{heading}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <TrainingLevelCard level={overview.current_training_level ?? "beginner"} />
                <ImprovementCard
                    delta={overview.improvement_delta ?? 0}
                    direction={improvementDirection}
                />
                <CognitiveProfileCard
                    stability={overview.cognitive_stability ?? null}
                    avgResponseTime={overview.avg_response_time ?? null}
                    pressureResilience={pressureResilience}
                    isPremium={isPremium}
                />
                <PressureResilienceCard
                    resilience={pressureResilience}
                    isPremium={isPremium}
                />
            </div>
        </section>
    );
}
