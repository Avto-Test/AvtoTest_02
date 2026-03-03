"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

type WorkflowStep = {
    step: string;
    title: string;
    description: string;
};

type LocalizedCopy = {
    sectionLabel: string;
    heading: string;
    stepLabel: string;
    steps: WorkflowStep[];
};

const localized: Record<string, LocalizedCopy> = {
    "uz-latn": {
        sectionLabel: "Qanday ishlaydi",
        heading: "Kuzatish. Tahlil. Natija.",
        stepLabel: "Qadam",
        steps: [
            {
                step: "01",
                title: "Kuzatish",
                description: "Har bir yakunlangan testdan eventlar olinadi: mavzu aniqligi, urinish ritmi va barqarorlik.",
            },
            {
                step: "02",
                title: "Tahlil",
                description: "O'tish ehtimoli, retention barqarorligi va funnel yo'qotishlari model asosida hisoblanadi.",
            },
            {
                step: "03",
                title: "Optimallashtirish",
                description: "Nomzod va operatorga keyingi aniq qadamlari berilib, natija va konversiya birga yaxshilanadi.",
            },
        ],
    },
    "uz-cyrl": {
        sectionLabel: "Қандай ишлайди",
        heading: "Кузатиш. Таҳлил. Натижа.",
        stepLabel: "Қадам",
        steps: [
            {
                step: "01",
                title: "Кузатиш",
                description: "Ҳар бир якунланган тестдан eventлар олинади: мавзу аниқлиги, уриниш ритми ва барқарорлик.",
            },
            {
                step: "02",
                title: "Таҳлил",
                description: "Ўтиш эҳтимоли, retention барқарорлиги ва funnel йўқотишлари модел асосида ҳисобланади.",
            },
            {
                step: "03",
                title: "Оптималлаштириш",
                description: "Номзод ва операторга кейинги аниқ қадамлари берилиб, натижа ва конверсия бирга яхшиланади.",
            },
        ],
    },
    ru: {
        sectionLabel: "Как это работает",
        heading: "Сбор. Анализ. Результат.",
        stepLabel: "Шаг",
        steps: [
            {
                step: "01",
                title: "Сбор сигналов",
                description: "Из каждого завершённого теста собираются события: точность по темам, ритм попыток и стабильность.",
            },
            {
                step: "02",
                title: "Анализ",
                description: "Вероятность сдачи, устойчивость retention и потери в funnel считаются на основе модели.",
            },
            {
                step: "03",
                title: "Оптимизация",
                description: "Кандидат и оператор получают точные следующие шаги для роста результата и конверсии.",
            },
        ],
    },
    en: {
        sectionLabel: "How It Works",
        heading: "Track. Analyze. Improve.",
        stepLabel: "Step",
        steps: [
            {
                step: "01",
                title: "Tracking",
                description: "Each completed test produces signals: topic accuracy, attempt rhythm, and consistency.",
            },
            {
                step: "02",
                title: "Analysis",
                description: "Pass probability, retention stability, and funnel losses are computed by the model.",
            },
            {
                step: "03",
                title: "Optimization",
                description: "Candidates and operators get precise next actions to improve both outcomes and conversion.",
            },
        ],
    },
};

export function LandingHowItWorks() {
    const { locale } = useI18n();
    const copy = localized[locale] ?? localized["uz-latn"];

    return (
        <section className="landing-fade-up section-spacing border-y border-border/70 bg-gradient-to-b from-background/45 via-background to-background/55">
            <div className="container-app space-y-10">
                <div className="max-w-2xl space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.sectionLabel}</p>
                    <h2 className="section-heading">
                        {copy.heading}
                    </h2>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                    {copy.steps.map((item) => (
                        <Card key={item.step} className="landing-hover-lift surface-card">
                            <CardHeader className="space-y-3">
                                <span className="inline-flex w-fit rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                    {copy.stepLabel} {item.step}
                                </span>
                                <CardTitle className="text-xl">{item.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
