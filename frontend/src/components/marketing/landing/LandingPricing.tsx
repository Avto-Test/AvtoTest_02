"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

interface Plan {
    name: string;
    price: string;
    description: string;
    points: string[];
    ctaLabel: string;
    ctaHref: string;
    external?: boolean;
    highlighted?: boolean;
}

interface LandingPricingProps {
    isAuthenticated: boolean;
}

type PricingCopy = {
    sectionLabel: string;
    heading: string;
    popularBadge: string;
    freeCtaAuth: string;
    freeCtaGuest: string;
    proCta: string;
    enterpriseCta: string;
    plans: Array<Omit<Plan, "ctaLabel" | "ctaHref"> & { id: "free" | "pro" | "enterprise"; external?: boolean; highlighted?: boolean }>;
};

const localized: Record<string, PricingCopy> = {
    "uz-latn": {
        sectionLabel: "Tariflar",
        heading: "Yakka tayyorgarlikdan jamoaviy boshqaruvgacha moslashadigan tariflar.",
        popularBadge: "Eng ommabop",
        freeCtaAuth: "Panelga o'tish",
        freeCtaGuest: "Bepul boshlash",
        proCta: "Proga o'tish",
        enterpriseCta: "Savdo bo'limi",
        plans: [
            {
                id: "free",
                name: "Bepul",
                price: "$0",
                description: "Asosiy tayyorgarlikni boshlash uchun.",
                points: ["Amaliy testlar", "Asosiy natija ko'rinishi", "Oddiy progress tarixi"],
            },
            {
                id: "pro",
                name: "Pro",
                price: "$19/mo",
                description: "Natijani maksimal qilmoqchi bo'lganlar uchun.",
                points: ["O'tish ehtimoli va confidence", "Retention hamda stability nazorati", "Adaptive reinforcement tavsiyalari"],
                highlighted: true,
            },
            {
                id: "enterprise",
                name: "Korporativ",
                price: "Custom",
                description: "Jamoalar va o'quv markazlari uchun.",
                points: ["Admin funnel intelligence", "Leak va anomaly monitoring", "Alohida joriy etish yordami"],
                external: true,
            },
        ],
    },
    "uz-cyrl": {
        sectionLabel: "Тарифлар",
        heading: "Якка тайёргарликдан жамоавий бошқарувгача мослашадиган тарифлар.",
        popularBadge: "Энг оммабоп",
        freeCtaAuth: "Панелга ўтиш",
        freeCtaGuest: "Бепул бошлаш",
        proCta: "Proга ўтиш",
        enterpriseCta: "Савдо бўлими",
        plans: [
            {
                id: "free",
                name: "Бепул",
                price: "$0",
                description: "Асосий тайёргарликни бошлаш учун.",
                points: ["Амалий тестлар", "Асосий натижа кўриниши", "Оддий progress тарихи"],
            },
            {
                id: "pro",
                name: "Pro",
                price: "$19/mo",
                description: "Натижани максимал қилмоқчи бўлганлар учун.",
                points: ["Ўтиш эҳтимоли ва confidence", "Retention ҳамда stability назорати", "Adaptive reinforcement тавсиялари"],
                highlighted: true,
            },
            {
                id: "enterprise",
                name: "Корпоратив",
                price: "Custom",
                description: "Жамоалар ва ўқув марказлари учун.",
                points: ["Admin funnel intelligence", "Leak ва anomaly monitoring", "Алоҳида жорий этиш ёрдами"],
                external: true,
            },
        ],
    },
    ru: {
        sectionLabel: "Тарифы",
        heading: "Тарифы от индивидуальной подготовки до командного управления.",
        popularBadge: "Самый популярный",
        freeCtaAuth: "Перейти в панель",
        freeCtaGuest: "Начать бесплатно",
        proCta: "Перейти на Pro",
        enterpriseCta: "Отдел продаж",
        plans: [
            {
                id: "free",
                name: "Бесплатно",
                price: "$0",
                description: "Для старта базовой подготовки.",
                points: ["Практические тесты", "Базовый обзор результатов", "Простая история прогресса"],
            },
            {
                id: "pro",
                name: "Pro",
                price: "$19/mo",
                description: "Для тех, кто хочет максимального результата.",
                points: ["Вероятность сдачи и confidence", "Контроль retention и stability", "Рекомендации adaptive reinforcement"],
                highlighted: true,
            },
            {
                id: "enterprise",
                name: "Корпоративный",
                price: "Custom",
                description: "Для команд и учебных центров.",
                points: ["Admin funnel intelligence", "Leak и anomaly monitoring", "Отдельная помощь по внедрению"],
                external: true,
            },
        ],
    },
    en: {
        sectionLabel: "Pricing",
        heading: "Pricing that scales from solo preparation to team-level management.",
        popularBadge: "Most popular",
        freeCtaAuth: "Go to dashboard",
        freeCtaGuest: "Start free",
        proCta: "Go Pro",
        enterpriseCta: "Contact sales",
        plans: [
            {
                id: "free",
                name: "Free",
                price: "$0",
                description: "To start with core preparation.",
                points: ["Practice tests", "Basic result overview", "Simple progress history"],
            },
            {
                id: "pro",
                name: "Pro",
                price: "$19/mo",
                description: "For users who want to maximize outcomes.",
                points: ["Pass probability and confidence", "Retention and stability monitoring", "Adaptive reinforcement recommendations"],
                highlighted: true,
            },
            {
                id: "enterprise",
                name: "Enterprise",
                price: "Custom",
                description: "For teams and training centers.",
                points: ["Admin funnel intelligence", "Leak and anomaly monitoring", "Dedicated implementation support"],
                external: true,
            },
        ],
    },
};

