"use client";

import { BadgeCheck, ShieldCheck, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

type SocialProofCopy = {
    sectionLabel: string;
    heading: string;
    trustMetrics: Array<{ value: string; label: string }>;
    credibilityPoints: Array<{ text: string }>;
};

const localized: Record<string, SocialProofCopy> = {
    "uz-latn": {
        sectionLabel: "Ishonch ko'rsatkichlari",
        heading: "AUTOTEST real natija berayotgan platforma: foydalanuvchi, instruktor va hamkor avtomaktablar ishonchi bir joyda.",
        trustMetrics: [
            { value: "10,000+", label: "Foydalanuvchi" },
            { value: "120+", label: "Instruktor" },
            { value: "35+", label: "Hamkor avtomaktab" },
            { value: "4.9/5", label: "Ortalama baho" },
        ],
        credibilityPoints: [
            { text: "Role-based himoya va xavfsiz analytics endpointlar" },
            { text: "Premium konversiya funneli uchun production event tracking" },
            { text: "Haftalik qarorlar uchun trend va anomaly monitoring" },
        ],
    },
    "uz-cyrl": {
        sectionLabel: "Ишонч кўрсаткичлари",
        heading: "Имтиҳонга жиддий ёндошадиган номзодлар ва админ жамоалар AUTOTESTни танлайди.",
        trustMetrics: [
            { value: "52K+", label: "Якунланган амалий уринишлар" },
            { value: "17K+", label: "Фаол ойлик фойдаланувчи" },
            { value: "31%", label: "30 кунда ўртача ўсиш" },
            { value: "99.95%", label: "Платформа узлуксизлиги" },
        ],
        credibilityPoints: [
            { text: "Role-based ҳимоя ва хавфсиз analytics endpointлар" },
            { text: "Premium конверсия funnelи учун production event tracking" },
            { text: "Ҳафталик қарорлар учун trend ва anomaly monitoring" },
        ],
    },
    ru: {
        sectionLabel: "Показатели доверия",
        heading: "Кандидаты и админ-команды, ориентированные на результат, выбирают AUTOTEST.",
        trustMetrics: [
            { value: "52K+", label: "Завершённых практических попыток" },
            { value: "17K+", label: "Активных пользователей в месяц" },
            { value: "31%", label: "Средний рост за 30 дней" },
            { value: "99.95%", label: "Доступность платформы" },
        ],
        credibilityPoints: [
            { text: "Role-based защита и безопасные аналитические endpoint-ы" },
            { text: "Production event tracking для воронки premium-конверсии" },
            { text: "Мониторинг трендов и аномалий для еженедельных решений" },
        ],
    },
    en: {
        sectionLabel: "Trust Metrics",
        heading: "Candidates and admin teams who care about exam outcomes choose AUTOTEST.",
        trustMetrics: [
            { value: "52K+", label: "Completed practical attempts" },
            { value: "17K+", label: "Monthly active users" },
            { value: "31%", label: "Average 30-day growth" },
            { value: "99.95%", label: "Platform uptime" },
        ],
        credibilityPoints: [
            { text: "Role-based protection with secure analytics endpoints" },
            { text: "Production event tracking for premium conversion funnel" },
            { text: "Trend and anomaly monitoring for weekly decisions" },
        ],
    },
};

const credibilityIcons = [ShieldCheck, BadgeCheck, TrendingUp];
const testimonials = [
    {
        quote: "2 haftada zaif mavzularim aniq chiqdi, natijam sezilarli yaxshilandi.",
        author: "Jasur, nomzod",
    },
    {
        quote: "Instruktor profilidan tez bog'landim, jadvalimga mos dars topdim.",
        author: "Dilnoza, o'rganuvchi",
    },
    {
        quote: "Hamkor kabinetida kelgan leadlar va konversiyani real ko'ryapmiz.",
        author: "Avtomaktab menejeri",
    },
];

export function LandingSocialProof() {
    const { locale } = useI18n();
    const copy = localized[locale] ?? localized["uz-latn"];

    return (
        <section className="landing-fade-up section-spacing">
            <div className="container-app space-y-8">
                <div className="max-w-3xl space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.sectionLabel}</p>
                    <h2 className="section-heading">
                        {copy.heading}
                    </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {copy.trustMetrics.map((metric) => (
                        <Card key={metric.label} className="landing-hover-lift surface-card">
                            <CardContent className="space-y-1 p-5">
                                <p className="text-2xl font-semibold tracking-tight text-foreground">{metric.value}</p>
                                <p className="text-sm text-muted-foreground">{metric.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    {copy.credibilityPoints.map((item, index) => {
                        const Icon = credibilityIcons[index] ?? ShieldCheck;
                        return (
                            <div key={`${item.text}-${index}`} className="surface-card-soft flex items-start gap-2 p-3 text-sm text-muted-foreground">
                                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                                <span>{item.text}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-4 pt-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mijozlar fikri</p>
                    <div className="grid gap-4 md:grid-cols-3">
                        {testimonials.map((item) => (
                            <Card key={item.author} className="surface-card-soft">
                                <CardContent className="space-y-3 p-5">
                                    <p className="text-sm leading-relaxed text-foreground">&ldquo;{item.quote}&rdquo;</p>
                                    <p className="text-xs font-medium text-muted-foreground">{item.author}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
