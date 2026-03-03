
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PremiumBadge, ReviewQueueCard } from "@/components/dashboard";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { KnowledgeMastery, TopicRetention, TopicSkill } from "@/types/analytics";
import { useI18n } from "@/components/i18n-provider";

// Dynamic imports for heavy charts
const SkillRadarChart = dynamic(() => import("../SkillRadarChart").then(mod => mod.SkillRadarChart), {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />
});

const KnowledgeConfidenceChart = dynamic(() => import("../KnowledgeConfidenceChart").then(mod => mod.KnowledgeConfidenceChart), {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />
});

const RetentionHeatmap = dynamic(() => import("../RetentionHeatmap").then(mod => mod.RetentionHeatmap), {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />
});

interface ZonePremiumProps {
    overview:
        | {
            skill_vector?: TopicSkill[];
            knowledge_mastery?: KnowledgeMastery[];
            retention_vector?: TopicRetention[];
            total_due?: number;
        }
        | null;
    user?: {
        plan?: string;
        is_premium?: boolean;
    } | null;
}

export function ZonePremium({ overview, user }: ZonePremiumProps) {
    const { t, locale } = useI18n();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const isPremium = user?.plan === "premium" || user?.is_premium === true;
    const heading = locale === "en"
        ? `${t("nav.premium")} Intelligence`
        : locale === "ru"
            ? `${t("nav.premium")} аналитика`
            : locale === "uz-cyrl"
                ? `${t("nav.premium")} таҳлил`
                : `${t("nav.premium")} tahlil`;
    const engineText = {
        sm2Title: locale === "en"
            ? "SM-2 Engine"
            : locale === "ru"
                ? "SM-2 движок"
                : locale === "uz-cyrl"
                    ? "SM-2 тизим"
                    : "SM-2 tizim",
        sm2Desc: locale === "en"
            ? "Memory stabilized"
            : locale === "ru"
                ? "Стабилизация памяти"
                : locale === "uz-cyrl"
                    ? "Хотира барқарор"
                    : "Xotira barqaror",
        bktTitle: locale === "en"
            ? "BKT Intelligence"
            : locale === "ru"
                ? "BKT аналитика"
                : locale === "uz-cyrl"
                    ? "BKT таҳлил"
                    : "BKT tahlil",
        bktDesc: locale === "en"
            ? "Active modeling"
            : locale === "ru"
                ? "Активная модель"
                : locale === "uz-cyrl"
                    ? "Фаол моделлаш"
                    : "Faol modellash",
        ebbTitle: locale === "en"
            ? "Ebbinghaus Curve"
            : locale === "ru"
                ? "Кривая Эббингауза"
                : locale === "uz-cyrl"
                    ? "Эббингауз эгри чизиғи"
                    : "Ebbinghaus egri chizig'i",
        ebbDesc: locale === "en"
            ? "Retention tracked"
            : locale === "ru"
                ? "Удержание отслеживается"
                : locale === "uz-cyrl"
                    ? "Эслаб қолиш кузатилмоқда"
                    : "Eslab qolish kuzatilmoqda",
    };

    return (
        <section className="space-y-4">
            <div
                className="flex items-center justify-between cursor-pointer md:cursor-default"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight text-foreground font-display">{heading}</h2>
                    <PremiumBadge isPremium={isPremium} />
                </div>
                <div className="md:hidden">
                    {isCollapsed ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronUp className="w-5 h-5 text-muted-foreground" />}
                </div>
            </div>

            <div className={cn(
                "rounded-2xl border bg-card/60 p-6 transition-all duration-300 overflow-hidden",
                isCollapsed ? "max-h-0 py-0 border-transparent md:max-h-none md:p-6 md:border-border" : "max-h-[2000px]"
            )}>
                <div className="grid gap-6 lg:grid-cols-2">
                    <SkillRadarChart
                        skills={overview?.skill_vector || []}
                        isPremium={isPremium}
                    />
                    <KnowledgeConfidenceChart
                        mastery={overview?.knowledge_mastery || []}
                        isPremium={isPremium}
                    />
                    <RetentionHeatmap
                        retention={overview?.retention_vector || []}
                        isPremium={isPremium}
                    />
                    <ReviewQueueCard
                        totalDue={overview?.total_due ?? 0}
                        isPremium={isPremium}
                    />
                </div>

                {/* Visual grouping of engine indicators */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-indigo-600">{engineText.sm2Title}</p>
                            <p className="text-[11px] text-muted-foreground font-medium leading-none">{engineText.sm2Desc}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-emerald-600">{engineText.bktTitle}</p>
                            <p className="text-[11px] text-muted-foreground font-medium leading-none">{engineText.bktDesc}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-blue-600">{engineText.ebbTitle}</p>
                            <p className="text-[11px] text-muted-foreground font-medium leading-none">{engineText.ebbDesc}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
