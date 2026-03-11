"use client";

import type { ComponentType } from "react";
import {
  BrainCircuit,
  GraduationCap,
  Radar,
  ShieldCheck,
  Trophy,
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

const icons = [Radar, GraduationCap, ShieldCheck, BrainCircuit, Trophy];

const copyByLocale: Record<string, FeaturesCopy> = {
  "uz-latn": {
    sectionLabel: "Imtihonga tayyorgarlik imkoniyatlari",
    heading: "Haydovchilik imtihoniga tayyorlanish uchun kerakli vositalar bir joyda.",
    description:
      "Platforma sizning natijangizni, zaif mavzularingizni va keyingi mashq yo'nalishini ko'rsatadi. Shunday qilib tayyorgarlik taxmin bilan emas, aniq reja bilan davom etadi.",
    features: [
      {
        title: "Imtihondan o'tish ehtimoli",
        description: "So'nggi natijalar va faollikka qarab imtihondan o'tish ehtimolingizni ko'rsatadi.",
      },
      {
        title: "Tayyorgarlik darajasi",
        description: "Umumiy holatingizni bitta ko'rsatkichda ko'rasiz va qachon simulyatsiyaga o'tish kerakligini tushunasiz.",
      },
      {
        title: "Zaif mavzular",
        description: "Qaysi mavzularda ko'proq xato qilayotganingizni aniq ko'rsatadi.",
      },
      {
        title: "Imtihon simulyatsiyasi",
        description: "Vaqt cheklovi bilan haqiqiy imtihonga yaqin mashq rejimini beradi.",
      },
      {
        title: "Instruktor nazorati",
        description: "Instruktorlar guruh holati, xavfdagi o'quvchilar va mavzu natijalarini bitta joyda kuzata oladi.",
      },
    ],
  },
  en: {
    sectionLabel: "Core platform intelligence",
    heading: "The product now exposes the backend intelligence that actually exists.",
    description:
      "Prediction, readiness, weak-topic analysis, exam simulation, and instructor oversight are no longer hidden backend features. They are first-class product surfaces.",
    features: [
      {
        title: "AI pass prediction",
        description: "Surface the live exam pass probability produced by the deployed ML ensemble.",
      },
      {
        title: "Readiness score",
        description: "Keep the rule-based readiness engine visible beside ML, so guidance stays interpretable.",
      },
      {
        title: "Weak topic detection",
        description: "Show learners and instructors exactly where mistakes concentrate before the real exam.",
      },
      {
        title: "Exam simulation",
        description: "Use the existing cooldown-based simulation flow as a realistic pressure test, not a mock widget.",
      },
      {
        title: "Instructor analytics",
        description: "Give instructors group readiness, rankings, risk alerts, nudges, and topic pressure in one place.",
      },
    ],
  },
  "uz-cyrl": {
    sectionLabel: "Core platform intelligence",
    heading: "The product now exposes the backend intelligence that actually exists.",
    description:
      "Prediction, readiness, weak-topic analysis, exam simulation, and instructor oversight are no longer hidden backend features. They are first-class product surfaces.",
    features: [
      {
        title: "AI pass prediction",
        description: "Surface the live exam pass probability produced by the deployed ML ensemble.",
      },
      {
        title: "Readiness score",
        description: "Keep the rule-based readiness engine visible beside ML, so guidance stays interpretable.",
      },
      {
        title: "Weak topic detection",
        description: "Show learners and instructors exactly where mistakes concentrate before the real exam.",
      },
      {
        title: "Exam simulation",
        description: "Use the existing cooldown-based simulation flow as a realistic pressure test, not a mock widget.",
      },
      {
        title: "Instructor analytics",
        description: "Give instructors group readiness, rankings, risk alerts, nudges, and topic pressure in one place.",
      },
    ],
  },
  ru: {
    sectionLabel: "Core platform intelligence",
    heading: "The product now exposes the backend intelligence that actually exists.",
    description:
      "Prediction, readiness, weak-topic analysis, exam simulation, and instructor oversight are no longer hidden backend features. They are first-class product surfaces.",
    features: [
      {
        title: "AI pass prediction",
        description: "Surface the live exam pass probability produced by the deployed ML ensemble.",
      },
      {
        title: "Readiness score",
        description: "Keep the rule-based readiness engine visible beside ML, so guidance stays interpretable.",
      },
      {
        title: "Weak topic detection",
        description: "Show learners and instructors exactly where mistakes concentrate before the real exam.",
      },
      {
        title: "Exam simulation",
        description: "Use the existing cooldown-based simulation flow as a realistic pressure test, not a mock widget.",
      },
      {
        title: "Instructor analytics",
        description: "Give instructors group readiness, rankings, risk alerts, nudges, and topic pressure in one place.",
      },
    ],
  },
};

export function LandingFeatures() {
  const { locale } = useI18n();
  const copy = copyByLocale[locale] ?? copyByLocale["uz-latn"];

  const features: FeatureItem[] = copy.features.map((feature, index) => ({
    ...feature,
    icon: icons[index] ?? BrainCircuit,
  }));

  return (
    <section id="analytics-demo" className="landing-fade-up section-spacing">
      <div className="container-app space-y-12">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.sectionLabel}</p>
          <h2 className="section-heading">{copy.heading}</h2>
          <p className="text-pretty text-muted-foreground sm:text-lg">{copy.description}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {features.map((feature) => (
            <Card key={feature.title} className="landing-hover-lift surface-card h-full transition-all duration-200">
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
