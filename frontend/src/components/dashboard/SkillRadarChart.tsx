"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TopicSkill } from "@/types/analytics";
import PremiumLock from "@/components/PremiumLock";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { useI18n } from "@/components/i18n-provider";

interface SkillRadarChartProps {
    skills: TopicSkill[];
    isPremium: boolean;
}

export function SkillRadarChart({ skills, isPremium }: SkillRadarChartProps) {
    const { locale } = useI18n();
    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    title: "Кўникма вектори",
                    desc: "Мавзулар бўйича кўникма даражангиз.",
                    empty: "Кўникма профили шаклланиши учун машқни давом эттиринг.",
                    lockTitle: "Кўникма таҳлилини очиш",
                    lockDesc: "Мавзулар бўйича батафсил кўникма харитасини кўринг",
                    series: "Кўникма",
                };
            case "ru":
                return {
                    title: "Вектор навыков",
                    desc: "Ваш уровень по темам.",
                    empty: "Продолжайте практику, чтобы сформировать профиль навыков.",
                    lockTitle: "Открыть анализ навыков",
                    lockDesc: "Смотрите подробную карту уровня по темам",
                    series: "Навык",
                };
            case "en":
                return {
                    title: "Skill Vector",
                    desc: "Your proficiency across different topics.",
                    empty: "Keep practicing to build your skill profile.",
                    lockTitle: "Unlock Skill Analysis",
                    lockDesc: "Visualize your detailed topic proficiency with radar mapping",
                    series: "Skill",
                };
            default:
                return {
                    title: "Ko'nikma vektori",
                    desc: "Mavzular bo'yicha ko'nikma darajangiz.",
                    empty: "Ko'nikma profili shakllanishi uchun mashqni davom ettiring.",
                    lockTitle: "Ko'nikma tahlilini ochish",
                    lockDesc: "Mavzular bo'yicha batafsil ko'nikma xaritasini ko'ring",
                    series: "Ko'nikma",
                };
        }
    }, [locale]);

    if (!skills || skills.length === 0) {
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

    const chartData = skills.map((s) => ({
        subject: s.topic,
        value: s.skill,
        fullMark: 100,
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
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                <PolarGrid stroke="hsl(var(--border))" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 600 }}
                                />
                                <PolarRadiusAxis
                                    angle={30}
                                    domain={[0, 100]}
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                                />
                                <Radar
                                    name={copy.series}
                                    dataKey="value"
                                    stroke="#6366f1"
                                    fill="#6366f1"
                                    fillOpacity={0.45}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "12px",
                                        border: "1px solid hsl(var(--border))",
                                        background: "hsl(var(--card))",
                                        color: "hsl(var(--foreground))",
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </PremiumLock>
            </CardContent>
        </Card>
    );
}
