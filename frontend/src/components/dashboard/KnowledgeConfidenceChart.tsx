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
                    title: "Р‘РёР»РёРј РёС€РѕРЅС‡Рё",
                    desc: "РњР°РІР·СѓР»Р°СЂ РєРµСЃРёРјРёРґР° СЌТіС‚РёРјРѕР»РёР№ СћР·Р»Р°С€С‚РёСЂРёС€ РґР°СЂР°Р¶Р°СЃРё.",
                    empty: "РС€РѕРЅС‡ РјРµС‚СЂРёРєР°Р»Р°СЂРё С€Р°РєР»Р»Р°РЅРёС€Рё СѓС‡СѓРЅ РјР°С€Т›РЅРё РґР°РІРѕРј СЌС‚С‚РёСЂРёРЅРі.",
                    lockTitle: "Р­ТіС‚РёРјРѕР»РёР№ СћР·Р»Р°С€С‚РёСЂРёС€РЅРё РѕС‡РёС€",
                    lockDesc: "ТІР°СЂ Р±РёСЂ РјР°РІР·СѓРґР°РіРё AI РёС€РѕРЅС‡ РґР°СЂР°Р¶Р°СЃРёРЅРё РєСћСЂРёРЅРі",
                    tooltipValue: "РЋР·Р»Р°С€С‚РёСЂРёС€ СЌТіС‚РёРјРѕР»Рё",
                    tooltipSeries: "РС€РѕРЅС‡",
                };
            case "ru":
                return {
                    title: "РЈРІРµСЂРµРЅРЅРѕСЃС‚СЊ РІ Р·РЅР°РЅРёСЏС…",
                    desc: "Р’РµСЂРѕСЏС‚РЅРѕСЃС‚СЊ РѕСЃРІРѕРµРЅРёСЏ РїРѕ С‚РµРјР°Рј.",
                    empty: "РџСЂРѕРґРѕР»Р¶Р°Р№С‚Рµ РїСЂР°РєС‚РёРєСѓ, С‡С‚РѕР±С‹ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ РјРµС‚СЂРёРєРё СѓРІРµСЂРµРЅРЅРѕСЃС‚Рё.",
                    lockTitle: "РћС‚РєСЂС‹С‚СЊ РІРµСЂРѕСЏС‚РЅРѕСЃС‚РЅРѕРµ РѕСЃРІРѕРµРЅРёРµ",
                    lockDesc: "РЎРјРѕС‚СЂРёС‚Рµ СѓСЂРѕРІРµРЅСЊ AI-СѓРІРµСЂРµРЅРЅРѕСЃС‚Рё РїРѕ РєР°Р¶РґРѕР№ С‚РµРјРµ",
                    tooltipValue: "Р’РµСЂРѕСЏС‚РЅРѕСЃС‚СЊ РѕСЃРІРѕРµРЅРёСЏ",
                    tooltipSeries: "РЈРІРµСЂРµРЅРЅРѕСЃС‚СЊ",
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
                    <div className="h-[300px] min-h-[220px] w-full min-w-0 pt-4">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
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
