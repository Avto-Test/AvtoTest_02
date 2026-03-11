"use client";

import { Bot, Building2, GraduationCap, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

type ProductPreviewCopy = {
  sectionLabel: string;
  heading: string;
  description: string;
  columns: Array<{
    label: string;
    title: string;
    stats: Array<{ label: string; value: string }>;
  }>;
};

const copyByLocale: Record<string, ProductPreviewCopy> = {
  "uz-latn": {
    sectionLabel: "Platforma sahifalari",
    heading: "Sahifalar imtihonga tayyorgarlik jarayoniga moslab qayta ishlangan.",
    description:
      "Talaba mashq va natijani ko'radi, instruktor guruhlarni kuzatadi, o'quv markazi umumiy statistikani oladi. Har bir sahifa o'z vazifasiga mos ravishda aniq va tushunarli ko'rinadi.",
    columns: [
      {
        label: "Talaba sahifasi",
        title: "Imtihondan o'tish ehtimoli, tayyorgarlik va zaif mavzular doim ko'rinib turadi.",
        stats: [
          { label: "O'tish ehtimoli", value: "82.4%" },
          { label: "Tayyorgarlik", value: "84" },
          { label: "Bugungi savollar", value: "20" },
        ],
      },
      {
        label: "Instruktor nazorati",
        title: "Guruh holati, reyting va xavfdagi o'quvchilar tez ko'rinadi.",
        stats: [
          { label: "Guruh tayyorgarligi", value: "68.2%" },
          { label: "Xavfdagi o'quvchilar", value: "5" },
          { label: "Nofaol o'quvchilar", value: "3" },
        ],
      },
      {
        label: "O'quv markaz statistikasi",
        title: "Guruhlar kesimidagi tayyorgarlik va progress jamlangan ko'rinishda chiqadi.",
        stats: [
          { label: "O'quvchilar soni", value: "421" },
          { label: "O'rtacha tayyorgarlik", value: "72.1%" },
          { label: "Imtihonga tayyor ulush", value: "34%" },
        ],
      },
      {
        label: "Tizim kuzatuvi",
        title: "Model holati va umumiy statistika operatorlar uchun ochiq turadi.",
        stats: [
          { label: "Model versiyasi", value: "v3.2" },
          { label: "Drift holati", value: "barqaror" },
          { label: "Dataset hajmi", value: "48k" },
        ],
      },
    ],
  },
  en: {
    sectionLabel: "Product demo",
    heading: "Dashboard screenshots, translated into a modern product story.",
    description:
      "Instead of a thin MVP shell, the platform now reads like a real AI product: students see guidance, instructors see intervention signals, schools see aggregation, and admins see observability.",
    columns: [
      {
        label: "Student command center",
        title: "Prediction, readiness, weak topics, and next action stay visible at all times.",
        stats: [
          { label: "Pass probability", value: "82.4%" },
          { label: "Readiness", value: "84" },
          { label: "Questions today", value: "20" },
        ],
      },
      {
        label: "Instructor intelligence",
        title: "Groups, rankings, weak-topic heat, and at-risk learners are surfaced for action.",
        stats: [
          { label: "Group readiness", value: "68.2%" },
          { label: "At-risk students", value: "5" },
          { label: "Inactive alerts", value: "3" },
        ],
      },
      {
        label: "School analytics",
        title: "Aggregated readiness and progress distribution become school-level insight.",
        stats: [
          { label: "Student count", value: "421" },
          { label: "Average readiness", value: "72.1%" },
          { label: "Exam-ready ratio", value: "34%" },
        ],
      },
      {
        label: "ML observability",
        title: "Model status, drift, and national failure patterns are visible for operators.",
        stats: [
          { label: "Model version", value: "v3.2" },
          { label: "Drift status", value: "stable" },
          { label: "Dataset size", value: "48k" },
        ],
      },
    ],
  },
  "uz-cyrl": {
    sectionLabel: "Product demo",
    heading: "Dashboard screenshots, translated into a modern product story.",
    description:
      "Instead of a thin MVP shell, the platform now reads like a real AI product: students see guidance, instructors see intervention signals, schools see aggregation, and admins see observability.",
    columns: [
      {
        label: "Student command center",
        title: "Prediction, readiness, weak topics, and next action stay visible at all times.",
        stats: [
          { label: "Pass probability", value: "82.4%" },
          { label: "Readiness", value: "84" },
          { label: "Questions today", value: "20" },
        ],
      },
      {
        label: "Instructor intelligence",
        title: "Groups, rankings, weak-topic heat, and at-risk learners are surfaced for action.",
        stats: [
          { label: "Group readiness", value: "68.2%" },
          { label: "At-risk students", value: "5" },
          { label: "Inactive alerts", value: "3" },
        ],
      },
      {
        label: "School analytics",
        title: "Aggregated readiness and progress distribution become school-level insight.",
        stats: [
          { label: "Student count", value: "421" },
          { label: "Average readiness", value: "72.1%" },
          { label: "Exam-ready ratio", value: "34%" },
        ],
      },
      {
        label: "ML observability",
        title: "Model status, drift, and national failure patterns are visible for operators.",
        stats: [
          { label: "Model version", value: "v3.2" },
          { label: "Drift status", value: "stable" },
          { label: "Dataset size", value: "48k" },
        ],
      },
    ],
  },
  ru: {
    sectionLabel: "Product demo",
    heading: "Dashboard screenshots, translated into a modern product story.",
    description:
      "Instead of a thin MVP shell, the platform now reads like a real AI product: students see guidance, instructors see intervention signals, schools see aggregation, and admins see observability.",
    columns: [
      {
        label: "Student command center",
        title: "Prediction, readiness, weak topics, and next action stay visible at all times.",
        stats: [
          { label: "Pass probability", value: "82.4%" },
          { label: "Readiness", value: "84" },
          { label: "Questions today", value: "20" },
        ],
      },
      {
        label: "Instructor intelligence",
        title: "Groups, rankings, weak-topic heat, and at-risk learners are surfaced for action.",
        stats: [
          { label: "Group readiness", value: "68.2%" },
          { label: "At-risk students", value: "5" },
          { label: "Inactive alerts", value: "3" },
        ],
      },
      {
        label: "School analytics",
        title: "Aggregated readiness and progress distribution become school-level insight.",
        stats: [
          { label: "Student count", value: "421" },
          { label: "Average readiness", value: "72.1%" },
          { label: "Exam-ready ratio", value: "34%" },
        ],
      },
      {
        label: "ML observability",
        title: "Model status, drift, and national failure patterns are visible for operators.",
        stats: [
          { label: "Model version", value: "v3.2" },
          { label: "Drift status", value: "stable" },
          { label: "Dataset size", value: "48k" },
        ],
      },
    ],
  },
};

const previewIcons = [GraduationCap, ShieldCheck, Building2, Bot];

export function LandingProductPreview() {
  const { locale } = useI18n();
  const copy = copyByLocale[locale] ?? copyByLocale["uz-latn"];

  return (
    <section id="product-demo" className="landing-fade-up section-spacing border-y border-border/70 bg-gradient-to-b from-background/50 via-background to-background/45">
      <div className="container-app space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.sectionLabel}</p>
          <h2 className="section-heading">{copy.heading}</h2>
          <p className="text-pretty text-muted-foreground sm:text-lg">{copy.description}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {copy.columns.map((column, index) => {
            const Icon = previewIcons[index] ?? Bot;
            return (
              <Card key={column.label} className="marketing-demo-frame">
                <CardHeader className="border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/48">{column.label}</p>
                      <CardTitle className="mt-2 text-xl text-white">{column.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
                  {column.stats.map((stat) => (
                    <div key={stat.label} className="marketing-demo-card">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/46">{stat.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{stat.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
