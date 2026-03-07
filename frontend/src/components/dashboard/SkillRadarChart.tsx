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
                    title: "РљСћРЅРёРєРјР° РІРµРєС‚РѕСЂРё",
                    desc: "РњР°РІР·СѓР»Р°СЂ Р±СћР№РёС‡Р° РєСћРЅРёРєРјР° РґР°СЂР°Р¶Р°РЅРіРёР·.",
                    empty: "РљСћРЅРёРєРјР° РїСЂРѕС„РёР»Рё С€Р°РєР»Р»Р°РЅРёС€Рё СѓС‡СѓРЅ РјР°С€Т›РЅРё РґР°РІРѕРј СЌС‚С‚РёСЂРёРЅРі.",
                    lockTitle: "РљСћРЅРёРєРјР° С‚Р°ТіР»РёР»РёРЅРё РѕС‡РёС€",
                    lockDesc: "РњР°РІР·СѓР»Р°СЂ Р±СћР№РёС‡Р° Р±Р°С‚Р°С„СЃРёР» РєСћРЅРёРєРјР° С…Р°СЂРёС‚Р°СЃРёРЅРё РєСћСЂРёРЅРі",
                    series: "РљСћРЅРёРєРјР°",
                };
            case "ru":
                return {
                    title: "Р’РµРєС‚РѕСЂ РЅР°РІС‹РєРѕРІ",
                    desc: "Р’Р°С€ СѓСЂРѕРІРµРЅСЊ РїРѕ С‚РµРјР°Рј.",
                    empty: "РџСЂРѕРґРѕР»Р¶Р°Р№С‚Рµ РїСЂР°РєС‚РёРєСѓ, С‡С‚РѕР±С‹ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ РїСЂРѕС„РёР»СЊ РЅР°РІС‹РєРѕРІ.",
                    lockTitle: "РћС‚РєСЂС‹С‚СЊ Р°РЅР°Р»РёР· РЅР°РІС‹РєРѕРІ",
                    lockDesc: "РЎРјРѕС‚СЂРёС‚Рµ РїРѕРґСЂРѕР±РЅСѓСЋ РєР°СЂС‚Сѓ СѓСЂРѕРІРЅСЏ РїРѕ С‚РµРјР°Рј",
                    series: "РќР°РІС‹Рє",
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
                    <div className="h-[300px] min-h-[220px] w-full min-w-0 pt-4">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
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
