
"use client";

import { Card } from "@/components/ui/card";
import PremiumLock from "@/components/PremiumLock";
import { cn } from "@/lib/utils";
import { Trophy, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { useMemo } from "react";

interface ReadinessCardProps {
    score: number;
    isPremium: boolean;
    adaptiveIntelligence?: number;
}

export function ReadinessCard({ score, isPremium, adaptiveIntelligence }: ReadinessCardProps) {
    const { locale } = useI18n();
    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    lockTitle: "Тайёрлик баҳосини очиш",
                    lockDesc: "AI асосида имтиҳонга тайёрлик прогнози",
                    title: "Имтиҳон тайёрлиги",
                    notReady: "Тайёр эмас",
                    nearReady: "Деярли тайёр",
                    examReady: "Имтиҳонга тайёр",
                    improving: "Яхшиланмоқда",
                    msgNotReady: "Асосни мустаҳкамлаш учун машқни давом эттиринг.",
                    msgNearReady: "Охирги босқичга яқин. Яна бир оз тайёргарлик керак.",
                    msgReady: "Сиз реал имтиҳон учун тайёр ҳолатдасиз.",
                    msgImproving: "Йўналиш тўғри, шу темпни сақланг.",
                    adaptive: "Адаптив интеллект",
                };
            case "ru":
                return {
                    lockTitle: "Открыть индекс готовности",
                    lockDesc: "AI-прогноз вашей готовности к экзамену",
                    title: "Готовность к экзамену",
                    notReady: "Не готов",
                    nearReady: "Почти готов",
                    examReady: "Готов к экзамену",
                    improving: "Улучшается",
                    msgNotReady: "Продолжайте практику, чтобы укрепить базу.",
                    msgNearReady: "Вы близко к целевому уровню, нужен финальный рывок.",
                    msgReady: "Вы готовы к реальному экзамену.",
                    msgImproving: "Верное направление, продолжайте в том же темпе.",
                    adaptive: "Адаптивный интеллект",
                };
            case "en":
                return {
                    lockTitle: "Unlock Readiness Score",
                    lockDesc: "Get AI-powered exam readiness prediction",
                    title: "Exam Readiness",
                    notReady: "Not Ready",
                    nearReady: "Near Ready",
                    examReady: "Exam Ready",
                    improving: "Improving",
                    msgNotReady: "Keep studying to build your foundation.",
                    msgNearReady: "Just a bit more polish needed.",
                    msgReady: "You are fully prepared for the real exam!",
                    msgImproving: "You're on the right track, keep going.",
                    adaptive: "Adaptive Intelligence",
                };
            default:
                return {
                    lockTitle: "Tayyorgarlik bahosini ochish",
                    lockDesc: "AI asosidagi imtihonga tayyorlik prognozi",
                    title: "Imtihon tayyorligi",
                    notReady: "Tayyor emas",
                    nearReady: "Deyarli tayyor",
                    examReady: "Imtihonga tayyor",
                    improving: "Yaxshilanmoqda",
                    msgNotReady: "Asosni mustahkamlash uchun mashqni davom ettiring.",
                    msgNearReady: "Yakuniy bosqichga yaqin. Yana biroz tayyorgarlik kerak.",
                    msgReady: "Siz real imtihon uchun tayyor holatdasiz.",
                    msgImproving: "Yo'nalish to'g'ri, shu tempni saqlang.",
                    adaptive: "Adaptiv intellekt",
                };
        }
    }, [locale]);

    // Determine color and label
    let colorClass = "text-red-500";
    let strokeClass = "stroke-red-500";
    let label = copy.notReady;
    let message = copy.msgNotReady;
    let Icon = AlertCircle;

    if (score >= 90) {
        colorClass = "text-green-600";
        strokeClass = "stroke-green-500";
        label = copy.examReady;
        message = copy.msgReady;
        Icon = Trophy;
    } else if (score >= 75) {
        colorClass = "text-blue-600";
        strokeClass = "stroke-blue-500";
        label = copy.nearReady;
        message = copy.msgNearReady;
        Icon = CheckCircle;
    } else if (score >= 50) {
        colorClass = "text-yellow-600";
        strokeClass = "stroke-yellow-500";
        label = copy.improving;
        message = copy.msgImproving;
        Icon = TrendingUp;
    }

    // Circular Progress Math
    // 96px container, center 48. Radius 36 gives padding for stroke width 8.
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <Card className="rounded-xl border shadow-sm relative overflow-hidden h-full">
            <PremiumLock
                isLocked={!isPremium}
                title={copy.lockTitle}
                description={copy.lockDesc}
            >
                <div className="p-6 h-full flex items-center gap-6">
                    {/* Circular Indicator */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                            {/* Background Circle */}
                            <circle
                                cx="48"
                                cy="48"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-muted"
                            />
                            {/* Progress Circle */}
                            <circle
                                cx="48"
                                cy="48"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className={cn("transition-all duration-1000 ease-out", strokeClass)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-xl font-bold", colorClass)}>{Math.round(score)}%</span>
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="flex flex-col justify-center">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{copy.title}</h3>
                        <div className={cn("text-xl font-bold flex items-center gap-2", colorClass)}>
                            {label}
                            <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 leading-snug">{message}</p>

                        {isPremium && typeof adaptiveIntelligence === "number" && (
                            <div className="mt-3 pt-3 border-t border-border">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{copy.adaptive}</span>
                                    <span className="text-[10px] font-bold text-indigo-600">{adaptiveIntelligence}%</span>
                                </div>
                                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 transition-all duration-1000"
                                        style={{ width: `${adaptiveIntelligence}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </PremiumLock>
        </Card>
    );
}
