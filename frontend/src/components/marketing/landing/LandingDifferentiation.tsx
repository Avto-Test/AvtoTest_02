"use client";

import { ArrowRight, BrainCircuit, Radar, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

type DifferentiationCopy = {
    sectionLabel: string;
    heading: string;
    description: string;
    genericBadge: string;
    genericTitle: string;
    genericApps: string[];
    advantageBadge: string;
    advantageTitle: string;
    autotestAdvantage: string[];
    beforeAfterTitle: string;
    beforeLabel: string;
    beforeTitle: string;
    beforeDescription: string;
    afterLabel: string;
    afterTitle: string;
    afterDescription: string;
    architectureTitle: string;
    architectureTeasers: Array<{ title: string; description: string }>;
    storyLabel: string;
    storyQuote: string;
    storyByline: string;
};

const localized: Record<string, DifferentiationCopy> = {
    "uz-latn": {
        sectionLabel: "AUTOTEST farqi",
        heading: "AUTOTEST AI-native yondashuvda qurilgan, oddiy quiz ilovasiga qo'shilmagan.",
        description:
            "Ko'p platforma faqat o'tgan holatni ko'rsatadi. AUTOTEST esa keyingi natijani oldindan modellashtiradi, shuning uchun nomzod ham operator ham tezroq va aniqroq qaror qiladi.",
        genericBadge: "Oddiy test ilovalari",
        genericTitle: "Faqat keyin ko'rinadigan reaktiv analitika",
        genericApps: [
            "Faqat o'tgan urinish natijasini ko'rsatadi",
            "Barcha xatolarni bir xil deb baholaydi",
            "Keyingi o'qish rejasi foydalanuvchining o'ziga qoladi",
        ],
        advantageBadge: "AUTOTEST AI-native",
        advantageTitle: "Predictive readiness va xulqqa asoslangan qarorlar",
        autotestAdvantage: [
            "Imtihon kunidan oldin o'tish ehtimolini hisoblaydi",
            "Faqat score emas, retention va confidence holatini ham tahlil qiladi",
            "Xulq signallariga qarab eng zaif joyni ustuvor qiladi",
        ],
        beforeAfterTitle: "Oldin / Keyin: Tasodifiy tayyorgarlikdan aqlli tayyorgarlikka",
        beforeLabel: "Oldin",
        beforeTitle: "Tasodifiy test va reaktiv o'qish",
        beforeDescription: "Nomzodlar testni tartibsiz takrorlaydi va beqarorlikni score tushgach biladi.",
        afterLabel: "Keyin",
        afterTitle: "Aqlli practice va predictive readiness",
        afterDescription: "AUTOTEST confidence zaif nuqtalarni erta topib, nishonli reinforcement beradi.",
        architectureTitle: "AI Engine arxitekturasi (yuqori daraja)",
        architectureTeasers: [
            {
                title: "Behavior Signal Capture",
                description: "AUTOTEST vaqt, izchillik, mavzu siljishi va pressure-mode reaksiyasini doimiy kuzatadi.",
            },
            {
                title: "Predictive Inference Layer",
                description: "Yig'ilgan signal readiness, stability va pass probability indikatorlariga aylantiriladi.",
            },
            {
                title: "Adaptive Action Loop",
                description: "Tizim yakuniy imtihondan oldin riskni kamaytiradigan aniq keyingi qadamlarni beradi.",
            },
        ],
        storyLabel: "Natija hikoyasi (real workflowga yaqin)",
        storyQuote:
            "Men bir necha hafta 63%-68% oralig'ida qolib ketdim. AUTOTEST xavfli mavzulardagi retention beqarorligini ko'rsatdi va adaptive sessionlarni tavsiya qildi. 19 kunda pass probability 58% dan 81% ga chiqdi.",
        storyByline: "Yuqori mas'uliyatli litsenziya imtihoniga tayyorlangan nomzod",
    },
    "uz-cyrl": {
        sectionLabel: "AUTOTEST фарқи",
        heading: "AUTOTEST AI-native ёндашувда қурилган, оддий quiz иловасига қўшилмаган.",
        description:
            "Кўп платформа фақат ўтган ҳолатни кўрсатади. AUTOTEST эса кейинги натижани олдиндан моделлаштиради, шунинг учун номзод ҳам оператор ҳам тезроқ ва аниқроқ қарор қилади.",
        genericBadge: "Оддий тест иловалари",
        genericTitle: "Фақат кейин кўринадиган реактив аналитика",
        genericApps: [
            "Фақат ўтган уриниш натижасини кўрсатади",
            "Барча хатоларни бир хил деб баҳолайди",
            "Кейинги ўқиш режаси фойдаланувчининг ўзига қолади",
        ],
        advantageBadge: "AUTOTEST AI-native",
        advantageTitle: "Predictive readiness ва хулққа асосланган қарорлар",
        autotestAdvantage: [
            "Имтиҳон кунидан олдин ўтиш эҳтимолини ҳисоблайди",
            "Фақат score эмас, retention ва confidence ҳолатини ҳам таҳлил қилади",
            "Хулқ сигналларига қараб энг заиф жойни устувор қилади",
        ],
        beforeAfterTitle: "Олдин / Кейин: Тасодифий тайёргарликдан ақлли тайёргарликка",
        beforeLabel: "Олдин",
        beforeTitle: "Тасодифий тест ва реактив ўқиш",
        beforeDescription: "Номзодлар тестни тартибсиз такрорлайди ва беқарорликни score тушгач билади.",
        afterLabel: "Кейин",
        afterTitle: "Ақлли practice ва predictive readiness",
        afterDescription: "AUTOTEST confidence заиф нуқталарни эрта топиб, нишонли reinforcement беради.",
        architectureTitle: "AI Engine архитектураси (юқори даража)",
        architectureTeasers: [
            {
                title: "Behavior Signal Capture",
                description: "AUTOTEST вақт, изчиллик, мавзу силжиши ва pressure-mode реакциясини доимий кузатади.",
            },
            {
                title: "Predictive Inference Layer",
                description: "Йиғилган сигнал readiness, stability ва pass probability индикаторларига айлантирилади.",
            },
            {
                title: "Adaptive Action Loop",
                description: "Тизим якуний имтиҳондан олдин рискни камайтирадиган аниқ кейинги қадамларни беради.",
            },
        ],
        storyLabel: "Натижа ҳикояси (реал workflowга яқин)",
        storyQuote:
            "Мен бир неча ҳафта 63%-68% оралиғида қолиб кетдим. AUTOTEST хавфли мавзулардаги retention беқарорлигини кўрсатди ва adaptive sessionларни тавсия қилди. 19 кунда pass probability 58% дан 81% га чиқди.",
        storyByline: "Юқори масъулиятли лицензия имтиҳонига тайёрланган номзод",
    },
    ru: {
        sectionLabel: "Преимущество AUTOTEST",
        heading: "AUTOTEST построен как AI-native платформа, а не как обычный quiz-сервис.",
        description:
            "Большинство платформ показывают только прошлый результат. AUTOTEST моделирует следующий исход заранее, поэтому и кандидат, и оператор принимают решения быстрее и точнее.",
        genericBadge: "Обычные тест-сервисы",
        genericTitle: "Реактивная аналитика, видимая только постфактум",
        genericApps: [
            "Показывают только результат прошлой попытки",
            "Оценивают все ошибки одинаково",
            "План дальнейшей подготовки остаётся на пользователе",
        ],
        advantageBadge: "AUTOTEST AI-native",
        advantageTitle: "Predictive readiness и поведенческие решения",
        autotestAdvantage: [
            "Считает вероятность сдачи ещё до дня экзамена",
            "Анализирует не только score, но и retention/confidence",
            "Приоритизирует слабые места по поведенческим сигналам",
        ],
        beforeAfterTitle: "До / После: от хаотичной подготовки к умной стратегии",
        beforeLabel: "До",
        beforeTitle: "Случайные тесты и реактивное повторение",
        beforeDescription: "Кандидаты решают тесты хаотично и замечают нестабильность только после падения score.",
        afterLabel: "После",
        afterTitle: "Умная практика и predictive readiness",
        afterDescription: "AUTOTEST заранее находит слабые точки confidence и даёт целевое reinforcement.",
        architectureTitle: "Архитектура AI Engine (высокий уровень)",
        architectureTeasers: [
            {
                title: "Behavior Signal Capture",
                description: "AUTOTEST постоянно отслеживает время, последовательность, сдвиг тем и реакцию под давлением.",
            },
            {
                title: "Predictive Inference Layer",
                description: "Собранные сигналы превращаются в readiness, stability и pass probability индикаторы.",
            },
            {
                title: "Adaptive Action Loop",
                description: "Система предлагает точные следующие шаги, снижающие риск до финального экзамена.",
            },
        ],
        storyLabel: "История результата (близко к реальному workflow)",
        storyQuote:
            "Я несколько недель держался в диапазоне 63%-68%. AUTOTEST показал нестабильность retention в риск-темах и рекомендовал adaptive-сессии. За 19 дней pass probability выросла с 58% до 81%.",
        storyByline: "Кандидат, готовившийся к ответственному лицензионному экзамену",
    },
    en: {
        sectionLabel: "Why AUTOTEST",
        heading: "AUTOTEST is built AI-native, not layered on top of a generic quiz app.",
        description:
            "Most platforms only show what already happened. AUTOTEST models what happens next, so both candidates and operators make faster and more accurate decisions.",
        genericBadge: "Generic test apps",
        genericTitle: "Reactive analytics visible only after the fact",
        genericApps: [
            "Only shows the previous attempt result",
            "Treats all mistakes equally",
            "Leaves the next study plan to the user",
        ],
        advantageBadge: "AUTOTEST AI-native",
        advantageTitle: "Predictive readiness with behavior-driven decisions",
        autotestAdvantage: [
            "Estimates pass probability before exam day",
            "Analyzes retention and confidence, not only score",
            "Prioritizes weakest areas based on behavior signals",
        ],
        beforeAfterTitle: "Before / After: from random prep to smart preparation",
        beforeLabel: "Before",
        beforeTitle: "Random tests and reactive revision",
        beforeDescription: "Candidates repeat tests chaotically and detect instability only after score drops.",
        afterLabel: "After",
        afterTitle: "Smart practice and predictive readiness",
        afterDescription: "AUTOTEST detects weak confidence zones early and applies targeted reinforcement.",
        architectureTitle: "AI Engine architecture (high-level)",
        architectureTeasers: [
            {
                title: "Behavior Signal Capture",
                description: "AUTOTEST continuously tracks timing, consistency, topic drift, and pressure-mode response.",
            },
            {
                title: "Predictive Inference Layer",
                description: "Collected signals are transformed into readiness, stability, and pass probability indicators.",
            },
            {
                title: "Adaptive Action Loop",
                description: "The system recommends exact next steps that reduce risk before the final exam.",
            },
        ],
        storyLabel: "Outcome story (close to real workflow)",
        storyQuote:
            "I was stuck around 63%-68% for weeks. AUTOTEST exposed retention instability in high-risk topics and suggested adaptive sessions. In 19 days, pass probability moved from 58% to 81%.",
        storyByline: "Candidate preparing for a high-stakes license exam",
    },
};

const architectureIcons = [Radar, BrainCircuit, Sparkles];

export function LandingDifferentiation() {
    const { locale } = useI18n();
    const copy = localized[locale] ?? localized["uz-latn"];

    return (
        <section className="landing-fade-up section-spacing">
            <div className="container-app space-y-10">
                <div className="max-w-3xl space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.sectionLabel}</p>
                    <h2 className="section-heading">
                        {copy.heading}
                    </h2>
                    <p className="text-pretty text-muted-foreground sm:text-lg">{copy.description}</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <Card className="landing-hover-lift surface-card">
                        <CardHeader className="space-y-3">
                            <Badge variant="outline" className="w-fit">{copy.genericBadge}</Badge>
                            <CardTitle className="text-xl">{copy.genericTitle}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2.5">
                                {copy.genericApps.map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className="mt-1.5 size-1.5 rounded-full bg-muted-foreground/60" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="landing-hover-lift rounded-3xl border border-cyan-400/35 bg-gradient-to-br from-cyan-500/12 via-sky-500/8 to-emerald-500/8 shadow-[0_12px_34px_-24px_rgba(16,185,129,0.45)]">
                        <CardHeader className="space-y-3">
                            <Badge className="w-fit">{copy.advantageBadge}</Badge>
                            <CardTitle className="text-xl">{copy.advantageTitle}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2.5">
                                {copy.autotestAdvantage.map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                                        <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                <Card className="landing-hover-lift surface-card">
                    <CardHeader className="space-y-2">
                        <CardTitle className="text-xl">{copy.beforeAfterTitle}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="surface-card-soft p-4">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.beforeLabel}</p>
                                <p className="mt-2 text-sm font-medium text-foreground">{copy.beforeTitle}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{copy.beforeDescription}</p>
                            </div>
                            <div className="rounded-2xl border border-cyan-400/35 bg-gradient-to-br from-cyan-500/12 to-emerald-500/8 p-4">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.afterLabel}</p>
                                <p className="mt-2 text-sm font-medium text-foreground">{copy.afterTitle}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{copy.afterDescription}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="landing-hover-lift surface-card">
                    <CardHeader className="space-y-2">
                        <CardTitle className="text-xl">{copy.architectureTitle}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-3">
                        {copy.architectureTeasers.map((item, index) => {
                            const Icon = architectureIcons[index] ?? Sparkles;
                            return (
                                <div key={`${item.title}-${index}`} className="surface-card-soft p-4">
                                    <div className="mb-2 flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                                        <Icon className="size-4 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                <Card className="landing-hover-lift surface-card-soft">
                    <CardContent className="space-y-4 p-6">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.storyLabel}</p>
                        <blockquote className="text-pretty text-base leading-relaxed text-foreground sm:text-lg">
                            {copy.storyQuote}
                        </blockquote>
                        <p className="text-xs text-muted-foreground">{copy.storyByline}</p>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
