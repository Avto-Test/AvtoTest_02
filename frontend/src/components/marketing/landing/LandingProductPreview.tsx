"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

type ProductPreviewCopy = {
    sectionLabel: string;
    heading: string;
    description: string;
    snapshotTitle: string;
    snapshotSubtitle: string;
    stats: Array<{ label: string; value: string }>;
    trendTitle: string;
    trendValue: string;
    confidenceTitle: string;
    confidenceSubtitle: string;
    riskLabel: string;
    riskTitle: string;
    riskDescription: string;
    topicAccuracyLabel: string;
    topicRows: Array<{ topic: string; accuracy: string }>;
};

const localized: Record<string, ProductPreviewCopy> = {
    "uz-latn": {
        sectionLabel: "Mahsulot ko'rinishi",
        heading: "Yagona dashboardda aniq va boshqariladigan ko'rinish.",
        description: "AUTOTEST foydalanuvchi xulqini ortiqcha shovqinsiz, aniq confidence va retention signaliga aylantiradi.",
        snapshotTitle: "Natija snapshot",
        snapshotSubtitle: "Dashboard modulining jonli ko'rinishi",
        stats: [
            { label: "O'tish ehtimoli", value: "78%" },
            { label: "Retention barqarorligi", value: "83%" },
            { label: "Readiness", value: "91" },
        ],
        trendTitle: "Trend ko'rinishi",
        trendValue: "+12.4% 7 kunlik o'sish",
        confidenceTitle: "AI confidence panel",
        confidenceSubtitle: "Zaif zonalar bo'yicha reinforcement",
        riskLabel: "Asosiy risk",
        riskTitle: "Xavfli vaziyatlarda beqarorlik",
        riskDescription: "Tavsiya: 2 ta fokuslangan adaptive sessiya, har birida 18 tadan savol.",
        topicAccuracyLabel: "Mavzu aniqligi",
        topicRows: [
            { topic: "Yo'l ustuvorligi", accuracy: "91%" },
            { topic: "Belgi tanish", accuracy: "87%" },
            { topic: "Xavfli vaziyat", accuracy: "72%" },
            { topic: "Tezlik nazorati", accuracy: "84%" },
        ],
    },
    "uz-cyrl": {
        sectionLabel: "Маҳсулот кўриниши",
        heading: "Ягона дашбордда аниқ ва бошқариладиган кўриниш.",
        description: "AUTOTEST фойдаланувчи хулқини ортиқча шовқинсиз, аниқ confidence ва retention сигналига айлантиради.",
        snapshotTitle: "Натижа snapshot",
        snapshotSubtitle: "Дашборд модулининг жонли кўриниши",
        stats: [
            { label: "Ўтиш эҳтимоли", value: "78%" },
            { label: "Retention барқарорлиги", value: "83%" },
            { label: "Readiness", value: "91" },
        ],
        trendTitle: "Trend кўриниши",
        trendValue: "+12.4% 7 кунлик ўсиш",
        confidenceTitle: "AI confidence panel",
        confidenceSubtitle: "Заиф зоналар бўйича reinforcement",
        riskLabel: "Асосий риск",
        riskTitle: "Хавфли вазиятларда беқарорлик",
        riskDescription: "Тавсия: 2 та фокусланган adaptive сессия, ҳар бирида 18 тадан савол.",
        topicAccuracyLabel: "Мавзу аниқлиги",
        topicRows: [
            { topic: "Йўл устуворлиги", accuracy: "91%" },
            { topic: "Белги таниш", accuracy: "87%" },
            { topic: "Хавфли вазият", accuracy: "72%" },
            { topic: "Тезлик назорати", accuracy: "84%" },
        ],
    },
    ru: {
        sectionLabel: "Вид продукта",
        heading: "Понятный и управляемый обзор в едином дашборде.",
        description: "AUTOTEST превращает поведение пользователя в точные confidence и retention сигналы без лишнего шума.",
        snapshotTitle: "Snapshot результата",
        snapshotSubtitle: "Живой вид dashboard-модуля",
        stats: [
            { label: "Вероятность сдачи", value: "78%" },
            { label: "Стабильность retention", value: "83%" },
            { label: "Readiness", value: "91" },
        ],
        trendTitle: "Обзор тренда",
        trendValue: "+12.4% рост за 7 дней",
        confidenceTitle: "AI confidence panel",
        confidenceSubtitle: "Reinforcement по слабым зонам",
        riskLabel: "Ключевой риск",
        riskTitle: "Нестабильность в опасных ситуациях",
        riskDescription: "Рекомендация: 2 фокусных adaptive-сессии по 18 вопросов.",
        topicAccuracyLabel: "Точность по темам",
        topicRows: [
            { topic: "Приоритет на дороге", accuracy: "91%" },
            { topic: "Распознавание знаков", accuracy: "87%" },
            { topic: "Опасные ситуации", accuracy: "72%" },
            { topic: "Контроль скорости", accuracy: "84%" },
        ],
    },
    en: {
        sectionLabel: "Product Preview",
        heading: "Clear and controllable view in a single dashboard.",
        description: "AUTOTEST turns user behavior into precise confidence and retention signals without noisy clutter.",
        snapshotTitle: "Result snapshot",
        snapshotSubtitle: "Live view of dashboard module",
        stats: [
            { label: "Pass probability", value: "78%" },
            { label: "Retention stability", value: "83%" },
            { label: "Readiness", value: "91" },
        ],
        trendTitle: "Trend overview",
        trendValue: "+12.4% growth in 7 days",
        confidenceTitle: "AI confidence panel",
        confidenceSubtitle: "Reinforcement by weak zones",
        riskLabel: "Primary risk",
        riskTitle: "Instability in hazardous scenarios",
        riskDescription: "Recommendation: 2 focused adaptive sessions with 18 questions each.",
        topicAccuracyLabel: "Topic accuracy",
        topicRows: [
            { topic: "Road priority", accuracy: "91%" },
            { topic: "Sign recognition", accuracy: "87%" },
            { topic: "Hazard scenarios", accuracy: "72%" },
            { topic: "Speed control", accuracy: "84%" },
        ],
    },
};

