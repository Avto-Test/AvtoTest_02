
"use client";

import { Card } from "@/components/ui/card";
import PremiumLock from "@/components/PremiumLock";
import { useI18n } from "@/components/i18n-provider";
import { useMemo } from "react";

interface PressureResilienceCardProps {
    resilience: number;
    isPremium: boolean;
}

export function PressureResilienceCard({ resilience, isPremium }: PressureResilienceCardProps) {
    const { locale } = useI18n();
    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    lockTitle: "Босим барқарорлигини очиш",
                    lockDesc: "Жавоб барқарорлиги ва латентлик ўзгарувчанлигини таҳлил қилиш",
                    title: "Босим барқарорлиги",
                    desc: "Кечикиш ўзгариши шароитида жавоб беришдаги изчиллик.",
                };
            case "ru":
                return {
                    lockTitle: "Открыть устойчивость под давлением",
                    lockDesc: "Анализ стабильности ответов при изменении латентности",
                    title: "Устойчивость под давлением",
                    desc: "Стабильность в условиях вариативной задержки.",
                };
            case "en":
                return {
                    lockTitle: "Unlock Pressure Resilience",
                    lockDesc: "Analyze your performance consistency",
                    title: "Pressure Resilience",
                    desc: "Consistency under latency variance.",
                };
            default:
                return {
                    lockTitle: "Bosim barqarorligini ochish",
                    lockDesc: "Javoblar izchilligi va kechikish o'zgaruvchanligini tahlil qilish",
                    title: "Bosim barqarorligi",
                    desc: "Kechikish farqlarida ishlashdagi izchillik.",
                };
        }
    }, [locale]);

    return (
        <Card className="rounded-xl border shadow-sm relative overflow-hidden h-full">
            <PremiumLock
                isLocked={!isPremium}
                title={copy.lockTitle}
                description={copy.lockDesc}
            >
                <div className="p-4 flex flex-col justify-between h-full">
                    <div>
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-2">{copy.title}</h3>
                        <div className="text-2xl font-bold text-indigo-600">
                            {Math.round(resilience)}%
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-1000"
                                style={{ width: `${resilience}%` }}
                            />
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-2 leading-tight">
                            {copy.desc}
                        </p>
                    </div>
                </div>
            </PremiumLock>
        </Card>
    );
}
