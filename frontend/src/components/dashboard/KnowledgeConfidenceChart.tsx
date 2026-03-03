"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KnowledgeMastery } from "@/types/analytics";
import PremiumLock from "@/components/PremiumLock";
import {
    Bar,
    BarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { useI18n } from "@/components/i18n-provider";

interface KnowledgeConfidenceChartProps {
    mastery: KnowledgeMastery[];
    isPremium: boolean;
}

export function KnowledgeConfidenceChart({ mastery, isPremium }: KnowledgeConfidenceChartProps) {
    const { locale } = useI18n();
    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    title: "Билим ишончи",
                    desc: "Мавзулар кесимида эҳтимолий ўзлаштириш даражаси.",
                    empty: "Ишонч метрикалари шаклланиши учун машқни давом эттиринг.",
                    lockTitle: "Эҳтимолий ўзлаштиришни очиш",
                    lockDesc: "Ҳар бир мавзудаги AI ишонч даражасини кўринг",
                    tooltipValue: "Ўзлаштириш эҳтимоли",
                    tooltipSeries: "Ишонч",
                };
            case "ru":
                return {
                    title: "Уверенность в знаниях",
                    desc: "Вероятность освоения по темам.",
                    empty: "Продолжайте практику, чтобы сформировать метрики уверенности.",
                    lockTitle: "Открыть вероятностное освоение",
                    lockDesc: "Смотрите уровень AI-уверенности по каждой теме",
                    tooltipValue: "Вероятность освоения",
                    tooltipSeries: "Уверенность",
                };
            case "en":
                return {
                    title: "Knowledge Confidence",
                    desc: "Probabilistic mastery per topic.",
                    empty: "Keep practicing to generate confidence metrics.",
                    lockTitle: "Unlock Probabilistic Mastery",
                    lockDesc: "Visualize AI confidence levels for each topic using Bayesian tracing",
                    tooltipValue: "Mastery Probability",
                    tooltipSeries: "Confidence",
                };
            default:
                return {
                    title: "Bilim ishonchi",
                    desc: "Mavzular kesimida ehtimoliy o'zlashtirish darajasi.",
                    empty: "Ishonch metrikalari shakllanishi uchun mashqni davom ettiring.",
                    lockTitle: "Ehtimoliy o'zlashtirishni ochish",
                    lockDesc: "Har bir mavzudagi AI ishonch darajasini ko'ring",
                    tooltipValue: "O'zlashtirish ehtimoli",
                    tooltipSeries: "Ishonch",
                };
        }
    }, [locale]);

    if (!mastery || mastery.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>{copy.title}</CardTitle>
                    <CardDescription>{copy.desc}</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground text-sm text-center px-6">
                    {copy.empty}
                </CardContent>
            </Card>
        );
    }

    const chartData = mastery.map((m) => ({
        topic: m.topic,
        prob: m.probability,
    }));

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle>{copy.title}</CardTitle>
                <CardDescription>{copy.desc}</CardDescription>
            </CardHeader>
            <CardContent>
                <PremiumLock
                    isLocked={!isPremium}
                    title={copy.lockTitle}
                    description={copy.lockDesc}
                >
                    <div className="h-[300px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                                    axisLine={false}
                                />
                                <YAxis
                                    dataKey="topic"
                                    type="category"
                                    tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }}
                                    width={100}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: "hsl(var(--muted))" }}
                                    contentStyle={{
                                        borderRadius: "12px",
                                        border: "1px solid hsl(var(--border))",
                                        background: "hsl(var(--card))",
                                        color: "hsl(var(--foreground))",
                                    }}
                                    formatter={(value: number | undefined) => [`${value ?? 0}% ${copy.tooltipValue}`, copy.tooltipSeries]}
                                />
                                <Bar dataKey="prob" radius={[0, 8, 8, 0]} barSize={20}>
                                    {chartData.map((entry, index) => {
                                        let color = "#6366f1";
                                        if (entry.prob >= 80) color = "#10b981";
                                        else if (entry.prob >= 50) color = "#6366f1";
                                        else if (entry.prob >= 30) color = "#f59e0b";
                                        else color = "#ef4444";
                                        return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </PremiumLock>
            </CardContent>
        </Card>
    );
}
