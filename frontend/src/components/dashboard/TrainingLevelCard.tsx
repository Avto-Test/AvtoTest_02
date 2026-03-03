"use client";

import { useMemo } from "react";
import { Sprout, Zap, Rocket } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

interface TrainingLevelCardProps {
    level: string;
}

export const TrainingLevelCard: React.FC<TrainingLevelCardProps> = ({ level }) => {
    const { locale } = useI18n();

    const copy = useMemo(() => {
        switch (locale) {
            case "uz-cyrl":
                return {
                    title: "Адаптив тайёргарлик даражаси",
                    advanced: "Илғор",
                    intermediate: "Ўрта",
                    beginner: "Бошланғич",
                    advancedDesc: "Аъло натижа. Энг қийин саволлар билан ишлаяпсиз.",
                    intermediateDesc: "Жуда яхши. Ўрта ва қийин саволлар аралашмасини уддалаяпсиз.",
                    beginnerDesc: "Хуш келибсиз. Аввало асосий саволлар билан базани мустаҳкамланг.",
                };
            case "ru":
                return {
                    title: "Уровень адаптивной подготовки",
                    advanced: "Продвинутый",
                    intermediate: "Средний",
                    beginner: "Начальный",
                    advancedDesc: "Отличный результат. Вы уверенно решаете самые сложные вопросы.",
                    intermediateDesc: "Хорошо. Вы справляетесь со смесью средних и сложных вопросов.",
                    beginnerDesc: "Добро пожаловать. Начните с базовых вопросов для устойчивого фундамента.",
                };
            case "en":
                return {
                    title: "Adaptive Training Level",
                    advanced: "Advanced",
                    intermediate: "Intermediate",
                    beginner: "Beginner",
                    advancedDesc: "Excellent performance! You are facing the hardest questions.",
                    intermediateDesc: "Great job! You are handling a mix of medium and hard questions.",
                    beginnerDesc: "Welcome! Start establishing your baseline with foundational questions.",
                };
            default:
                return {
                    title: "Adaptiv tayyorgarlik darajasi",
                    advanced: "Ilg'or",
                    intermediate: "O'rta",
                    beginner: "Boshlang'ich",
                    advancedDesc: "A'lo natija. Siz eng qiyin savollar bilan ishlayapsiz.",
                    intermediateDesc: "Juda yaxshi. O'rta va qiyin savollar aralashmasini uddalayapsiz.",
                    beginnerDesc: "Xush kelibsiz. Avvalo asosiy savollar bilan bazani mustahkamlang.",
                };
        }
    }, [locale]);

    const normalized = level ? level.toLowerCase() : "beginner";
    const details = useMemo(() => {
        switch (normalized) {
            case "advanced":
                return {
                    color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700",
                    icon: Rocket,
                    label: copy.advanced,
                    description: copy.advancedDesc,
                };
            case "intermediate":
                return {
                    color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700",
                    icon: Zap,
                    label: copy.intermediate,
                    description: copy.intermediateDesc,
                };
            default:
                return {
                    color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700",
                    icon: Sprout,
                    label: copy.beginner,
                    description: copy.beginnerDesc,
                };
        }
    }, [normalized, copy]);

    const Icon = details.icon;

    return (
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 transition-all hover:shadow-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">
                {copy.title}
            </h3>

            <div className="flex items-start sm:items-center flex-col sm:flex-row gap-4">
                <div className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${details.color}`}>
                    <Icon className="w-8 h-8" />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${details.color}`}>
                            {details.label}
                        </span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {details.description}
                    </p>
                </div>
            </div>
        </div>
    );
};