export function LandingPricing({ isAuthenticated }: LandingPricingProps) {
    const { locale } = useI18n();
    const copy = localized[locale] ?? localized["uz-latn"];

    const plans: Plan[] = copy.plans.map((plan) => {
        if (plan.id === "free") {
            return {
                ...plan,
                ctaLabel: isAuthenticated ? copy.freeCtaAuth : copy.freeCtaGuest,
                ctaHref: isAuthenticated ? "/dashboard" : "/register",
            };
        }
        if (plan.id === "pro") {
            return {
                ...plan,
                ctaLabel: copy.proCta,
                ctaHref: "/upgrade",
            };
        }
        return {
            ...plan,
            ctaLabel: copy.enterpriseCta,
            ctaHref: "mailto:sales@autotest.ai",
        };
    });

    return (
        <section id="pricing" className="landing-fade-up section-spacing">
            <div className="container-app space-y-10">
                <div className="max-w-3xl space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.sectionLabel}</p>
                    <h2 className="section-heading">
                        {copy.heading}
                    </h2>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={plan.highlighted
                                ? "landing-hover-lift rounded-3xl border border-cyan-400/35 bg-gradient-to-br from-cyan-500/12 via-sky-500/8 to-emerald-500/8 shadow-[0_12px_34px_-24px_rgba(16,185,129,0.45)]"
                                : "landing-hover-lift surface-card"}
                        >
                            <CardHeader className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                    {plan.highlighted ? <Badge>{copy.popularBadge}</Badge> : null}
                                </div>
                                <p className="text-3xl font-semibold tracking-tight text-foreground">{plan.price}</p>
                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <ul className="space-y-2.5">
                                    {plan.points.map((point) => (
                                        <li key={point} className="flex items-start gap-2 text-sm text-foreground">
                                            <Check className="mt-0.5 size-4 text-success" />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Button asChild className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                                    {plan.external ? (
                                        <a href={plan.ctaHref}>{plan.ctaLabel}</a>
                                    ) : (
                                        <Link href={plan.ctaHref}>{plan.ctaLabel}</Link>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
