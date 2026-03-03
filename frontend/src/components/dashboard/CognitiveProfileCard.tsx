"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import PremiumLock from "@/components/PremiumLock";
import { cn } from "@/lib/utils";
import { Zap, Activity, ShieldCheck, Brain } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

interface CognitiveProfileCardProps {
    avgResponseTime: number | null;
    stability: string | null;
    pressureResilience: number;
    isPremium: boolean;
}

export function CognitiveProfileCard({
    avgResponseTime,
    stability,
    pressureResilience,
    isPremium,
}: CognitiveProfileCardProps) {
    const { locale } = useI18n();

    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    lockTitle: "Когнитив таҳлилни очиш",
                    lockDesc: "Босим ва кечикиш шароитида жавоб барқарорлигини баҳолаш",
                    title: "Когнитив профил",
                    premium: "Premium analitika",
                    stabilityLevel: "Барқарорлик даражаси",
                    avgResponse: "Ўртача жавоб",
                    pressureResilience: "Босим барқарорлиги",
                    unknown: "Номаълум",
                    notAvailable: "Мавжуд эмас",
                    measure: "Кечикиш ўзгарувчанлиги юқори бўлган пайтда ҳам қанчалик барқарор жавоб беришингизни кўрсатади.",
                    statusStableFast: "Барқарор-тез",
                    statusStable: "Барқарор",
                    statusUnstable: "Нобарқарор",
                    statusSlowDeliberate: "Секин-аниқ",
                };
            case "ru":
                return {
                    lockTitle: "Открыть когнитивную аналитику",
                    lockDesc: "Оценка стабильности ответов под давлением и при задержках",
                    title: "Когнитивный профиль",
                    premium: "Premium аналитика",
                    stabilityLevel: "Уровень стабильности",
                    avgResponse: "Средний ответ",
                    pressureResilience: "Устойчивость под давлением",
                    unknown: "Неизвестно",
                    notAvailable: "Недоступно",
                    measure: "Показывает, насколько стабильно вы отвечаете при колебаниях задержки.",
                    statusStableFast: "Стабильно-быстро",
                    statusStable: "Стабильно",
                    statusUnstable: "Нестабильно",
                    statusSlowDeliberate: "Медленно-точно",
                };
            case "en":
                return {
                    lockTitle: "Unlock Cognitive Insights",
                    lockDesc: "Analyze consistency under pressure and latency variation",
                    title: "Cognitive Profile",
                    premium: "Premium analytics",
                    stabilityLevel: "Stability Level",
                    avgResponse: "Avg Response",
                    pressureResilience: "Pressure Resilience",
                    unknown: "Unknown",
                    notAvailable: "N/A",
                    measure: "Shows how consistently you answer when latency variance increases.",
                    statusStableFast: "Stable-Fast",
                    statusStable: "Stable",
                    statusUnstable: "Unstable",
                    statusSlowDeliberate: "Slow-Deliberate",
                };
            default:
                return {
                    lockTitle: "Kognitiv tahlilni ochish",
                    lockDesc: "Bosim va kechikish sharoitida javob barqarorligini baholash",
                    title: "Kognitiv profil",
                    premium: "Premium analitika",
                    stabilityLevel: "Barqarorlik darajasi",
                    avgResponse: "O'rtacha javob",
                    pressureResilience: "Bosim barqarorligi",
                    unknown: "Noma'lum",
                    notAvailable: "Mavjud emas",
                    measure: "Kechikish o'zgaruvchanligi oshganda ham qanchalik barqaror javob berishingizni ko'rsatadi.",
                    statusStableFast: "Barqaror-tez",
                    statusStable: "Barqaror",
                    statusUnstable: "Nobarqaror",
                    statusSlowDeliberate: "Sekin-aniq",
                };
        }
    }, [locale]);

    const getStabilityStyles = (s: string | null) => {
        switch (s) {
            case "Stable-Fast":
                return {
                    color: "text-indigo-600",
                    bg: "bg-indigo-50 dark:bg-indigo-900/25",
                    icon: Zap,
                    label: copy.statusStableFast,
                };
            case "Stable":
                return {
                    color: "text-emerald-600",
                    bg: "bg-emerald-50 dark:bg-emerald-900/25",
                    icon: Activity,
                    label: copy.statusStable,
                };
            case "Unstable":
                return {
                    color: "text-red-600",
                    bg: "bg-red-50 dark:bg-red-900/25",
                    icon: ShieldCheck,
                    label: copy.statusUnstable,
                };
            case "Slow-Deliberate":
                return {
                    color: "text-blue-600",
                    bg: "bg-blue-50 dark:bg-blue-900/25",
                    icon: Brain,
                    label: copy.statusSlowDeliberate,
                };
            default:
                return {
                    color: "text-muted-foreground",
                    bg: "bg-muted",
                    icon: Activity,
                    label: copy.unknown,
                };
        }
    };

    const styles = getStabilityStyles(stability);
    const StatusIcon = styles.icon;

    const formattedTime = avgResponseTime
        ? `${(avgResponseTime / 1000).toFixed(2)}s`
        : copy.notAvailable;

    return (
        <Card className="rounded-xl border border-border shadow-sm relative overflow-hidden h-full">
            <PremiumLock
                isLocked={!isPremium}
                title={copy.lockTitle}
                description={copy.lockDesc}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{copy.title}</h3>
                        <div className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", styles.bg, styles.color)}>
                            {copy.premium}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{copy.stabilityLevel}</span>
                            <div className={cn("text-lg font-bold flex items-center gap-2", styles.color)}>
                                {styles.label}
                                <StatusIcon className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{copy.avgResponse}</span>
                            <div className="text-lg font-bold text-foreground">
                                {formattedTime}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{copy.pressureResilience}</span>
                            <span className="text-sm font-bold text-indigo-600">{Math.round(pressureResilience)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-1000"
                                style={{ width: `${pressureResilience}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                            {copy.measure}
                        </p>
                    </div>
                </div>
            </PremiumLock>
        </Card>
    );
}