export function LandingProductPreview() {
    const { locale } = useI18n();
    const copy = localized[locale] ?? localized["uz-latn"];

    return (
        <section className="landing-fade-up section-spacing border-y border-border/70 bg-gradient-to-b from-background/50 via-background to-background/45">
            <div className="container-app space-y-10">
                <div className="max-w-3xl space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.sectionLabel}</p>
                    <h2 className="section-heading">
                        {copy.heading}
                    </h2>
                    <p className="text-pretty text-muted-foreground sm:text-lg">{copy.description}</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                    <Card className="landing-hover-lift surface-card lg:col-span-2">
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-base">{copy.snapshotTitle}</CardTitle>
                            <p className="text-xs text-muted-foreground">{copy.snapshotSubtitle}</p>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid gap-3 sm:grid-cols-3">
                                {copy.stats.map((item) => (
                                    <div key={item.label} className="surface-card-soft p-3">
                                        <p className="text-xs text-muted-foreground">{item.label}</p>
                                        <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="surface-card-soft p-4">
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-sm font-medium text-foreground">{copy.trendTitle}</p>
                                    <p className="text-xs text-success">{copy.trendValue}</p>
                                </div>
                                <div className="flex h-28 items-end gap-2">
                                    {[26, 30, 36, 42, 48, 51, 58, 63].map((height, index) => (
                                        <div
                                            key={height}
                                            className="flex-1 rounded-t-md bg-primary/75 transition-all duration-200 hover:bg-primary"
                                            style={{ height: `${height}%`, animationDelay: `${index * 45}ms` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="landing-hover-lift surface-card">
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-base">{copy.confidenceTitle}</CardTitle>
                            <p className="text-xs text-muted-foreground">{copy.confidenceSubtitle}</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="surface-card-soft p-3">
                                <p className="text-xs text-muted-foreground">{copy.riskLabel}</p>
                                <p className="mt-1 text-sm font-medium text-foreground">{copy.riskTitle}</p>
                                <p className="mt-2 text-xs text-muted-foreground">{copy.riskDescription}</p>
                            </div>

                            <div className="surface-card-soft p-3">
                                <p className="mb-2 text-xs text-muted-foreground">{copy.topicAccuracyLabel}</p>
                                <div className="space-y-2">
                                    {copy.topicRows.map((topic) => (
                                        <div key={topic.topic} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{topic.topic}</span>
                                            <span className="font-mono font-semibold text-foreground">{topic.accuracy}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}
