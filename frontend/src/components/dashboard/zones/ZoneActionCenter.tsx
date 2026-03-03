"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Play, Timer, ListRestart } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

interface ZoneActionCenterProps {
    pressureEnabled: boolean;
}

export function ZoneActionCenter({ pressureEnabled }: ZoneActionCenterProps) {
    const { locale } = useI18n();
    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    title: "Кейинги қадам",
                    startAdaptive: "Адаптив машқни бошлаш",
                    pressure: "Босим симуляцияси",
                    reviewDue: "Қайта кўриш мавзулари",
                };
            case "ru":
                return {
                    title: "Следующее действие",
                    startAdaptive: "Запустить адаптивную практику",
                    pressure: "Симуляция давления",
                    reviewDue: "Темы на повторение",
                };
            case "en":
                return {
                    title: "Next Action",
                    startAdaptive: "Start Adaptive Practice",
                    pressure: "Pressure Simulation",
                    reviewDue: "Review Due Topics",
                };
            default:
                return {
                    title: "Keyingi qadam",
                    startAdaptive: "Adaptiv mashqni boshlash",
                    pressure: "Bosim simulyatsiyasi",
                    reviewDue: "Qayta ko'rish mavzulari",
                };
        }
    }, [locale]);

    return (
        <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground font-display">{copy.title}</h2>
            <div className="rounded-2xl border border-border bg-muted/30 p-6">
                <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                    <Button
                        asChild
                        size="lg"
                        className="w-full md:w-auto bg-[#00B37E] hover:bg-[#009468] text-white shadow-lg transition-all h-14 px-8 font-bold text-lg rounded-xl flex items-center gap-2"
                    >
                        <Link href={`/tests?mode=adaptive&pressure=${pressureEnabled}`}>
                            <Play className="w-5 h-5 fill-current" />
                            {copy.startAdaptive}
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="secondary"
                        size="lg"
                        className="w-full md:w-auto h-14 px-8 font-semibold rounded-xl flex items-center gap-2"
                    >
                        <Link href="/tests?mode=adaptive&pressure=true">
                            <Timer className="w-5 h-5" />
                            {copy.pressure}
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="w-full md:w-auto h-14 px-8 font-semibold rounded-xl flex items-center gap-2 border-border"
                    >
                        <Link href="/review-queue">
                            <ListRestart className="w-5 h-5" />
                            {copy.reviewDue}
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
