"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

interface LandingCtaFooterProps {
    isAuthenticated: boolean;
}

type CtaFooterCopy = {
    heading: string;
    description: string;
    primaryAuth: string;
    primaryGuest: string;
    secondary: string;
    note: string;
};

const localized: Record<string, CtaFooterCopy> = {
    "uz-latn": {
        heading: "Tayyorlanishni keyingi bosqichga olib chiqishga tayyormisiz?",
        description: "Bepul rejada boshlang, kerak paytda Proga o'tib, chuqur signal va premium intellektdan foydalaning.",
        primaryAuth: "Panelga o'tish",
        primaryGuest: "Bugun bepul boshlang",
        secondary: "Tariflarni solishtirish",
        note: "Majburiy muddat yo'q. Proga o'tishdan oldin bepul workflow faol qoladi.",
    },
    "uz-cyrl": {
        heading: "Тайёрланишни кейинги босқичга олиб чиқишга тайёрмисиз?",
        description: "Бепул режада бошланг, керак пайтда Proга ўтиб, чуқур сигнал ва premium интеллектдан фойдаланинг.",
        primaryAuth: "Панелга ўтиш",
        primaryGuest: "Бугун бепул бошланг",
        secondary: "Тарифларни солиштириш",
        note: "Мажбурий муддат йўқ. Proга ўтишдан олдин бепул workflow фаол қолади.",
    },
    ru: {
        heading: "Готовы вывести подготовку на следующий уровень?",
        description: "Начните на бесплатном плане и переходите на Pro, когда понадобятся глубокие сигналы и premium-интеллект.",
        primaryAuth: "Перейти в панель",
        primaryGuest: "Начать бесплатно сегодня",
        secondary: "Сравнить тарифы",
        note: "Без обязательного срока. Бесплатный workflow остаётся активным до перехода на Pro.",
    },
    en: {
        heading: "Ready to move your preparation to the next level?",
        description: "Start on the free plan and switch to Pro when you need deeper signals and premium intelligence.",
        primaryAuth: "Go to dashboard",
        primaryGuest: "Start free today",
        secondary: "Compare pricing",
        note: "No mandatory term. Free workflow stays active before switching to Pro.",
    },
};

export function LandingCtaFooter({ isAuthenticated }: LandingCtaFooterProps) {
    const { locale } = useI18n();
    const copy = localized[locale] ?? localized["uz-latn"];

    const primaryHref = isAuthenticated ? "/dashboard" : "/register";
    const primaryLabel = isAuthenticated ? copy.primaryAuth : copy.primaryGuest;

    return (
        <section className="landing-fade-up section-spacing pt-8">
            <div className="container-app">
                <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/14 via-card/95 to-emerald-500/12 p-8 shadow-[0_18px_46px_-28px_rgba(15,118,110,0.55)] sm:p-10">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            {copy.heading}
                        </h2>
                        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
                            {copy.description}
                        </p>

                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <Button asChild size="lg" className="h-11 px-7">
                                <Link href={primaryHref}>
                                    {primaryLabel}
                                    <ArrowRight className="ml-1 size-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="h-11 px-7">
                                <Link href="/pricing">{copy.secondary}</Link>
                            </Button>
                        </div>

                        <p className="mt-4 text-xs text-muted-foreground">{copy.note}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
