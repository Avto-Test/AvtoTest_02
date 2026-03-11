"use client";

import Link from "next/link";
import { ArrowRight, BrainCircuit, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

interface LandingHeroProps {
  isAuthenticated: boolean;
}

type HeroCopy = {
  badge: string;
  title: string;
  description: string;
  primary: string;
  secondary: string;
  signalLabel: string;
  signals: Array<{ label: string; value: string }>;
  demoLabel: string;
  demoTitle: string;
  demoDescription: string;
  demoCards: Array<{ title: string; value: string; description: string }>;
};

const copyByLocale: Record<string, HeroCopy> = {
  "uz-latn": {
    badge: "Haydovchilik imtihoniga tayyorgarlik",
    title: "Imtihondan o'tish ehtimolingizni ko'rib, kerakli mavzularni mashq qiling",
    description:
      "AUTOTEST mashq testlari, tayyorgarlik darajasi, zaif mavzular, imtihon simulyatsiyasi va progressni bir joyda ko'rsatadi. Shunda imtihongacha aynan nimani qayta ishlash kerakligi aniq bo'ladi.",
    primary: "Tayyorgarlikni boshlash",
    secondary: "Qanday ishlashini ko'rish",
    signalLabel: "Asosiy ko'rsatkichlar",
    signals: [
      { label: "Imtihondan o'tish ehtimoli", value: "82.4%" },
      { label: "Tayyorgarlik darajasi", value: "84" },
      { label: "Zaif mavzular", value: "3" },
    ],
    demoLabel: "Platforma ko'rinishi",
    demoTitle: "Talaba, instruktor va o'quv markazi uchun tushunarli sahifalar",
    demoDescription:
      "Barcha sahifalar amaldagi backend bilan ishlaydi. Alohida demo API yoki sun'iy oqimlar yo'q, ko'rayotganingiz real platformaning o'zi.",
    demoCards: [
      { title: "Talabalar", value: "Mashq va tahlil", description: "Mashq testlari, tayyorgarlik darajasi, zaif mavzular va simulyatsiya." },
      { title: "Instruktorlar", value: "Guruh nazorati", description: "Reyting, xavfdagi o'quvchilar va kerakli nudge'lar." },
      { title: "O'quv markazlari", value: "Umumiy statistika", description: "Guruhlar bo'yicha tayyorgarlik, qamrov va instruktorga oid ko'rinish." },
      { title: "Admin / ML", value: "Tizim kuzatuvi", description: "Model holati, drift va umumiy platforma ko'rsatkichlari." },
    ],
  },
  en: {
    badge: "AI learning platform",
    title: "AI that predicts if you will pass the driving exam",
    description:
      "AUTOTEST unifies pass prediction, readiness scoring, weak-topic diagnosis, exam simulation, school analytics, and ML monitoring into one learning system.",
    primary: "Open platform",
    secondary: "See product demo",
    signalLabel: "Live intelligence signals",
    signals: [
      { label: "Pass probability", value: "82.4%" },
      { label: "Readiness score", value: "84" },
      { label: "Weak topics", value: "3" },
    ],
    demoLabel: "Dashboard command center",
    demoTitle: "One interface for students, instructors, schools, and admins",
    demoDescription:
      "Every surface is built on the current production backend: no fake flows, no parallel API layer, no hidden analytics.",
    demoCards: [
      { title: "Students", value: "Prediction + practice", description: "Readiness, AI coach, weak topics, XP, and simulation." },
      { title: "Instructors", value: "Intervention-ready", description: "Groups, rankings, risk alerts, and nudges." },
      { title: "Schools", value: "Aggregated intelligence", description: "Group readiness, branding, and enrollment visibility." },
      { title: "Admin / ML", value: "Observed in production", description: "Drift status, national insights, and platform metrics." },
    ],
  },
  "uz-cyrl": {
    badge: "AI learning platform",
    title: "AI that predicts if you will pass the driving exam",
    description:
      "AUTOTEST unifies pass prediction, readiness scoring, weak-topic diagnosis, exam simulation, school analytics, and ML monitoring into one learning system.",
    primary: "Open platform",
    secondary: "See product demo",
    signalLabel: "Live intelligence signals",
    signals: [
      { label: "Pass probability", value: "82.4%" },
      { label: "Readiness score", value: "84" },
      { label: "Weak topics", value: "3" },
    ],
    demoLabel: "Dashboard command center",
    demoTitle: "One interface for students, instructors, schools, and admins",
    demoDescription:
      "Every surface is built on the current production backend: no fake flows, no parallel API layer, no hidden analytics.",
    demoCards: [
      { title: "Students", value: "Prediction + practice", description: "Readiness, AI coach, weak topics, XP, and simulation." },
      { title: "Instructors", value: "Intervention-ready", description: "Groups, rankings, risk alerts, and nudges." },
      { title: "Schools", value: "Aggregated intelligence", description: "Group readiness, branding, and enrollment visibility." },
      { title: "Admin / ML", value: "Observed in production", description: "Drift status, national insights, and platform metrics." },
    ],
  },
  ru: {
    badge: "AI learning platform",
    title: "AI that predicts if you will pass the driving exam",
    description:
      "AUTOTEST unifies pass prediction, readiness scoring, weak-topic diagnosis, exam simulation, school analytics, and ML monitoring into one learning system.",
    primary: "Open platform",
    secondary: "See product demo",
    signalLabel: "Live intelligence signals",
    signals: [
      { label: "Pass probability", value: "82.4%" },
      { label: "Readiness score", value: "84" },
      { label: "Weak topics", value: "3" },
    ],
    demoLabel: "Dashboard command center",
    demoTitle: "One interface for students, instructors, schools, and admins",
    demoDescription:
      "Every surface is built on the current production backend: no fake flows, no parallel API layer, no hidden analytics.",
    demoCards: [
      { title: "Students", value: "Prediction + practice", description: "Readiness, AI coach, weak topics, XP, and simulation." },
      { title: "Instructors", value: "Intervention-ready", description: "Groups, rankings, risk alerts, and nudges." },
      { title: "Schools", value: "Aggregated intelligence", description: "Group readiness, branding, and enrollment visibility." },
      { title: "Admin / ML", value: "Observed in production", description: "Drift status, national insights, and platform metrics." },
    ],
  },
};

const heroIcons = [ShieldCheck, GraduationCap, Sparkles];

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const { locale } = useI18n();
  const copy = copyByLocale[locale] ?? copyByLocale["uz-latn"];
  const primaryHref = isAuthenticated ? "/dashboard" : "/register";

  return (
    <section className="landing-fade-up relative overflow-hidden border-b border-border/70 section-spacing text-foreground">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-cyan-400/14 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-48 w-[44rem] -translate-x-1/2 rounded-full bg-sky-500/12 blur-3xl" />
      </div>

      <div className="container-app">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <Badge variant="outline" className="w-fit border-border/80 bg-card/70 px-3 py-1 text-xs text-foreground">
              <BrainCircuit className="mr-2 h-3.5 w-3.5" />
              {copy.badge}
            </Badge>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-6xl">
                {copy.title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {copy.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-7 text-white hover:brightness-110">
                <Link href={primaryHref}>
                  {copy.primary}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 rounded-full border-border/80 bg-card/65 px-7 text-foreground hover:bg-card">
                <Link href="#product-demo">{copy.secondary}</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {copy.signals.map((signal, index) => {
                const Icon = heroIcons[index] ?? Sparkles;
                return (
                  <div key={signal.label} className="surface-card-soft p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      {signal.label}
                    </div>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                      {signal.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="marketing-demo-frame">
            <div className="marketing-demo-header">
              <span>{copy.demoLabel}</span>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-50">
                Production bilan ulangan
              </span>
            </div>
            <div className="marketing-demo-grid">
              <div className="space-y-4">
                <div className="marketing-demo-card">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Platform story</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                    {copy.demoTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    {copy.demoDescription}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {copy.demoCards.slice(0, 2).map((item) => (
                    <div key={item.title} className="marketing-demo-card">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-cyan-100">{item.value}</p>
                      <p className="mt-2 text-sm leading-6 text-white/56">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {copy.demoCards.slice(2).map((item) => (
                  <div key={item.title} className="marketing-demo-card h-full">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-emerald-100">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-white/56">{item.description}</p>
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
