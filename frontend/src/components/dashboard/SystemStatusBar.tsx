"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface SystemStatusBarProps {
    driftStatus?: string;
    modelVersion?: string;
    lastRetrained?: string;
    inferenceLatency?: number;
    dataVolume?: string | number;
}

export function SystemStatusBar({
    driftStatus = "stable",
    modelVersion,
    lastRetrained,
    inferenceLatency,
    dataVolume,
}: SystemStatusBarProps) {
    const { locale } = useI18n();

    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    engineStatus: "AI engine ҳолати",
                    driftDetected: "Дрифт аниқланди",
                    monitoringDrift: "Дрифт кузатилмоқда",
                    stable: "Барқарор",
                    model: "Модель",
                    retrained: "Янгиланган",
                    noModel: "йўқ",
                    samples: "намуна",
                    latency: "кечикиш",
                };
            case "ru":
                return {
                    engineStatus: "Статус AI engine",
                    driftDetected: "Обнаружен дрейф",
                    monitoringDrift: "Мониторинг дрейфа",
                    stable: "Стабильно",
                    model: "Модель",
                    retrained: "Обновлено",
                    noModel: "нет",
                    samples: "образцов",
                    latency: "задержка",
                };
            case "en":
                return {
                    engineStatus: "AI Engine Status",
                    driftDetected: "Drift Detected",
                    monitoringDrift: "Monitoring Drift",
                    stable: "Stable",
                    model: "Model",
                    retrained: "Retrained",
                    noModel: "none",
                    samples: "samples",
                    latency: "latency",
                };
            default:
                return {
                    engineStatus: "AI engine holati",
                    driftDetected: "Drift aniqlandi",
                    monitoringDrift: "Drift kuzatilmoqda",
                    stable: "Barqaror",
                    model: "Model",
                    retrained: "Yangilangan",
                    noModel: "yo'q",
                    samples: "namuna",
                    latency: "kechikish",
                };
        }
    }, [locale]);

    const statusConfig = useMemo(() => {
        switch (driftStatus) {
            case "severe":
                return { color: "bg-red-500", text: copy.driftDetected, textColor: "text-red-700 dark:text-red-400" };
            case "moderate":
                return { color: "bg-amber-500", text: copy.monitoringDrift, textColor: "text-amber-700 dark:text-amber-400" };
            default:
                return { color: "bg-emerald-500", text: copy.stable, textColor: "text-emerald-700 dark:text-emerald-400" };
        }
    }, [driftStatus, copy]);

    const latencyColor = useMemo(() => {
        if (inferenceLatency === undefined) return "text-muted-foreground";
        if (inferenceLatency < 50) return "text-emerald-600";
        if (inferenceLatency < 100) return "text-amber-600";
        return "text-red-600";
    }, [inferenceLatency]);

    return (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-2.5 sm:px-6 sm:py-3 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm gap-2 sm:gap-0 subtle-shadow transition-all duration-200 hover:bg-muted/50">
            <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">{copy.engineStatus}</span>
                <div className="flex items-center gap-1.5 ml-1">
                    <span className={cn("w-2 h-2 rounded-full animate-pulse", statusConfig.color)} />
                    <span className={cn("font-bold tracking-tight", statusConfig.textColor)}>
                        {statusConfig.text}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground font-medium mb-2 sm:mb-0 flex-wrap justify-center">
                <div className="flex items-center">
                    <span className="mx-2 hidden sm:inline text-border">|</span>
                    <span>
                        {copy.model} {modelVersion || copy.noModel}
                    </span>
                </div>
                {lastRetrained && (
                    <div className="flex items-center">
                        <span className="mx-2 text-border">|</span>
                        <span>{copy.retrained} {lastRetrained}</span>
                    </div>
                )}
                {dataVolume && (
                    <div className="flex items-center">
                        <span className="mx-2 text-border">|</span>
                        <span>{dataVolume} {copy.samples}</span>
                    </div>
                )}
            </div>

            {inferenceLatency !== undefined && (
                <div className="flex items-center gap-1 font-bold">
                    <span className="mx-2 hidden sm:inline text-border">|</span>
                    <span className={latencyColor}>{inferenceLatency}ms</span>
                    <span className="text-xs text-muted-foreground font-medium ml-1">{copy.latency}</span>
                </div>
            )}
        </div>
    );
}
