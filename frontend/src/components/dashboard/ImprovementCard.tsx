"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

interface ImprovementCardProps {
    delta: number;
    direction: "up" | "down" | "stable";
}

export function ImprovementCard({ delta, direction }: ImprovementCardProps) {
    const { locale } = useI18n();
    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    title: "Сўнгги тренд",
                    stable: "Барқарор",
                    improvement: "Ўсиш",
                    decline: "Пасайиш",
                    compared: "Олдинги уриниш билан солиштирилганда",
                };
            case "ru":
                return {
                    title: "Последний тренд",
                    stable: "Стабильно",
                    improvement: "Рост",
                    decline: "Снижение",
                    compared: "По сравнению с предыдущей попыткой",
                };
            case "en":
                return {
                    title: "Recent Trend",
                    stable: "Stable",
                    improvement: "Improvement",
                    decline: "Decline",
                    compared: "Compared to your previous attempt",
                };
            default:
                return {
                    title: "So'nggi trend",
                    stable: "Barqaror",
                    improvement: "O'sish",
                    decline: "Pasayish",
                    compared: "Oldingi urinish bilan solishtirilganda",
                };
        }
    }, [locale]);

    let colorClass = "text-slate-500";
    let bgClass = "bg-slate-100 dark:bg-slate-900/20";
    let icon = <Minus className="w-5 h-5" />;
    let label = copy.stable;

    if (direction === "up") {
        colorClass = "text-emerald-600";
        bgClass = "bg-emerald-100 dark:bg-emerald-900/20";
        icon = <TrendingUp className="w-5 h-5" />;
        label = copy.improvement;
    } else if (direction === "down") {
        colorClass = "text-red-500";
        bgClass = "bg-red-100 dark:bg-red-900/20";
        icon = <TrendingDown className="w-5 h-5" />;
        label = copy.decline;
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {copy.title}
                </CardTitle>
                <div className={cn("p-1 rounded-md", bgClass, colorClass)}>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className={cn("text-2xl font-bold", colorClass)}>
                        {direction === "up" ? "+" : direction === "down" ? "-" : ""}{delta}%
                    </div>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {label}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {copy.compared}
                </p>
            </CardContent>
        </Card>
    );
}
