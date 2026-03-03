"use client";

import type { ComponentType } from "react";
import {
    Activity,
    Bot,
    ChartNoAxesColumn,
    Gauge,
    ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

interface FeatureItem {
    title: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
}

type FeaturesCopy = {
    sectionLabel: string;
    heading: string;
    description: string;
    features: Array<{ title: string; description: string }>;
};

const icons = [Bot, ChartNoAxesColumn, Gauge, Activity, ShieldCheck];

const localized: Record<string, FeaturesCopy> = {
    "uz-latn": {
        sectionLabel: "Platforma imkoniyatlari",
        heading: "O'quvchi va operator uchun bir platformada to'liq analitika.",
        description:
            "AUTOTEST oddiy savol banki emas. Bu tayyorgarlik natijalari va product funnel ko'rsatkichlarini yagona o'lchanadigan tizimga birlashtiradi.",
        features: [
            {
                title: "AI asosidagi tahlil",
                description: "Real javob xulqidan score trayektoriyasi, readiness trendi va confidence signallari yaratiladi.",
            },
            {
                title: "Premium konversiya analitikasi",
                description: "Premium ko'rilishi, klik va muvaffaqiyat eventlari bitta loopda o'lchanadi.",
            },
            {
                title: "Funnel tracking",
                description: "Premium blokdan upgrade successgacha bo'lgan yo'qotish nuqtalari aniq ko'rinadi.",
            },
            {
                title: "Trend va anomaliya aniqlash",
                description: "Momentum siljishi va conversion anomaliyalari erta bosqichda aniqlanadi.",
            },
            {
                title: "Admin darajasida nazorat",
                description: "Operatorlar tez va aniq qaror qabul qilishi uchun tavsiya signal va severity konteksti beriladi.",
            },
        ],
    },
    "uz-cyrl": {
        sectionLabel: "Платформа имкониятлари",
        heading: "Ўқувчи ва оператор учун бир платформада тўлиқ аналитика.",
        description:
            "AUTOTEST оддий савол банки эмас. Бу тайёргарлик натижалари ва product funnel кўрсаткичларини ягона ўлчанадиган тизимга бирлаштиради.",
        features: [
            {
                title: "AI асосидаги таҳлил",
                description: "Реал жавоб хулқидан score траекторияси, readiness тренди ва confidence сигналлари яратилади.",
            },
            {
                title: "Premium конверсия аналитикаси",
                description: "Premium кўрилиши, клик ва муваффақият eventлари битта loopда ўлчанади.",
            },
            {
                title: "Funnel tracking",
                description: "Premium блокдан upgrade successгача бўлган йўқотиш нуқталари аниқ кўринади.",
            },
            {
                title: "Trend ва аномалия аниқлаш",
                description: "Momentum силжиши ва conversion аномалиялари эрта босқичда аниқланади.",
            },
            {
                title: "Admin даражасида назорат",
                description: "Операторлар тез ва аниқ қарор қабул қилиши учун тавсия сигнал ва severity контексти берилади.",
            },
        ],
    },
    ru: {
        sectionLabel: "Возможности платформы",
        heading: "Полная аналитика для ученика и оператора в одной платформе.",
        description:
            "AUTOTEST - это не просто банк вопросов. Платформа объединяет метрики подготовки и product funnel в единую измеримую систему.",
        features: [
            {
                title: "AI-аналитика",
                description: "Из поведенческих ответов формируются траектория score, тренд readiness и confidence-сигналы.",
            },
            {
                title: "Аналитика premium-конверсии",
                description: "Просмотры premium, клики и события успеха измеряются в одном loop-е.",
            },
            {
                title: "Funnel tracking",
                description: "Точки потерь от premium-блока до upgrade success видны прозрачно.",
            },
            {
                title: "Тренды и аномалии",
                description: "Смещение momentum и аномалии conversion определяются на раннем этапе.",
            },
            {
                title: "Контроль на уровне admin",
                description: "Операторы получают рекомендательные сигналы и severity-контекст для быстрых решений.",
            },
        ],
    },
    en: {
        sectionLabel: "Platform Capabilities",
        heading: "Full analytics in one platform for learners and operators.",
        description:
            "AUTOTEST is not just a question bank. It combines preparation outcomes and product funnel metrics into one measurable system.",
        features: [
            {
                title: "AI-driven analysis",
                description: "Real answer behavior is transformed into score trajectory, readiness trend, and confidence signals.",
            },
            {
                title: "Premium conversion analytics",
                description: "Premium views, clicks, and success events are measured in a single loop.",
            },
            {
                title: "Funnel tracking",
                description: "Drop-off points from premium block to upgrade success are clearly visible.",
            },
            {
                title: "Trend and anomaly detection",
                description: "Momentum shifts and conversion anomalies are detected early.",
            },
            {
                title: "Admin-grade control",
                description: "Operators receive recommendation signals and severity context for faster decisions.",
            },
        ],
    },
};

export function LandingFeatures() {
    const { locale } = useI18n();
    const copy = localized[locale] ?? localized["uz-latn"];

    const features: FeatureItem[] = copy.features.map((feature, index) => ({
        ...feature,
        icon: icons[index] ?? Bot,
    }));

    return (
        <section id="analytics-demo" className="landing-fade-up section-spacing">
            <div className="container-app space-y-12">
                <div className="max-w-3xl space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.sectionLabel}</p>
                    <h2 className="section-heading">
                        {copy.heading}
                    </h2>
                    <p className="text-pretty text-muted-foreground sm:text-lg">{copy.description}</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {features.map((feature) => (
                        <Card key={feature.title} className="landing-hover-lift surface-card transition-all duration-200">
                            <CardHeader className="space-y-4">
                                <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                                    <feature.icon className="size-5 text-primary" />
                                </div>
                                <CardTitle className="text-lg">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
