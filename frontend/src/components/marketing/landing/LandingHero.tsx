"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

interface LandingHeroProps {
    isAuthenticated: boolean;
}

type HeroCopy = {
    badge: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    primaryAuth: string;
    primaryGuest: string;
    secondary: string;
    highlights: [string, string, string];
    panelTitle: string;
    panelLive: string;
    signals: Array<{ label: string; value: string }>;
    topicAccuracy: string;
    last7Days: string;
    topics: Array<{ label: string; value: string }>;
};

const localized: Record<string, HeroCopy> = {
    "uz-latn": {
        badge: "Real imtihon uchun aqlli tayyorgarlik",
        titleLead: "Haydovchilik imtihonini",
        titleAccent: "ishonch bilan topshiring",
        description:
            "AUTOTEST har bir urinishdan signal olib, siz uchun eng muhim bo'lgan mavzularni ustuvor qiladi. Natija: tartibli tayyorgarlik, yuqori ehtimol, kamroq vaqt yo'qotish.",
        primaryAuth: "Panelga o'tish",
        primaryGuest: "Bepul boshlash",
        secondary: "Analitika demosi",
        highlights: ["Karta talab qilinmaydi", "Tez ro'yxatdan o'tish", "Ma'lumotlar himoyalangan"],
        panelTitle: "Dashboard ko'rinishi",
        panelLive: "Jonli signal",
        signals: [
            { label: "O'tish ehtimoli", value: "78%" },
            { label: "Barqarorlik indeksi", value: "83%" },
            { label: "Tayyorgarlik darajasi", value: "91" },
        ],
        topicAccuracy: "Mavzu bo'yicha aniqlik",
        last7Days: "So'nggi 7 kun",
        topics: [
            { label: "Yo'l belgilari", value: "89%" },
            { label: "Yo'l ustuvorligi", value: "84%" },
            { label: "Xavfli vaziyatlar", value: "71%" },
        ],
    },
    "uz-cyrl": {
        badge: "Реал имтиҳон учун ақлли тайёргарлик",
        titleLead: "Ҳайдовчилик имтиҳонини",
        titleAccent: "ишонч билан топширинг",
        description:
            "AUTOTEST ҳар бир уринишдан сигнал олиб, сиз учун энг муҳим бўлган мавзуларни устувор қилади. Натижа: тартибли тайёргарлик, юқори эҳтимол, камроқ вақт йўқотиш.",
        primaryAuth: "Панелга ўтиш",
        primaryGuest: "Бепул бошлаш",
        secondary: "Аналитика демоси",
        highlights: ["Карта талаб қилинмайди", "Тез рўйхатдан ўтиш", "Маълумотлар ҳимояланган"],
        panelTitle: "Дашборд кўриниши",
        panelLive: "Жонли сигнал",
        signals: [
            { label: "Ўтиш эҳтимоли", value: "78%" },
            { label: "Барқарорлик индекси", value: "83%" },
            { label: "Тайёргарлик даражаси", value: "91" },
        ],
        topicAccuracy: "Мавзу бўйича аниқлик",
        last7Days: "Сўнгги 7 кун",
        topics: [
            { label: "Йўл белгилари", value: "89%" },
            { label: "Йўл устуворлиги", value: "84%" },
            { label: "Хавфли вазиятлар", value: "71%" },
        ],
    },
    ru: {
        badge: "Умная подготовка к реальному экзамену",
        titleLead: "Сдайте экзамен по вождению",
        titleAccent: "уверенно и без лишнего стресса",
        description:
            "AUTOTEST анализирует каждый подход и выделяет самые важные темы именно для вас. Результат: структурная подготовка, выше шанс сдачи и меньше потерь времени.",
        primaryAuth: "Перейти в панель",
        primaryGuest: "Начать бесплатно",
        secondary: "Демо аналитики",
        highlights: ["Карта не требуется", "Быстрая регистрация", "Данные защищены"],
        panelTitle: "Вид дашборда",
        panelLive: "Живой сигнал",
        signals: [
            { label: "Вероятность сдачи", value: "78%" },
            { label: "Индекс стабильности", value: "83%" },
            { label: "Уровень готовности", value: "91" },
        ],
        topicAccuracy: "Точность по темам",
        last7Days: "Последние 7 дней",
        topics: [
            { label: "Дорожные знаки", value: "89%" },
            { label: "Приоритеты на дороге", value: "84%" },
            { label: "Опасные ситуации", value: "71%" },
        ],
    },
    en: {
        badge: "Smart preparation for the real exam",
        titleLead: "Pass your driving exam",
        titleAccent: "with confidence",
        description:
            "AUTOTEST captures signals from every attempt and prioritizes the topics that matter most for you. Result: structured prep, higher pass probability, and less wasted time.",
        primaryAuth: "Go to dashboard",
        primaryGuest: "Start free",
        secondary: "Analytics demo",
        highlights: ["No card required", "Fast signup", "Data protected"],
        panelTitle: "Dashboard preview",
        panelLive: "Live signal",
        signals: [
            { label: "Pass probability", value: "78%" },
            { label: "Stability index", value: "83%" },
            { label: "Readiness score", value: "91" },
        ],
        topicAccuracy: "Topic accuracy",
        last7Days: "Last 7 days",
        topics: [
            { label: "Road signs", value: "89%" },
            { label: "Road priority", value: "84%" },
            { label: "Risk situations", value: "71%" },
        ],
    },
};

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
    const { locale } = useI18n();
    const copy = localized[locale] ?? localized["uz-latn"];

    const primaryHref = isAuthenticated ? "/dashboard" : "/register";
    const primaryLabel = isAuthenticated ? copy.primaryAuth : copy.primaryGuest;

    return (
        <section className="landing-fade-up relative overflow-hidden border-b border-border/70 section-spacing text-foreground">
            <div className="absolute inset-0 -z-10">
                <div className="absolute -left-16 top-10 h-72 w-72 rounded-full bg-cyan-400/18 blur-3xl" />
                <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-emerald-300/14 blur-3xl" />
                <div className="absolute bottom-0 left-1/2 h-44 w-[40rem] -translate-x-1/2 bg-sky-300/14 blur-3xl" />
            </div>

            <div className="container-app">
                <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
                    <div className="hero-emphasis">
                        <Badge variant="outline" className="mb-6 border-border/80 bg-card/70 px-3 py-1 text-xs text-foreground">
                            <Sparkles className="size-3.5" />
                            {copy.badge}
                        </Badge>

                        <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                            {copy.titleLead}
                            <span className="block bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent"> {copy.titleAccent}</span>
                        </h1>

                        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
                            {copy.description}
                        </p>

                        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                            <Button asChild size="lg" className="h-11 px-7 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:brightness-110">
                                <Link href={primaryHref}>
                                    {primaryLabel}
                                    <ArrowRight className="ml-1 size-4" />
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="h-11 border-border/80 bg-card/65 px-7 text-foreground hover:bg-card hover:text-foreground"
                            >
                                <Link href="#analytics-demo">{copy.secondary}</Link>
                            </Button>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                            {copy.highlights.map((highlight) => (
                                <span key={highlight}>{highlight}</span>
                            ))}
                        </div>
                    </div>

                    <div className="surface-card p-6 backdrop-blur-sm sm:p-7">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">{copy.panelTitle}</p>
                            <p className="text-xs text-emerald-400">{copy.panelLive}</p>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {copy.signals.map((signal, index) => (
                                <div key={`${signal.label}-${index}`} className="surface-card-soft p-3">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{signal.label}</p>
                                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{signal.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="surface-card-soft mt-5 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm text-foreground">{copy.topicAccuracy}</p>
                                <p className="text-xs text-muted-foreground">{copy.last7Days}</p>
                            </div>
                            <div className="space-y-2.5">
                                {copy.topics.map((item) => (
                                    <div key={item.label} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{item.label}</span>
                                        <span className="font-mono font-semibold text-foreground">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
