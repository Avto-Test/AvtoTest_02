
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PremiumLock from "@/components/PremiumLock";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Info,
    Sparkles,
    Zap,
    History,
    Timer,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

interface AIPassProbabilityCardProps {
    probability: number;
    label: string;
    isPremium: boolean;
    confidenceScore?: number;
    modelVersion?: string;
    mlStatus?: string;
    driftStatus?: string;
    lastRetrained?: string;
    inferenceLatency?: number;
}

export function AIPassProbabilityCard({
    probability,
    label,
    isPremium,
    confidenceScore,
    modelVersion,
    mlStatus,
    driftStatus = "stable",
    lastRetrained,
    inferenceLatency
}: AIPassProbabilityCardProps) {
    const { locale } = useI18n();
    const [animatedProb, setAnimatedProb] = useState(0);

    // Clamp probability [0, 100] for UI
    const clampedProb = useMemo(() => Math.min(100, Math.max(0, probability)), [probability]);

    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    lockTitle: "AI башоратини очиш",
                    lockDesc: "Имтиҳондан ўтиш эҳтимолини илғор модель орқали баҳолаш",
                    cardTitle: "AI сертификатланган башорат",
                    modelFallback: "Қоидавий модель (Fallback)",
                    modelHybrid: "Гибрид ML модель",
                    statusSevere: "Кучли дрейф",
                    statusModerate: "Кузатув",
                    statusStable: "Барқарор",
                    likelihoodHigh: "Юқори эҳтимол",
                    likelihoodModerate: "Ўртача",
                    likelihoodRisk: "Хавф бор",
                    modelConfidence: "Модель ишончи",
                    confidenceHint: "Ишонч даражаси модель барқарорлиги ва маълумот ҳажмига боғлиқ.",
                    estimate: "Статистик баҳолаш",
                    version: "Версия",
                    updated: "Янгиланган",
                    latency: "Кечикиш",
                    improveText: "Эҳтимолни ошириш учун адаптив машқни давом эттиринг",
                    startNow: "Ҳозир бошлаш",
                };
            case "ru":
                return {
                    lockTitle: "Открыть AI-прогноз",
                    lockDesc: "Оценка вероятности успешной сдачи с помощью продвинутой модели",
                    cardTitle: "AI-сертифицированный прогноз",
                    modelFallback: "Правила (Fallback)",
                    modelHybrid: "Гибридная ML модель",
                    statusSevere: "Сильный дрейф",
                    statusModerate: "Мониторинг",
                    statusStable: "Стабильно",
                    likelihoodHigh: "Высокая вероятность",
                    likelihoodModerate: "Умеренно",
                    likelihoodRisk: "Есть риск",
                    modelConfidence: "Надёжность модели",
                    confidenceHint: "Уверенность зависит от стабильности модели и объёма данных.",
                    estimate: "Статистическая оценка",
                    version: "Версия",
                    updated: "Обновлено",
                    latency: "Задержка",
                    improveText: "Повышайте вероятность через адаптивную практику",
                    startNow: "Начать",
                };
            case "en":
                return {
                    lockTitle: "Unlock AI Prediction",
                    lockDesc: "Enterprise-grade exam pass probability analysis",
                    cardTitle: "AI Certified Prediction",
                    modelFallback: "Rule Engine (Fallback)",
                    modelHybrid: "Hybrid ML Model",
                    statusSevere: "Severe Drift",
                    statusModerate: "Monitoring",
                    statusStable: "Stable",
                    likelihoodHigh: "High Likelihood",
                    likelihoodModerate: "Moderate",
                    likelihoodRisk: "At Risk",
                    modelConfidence: "Model Confidence",
                    confidenceHint: "Confidence depends on model stability and training data volume.",
                    estimate: "Statistical Estimate",
                    version: "Version",
                    updated: "Updated",
                    latency: "Latency",
                    improveText: "Improve your probability with Adaptive Practice",
                    startNow: "Start Now",
                };
            default:
                return {
                    lockTitle: "AI bashoratini ochish",
                    lockDesc: "Imtihondan o'tish ehtimolini ilg'or model orqali baholash",
                    cardTitle: "AI sertifikatlangan bashorat",
                    modelFallback: "Qoidaviy model (Fallback)",
                    modelHybrid: "Gibrid ML model",
                    statusSevere: "Kuchli drift",
                    statusModerate: "Kuzatuv",
                    statusStable: "Barqaror",
                    likelihoodHigh: "Yuqori ehtimol",
                    likelihoodModerate: "O'rtacha",
                    likelihoodRisk: "Xavf bor",
                    modelConfidence: "Model ishonchi",
                    confidenceHint: "Ishonch darajasi model barqarorligi va ma'lumot hajmiga bog'liq.",
                    estimate: "Statistik baholash",
                    version: "Versiya",
                    updated: "Yangilangan",
                    latency: "Kechikish",
                    improveText: "Ehtimolni oshirish uchun adaptiv mashqni davom ettiring",
                    startNow: "Hozir boshlash",
                };
        }
    }, [locale]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedProb(clampedProb);
        }, 100);
        return () => clearTimeout(timer);
    }, [clampedProb]);

    // Gauge Colors
    const gaugeColors = useMemo(() => {
        if (clampedProb < 50) return { stroke: "stroke-amber-500", text: "text-amber-600", bg: "from-amber-500/10" };
        if (clampedProb < 75) return { stroke: "stroke-blue-500", text: "text-blue-600", bg: "from-blue-500/10" };
        return { stroke: "stroke-emerald-500", text: "text-emerald-600", bg: "from-emerald-500/10" };
    }, [clampedProb]);

    // Derived Labels
    const likelihoodText = useMemo(() => {
        if (clampedProb >= 75) return copy.likelihoodHigh;
        if (clampedProb >= 50) return copy.likelihoodModerate;
        return copy.likelihoodRisk;
    }, [clampedProb, copy]);
    const displayLikelihood = locale === "en" && label.trim().length > 0 ? label : likelihoodText;

    const statusBadge = useMemo(() => {
        switch (driftStatus) {
            case "severe": return { label: copy.statusSevere, color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/25 dark:text-red-300 dark:border-red-700" };
            case "moderate": return { label: copy.statusModerate, color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-700" };
            default: return { label: copy.statusStable, color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-700" };
        }
    }, [driftStatus, copy]);

    const modelSource = mlStatus === "fallback" ? copy.modelFallback : copy.modelHybrid;

    // Circular Progress Math
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedProb / 100) * circumference;

    return (
        <Card className={cn(
            "rounded-2xl border-primary/30 shadow-lg relative overflow-hidden h-full flex flex-col bg-gradient-to-br transition-all duration-300 hover:shadow-xl",
            "from-primary/5 to-background",
            "p-6 md:p-8"
        )}>
            <PremiumLock
                isLocked={!isPremium}
                title={copy.lockTitle}
                description={copy.lockDesc}
            >
                {/* TOP SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                            {copy.cardTitle}
                        </h3>
                        <p className="text-sm text-muted-foreground font-medium">{modelSource}</p>
                    </div>
                    <Badge variant="outline" className={cn("px-3 py-1 rounded-full font-bold uppercase text-[10px] tracking-wider border", statusBadge.color)}>
                        {statusBadge.label}
                    </Badge>
                </div>

                {/* CENTER SECTION (Gauge) */}
                <div className="flex-grow flex flex-col items-center justify-center mb-8">
                    <div className="relative w-40 h-40 md:w-56 md:h-56">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                            {/* Background Track */}
                            <circle
                                cx="100"
                                cy="100"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                className="text-muted"
                            />
                            {/* Animated Progress */}
                            <circle
                                cx="100"
                                cy="100"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className={cn("transition-all duration-1000 ease-out", gaugeColors.stroke)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-4xl md:text-5xl font-black tracking-tight", gaugeColors.text)}>
                                {Math.round(animatedProb)}%
                            </span>
                            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                {displayLikelihood}
                            </span>
                        </div>
                    </div>
                </div>

                {/* CONFIDENCE BAR */}
                <div className="w-full space-y-3 mb-8">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-1.5 cursor-help" title={copy.confidenceHint}>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">{copy.modelConfidence}</span>
                            <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                        </div>
                        <span className="text-xs font-black text-foreground">
                            {confidenceScore ? Math.round(confidenceScore * 100) : 0}%
                        </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-1000",
                                mlStatus === "fallback" ? "bg-muted-foreground/50" : "bg-indigo-500"
                            )}
                            style={{ width: `${(confidenceScore || 0) * 100}%` }}
                        />
                    </div>
                    {mlStatus === "fallback" && (
                        <p className="text-[10px] font-medium text-muted-foreground text-right italic">{copy.estimate}</p>
                    )}
                </div>

                {/* METADATA ROW */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-border pt-6 mb-6">
                    {modelVersion && (
                        <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-indigo-400" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">{copy.version}</span>
                                <span className="text-xs font-bold text-foreground">{modelVersion}</span>
                            </div>
                        </div>
                    )}
                    {lastRetrained && (
                        <div className="flex items-center gap-2">
                            <History className="w-3.5 h-3.5 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">{copy.updated}</span>
                                <span className="text-xs font-bold text-foreground">{lastRetrained}</span>
                            </div>
                        </div>
                    )}
                    {inferenceLatency !== undefined && (
                        <div className="flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">{copy.latency}</span>
                                <span className="text-xs font-bold text-foreground">{inferenceLatency}ms</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-transparent">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-emerald-500" />
                        {copy.improveText}
                    </p>
                    <Button asChild size="sm" variant="ghost" className="h-8 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3">
                        <Link href="/tests">{copy.startNow}</Link>
                    </Button>
                </div>
            </PremiumLock>
        </Card>
    );
}
