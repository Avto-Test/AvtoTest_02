"use client";

import Link from "next/link";
import { ArrowRight, BrainCircuit, Building2, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

type AudienceCopy = {
  sectionLabel: string;
  heading: string;
  description: string;
  cards: Array<{
    label: string;
    title: string;
    description: string;
    bullets: string[];
    href: string;
    cta: string;
  }>;
};

const copyByLocale: Record<string, AudienceCopy> = {
  "uz-latn": {
    sectionLabel: "Kimlar uchun",
    heading: "Talaba, instruktor va o'quv markazi uchun mos sahifalar tayyor.",
    description:
      "Bir xil tizim turli rollar uchun kerakli ko'rinishlarni beradi: talaba uchun mashq va tahlil, instruktor uchun nazorat, o'quv markazi uchun esa umumiy statistika.",
    cards: [
      {
        label: "Talabalar uchun",
        title: "Natijani ko'rib, keyingi mashqni aniq tanlang.",
        description: "Imtihondan o'tish ehtimoli, tayyorgarlik darajasi, zaif mavzular va yutuqlar bitta dashboardda turadi.",
        bullets: ["Mashq testlari", "Tayyorgarlik darajasi", "Imtihon simulyatsiyasi", "Reyting va yutuqlar"],
        href: "/dashboard",
        cta: "Talaba sahifasi",
      },
      {
        label: "Instruktorlar uchun",
        title: "Qaysi o'quvchi ortda qolayotganini yoki yaxshi ketayotganini darhol ko'ring.",
        description: "Guruhlar, reytinglar, mavzu natijalari, nofaol o'quvchilar va nudge'lar bitta ko'rinishda jamlangan.",
        bullets: ["Guruh reytingi", "Xavfdagi o'quvchilar", "Zaif mavzular", "Nudge yuborish"],
        href: "/instructor/dashboard",
        cta: "Instruktor sahifasi",
      },
      {
        label: "Avtomaktablar uchun",
        title: "Guruhlar va umumiy natijalarni bitta oynada kuzating.",
        description: "O'quv markazi tayyorgarlik, o'tish ehtimoli, qamrov va instruktorlar kesimidagi statistikani ko'radi.",
        bullets: ["Guruh tayyorgarligi", "Instruktor ko'rsatkichlari", "Maktab brendingi", "Umumiy statistika"],
        href: "/driving-schools/partner",
        cta: "Maktab hisobini yaratish",
      },
    ],
  },
  en: {
    sectionLabel: "Built for every role",
    heading: "Students, instructors, and schools all get a product surface shaped around their decisions.",
    description:
      "The same backend now supports three different frontends: a learner command center, an instructor intervention layer, and a school-level intelligence view.",
    cards: [
      {
        label: "For students",
        title: "Know what to do next, not just what you scored.",
        description: "Prediction, readiness, weak topics, achievements, and next actions stay visible in one dashboard.",
        bullets: ["Pass probability", "Readiness analytics", "Exam simulation", "XP and achievements"],
        href: "/dashboard",
        cta: "Student dashboard",
      },
      {
        label: "For instructors",
        title: "See who is improving, who is stuck, and who needs intervention.",
        description: "Groups, rankings, topic performance, inactive learners, and nudges are already connected to live analytics.",
        bullets: ["Group rankings", "At-risk students", "Weak-topic heat", "Targeted nudges"],
        href: "/instructor/dashboard",
        cta: "Instructor dashboard",
      },
      {
        label: "For driving schools",
        title: "Run the school as an intelligence system, not as a spreadsheet.",
        description: "School admins can see aggregated readiness, pass probability, enrollment, and branded analytics surfaces.",
        bullets: ["Group readiness", "Instructor visibility", "School branding", "Aggregated school metrics"],
        href: "/driving-schools/partner",
        cta: "Create school account",
      },
    ],
  },
  "uz-cyrl": {
    sectionLabel: "Built for every role",
    heading: "Students, instructors, and schools all get a product surface shaped around their decisions.",
    description:
      "The same backend now supports three different frontends: a learner command center, an instructor intervention layer, and a school-level intelligence view.",
    cards: [
      {
        label: "For students",
        title: "Know what to do next, not just what you scored.",
        description: "Prediction, readiness, weak topics, achievements, and next actions stay visible in one dashboard.",
        bullets: ["Pass probability", "Readiness analytics", "Exam simulation", "XP and achievements"],
        href: "/dashboard",
        cta: "Student dashboard",
      },
      {
        label: "For instructors",
        title: "See who is improving, who is stuck, and who needs intervention.",
        description: "Groups, rankings, topic performance, inactive learners, and nudges are already connected to live analytics.",
        bullets: ["Group rankings", "At-risk students", "Weak-topic heat", "Targeted nudges"],
        href: "/instructor/dashboard",
        cta: "Instructor dashboard",
      },
      {
        label: "For driving schools",
        title: "Run the school as an intelligence system, not as a spreadsheet.",
        description: "School admins can see aggregated readiness, pass probability, enrollment, and branded analytics surfaces.",
        bullets: ["Group readiness", "Instructor visibility", "School branding", "Aggregated school metrics"],
        href: "/driving-schools/partner",
        cta: "Create school account",
      },
    ],
  },
  ru: {
    sectionLabel: "Built for every role",
    heading: "Students, instructors, and schools all get a product surface shaped around their decisions.",
    description:
      "The same backend now supports three different frontends: a learner command center, an instructor intervention layer, and a school-level intelligence view.",
    cards: [
      {
        label: "For students",
        title: "Know what to do next, not just what you scored.",
        description: "Prediction, readiness, weak topics, achievements, and next actions stay visible in one dashboard.",
        bullets: ["Pass probability", "Readiness analytics", "Exam simulation", "XP and achievements"],
        href: "/dashboard",
        cta: "Student dashboard",
      },
      {
        label: "For instructors",
        title: "See who is improving, who is stuck, and who needs intervention.",
        description: "Groups, rankings, topic performance, inactive learners, and nudges are already connected to live analytics.",
        bullets: ["Group rankings", "At-risk students", "Weak-topic heat", "Targeted nudges"],
        href: "/instructor/dashboard",
        cta: "Instructor dashboard",
      },
      {
        label: "For driving schools",
        title: "Run the school as an intelligence system, not as a spreadsheet.",
        description: "School admins can see aggregated readiness, pass probability, enrollment, and branded analytics surfaces.",
        bullets: ["Group readiness", "Instructor visibility", "School branding", "Aggregated school metrics"],
        href: "/driving-schools/partner",
        cta: "Create school account",
      },
    ],
  },
};

const audienceIcons = [GraduationCap, BrainCircuit, Building2];

export function LandingAudience() {
  const { locale } = useI18n();
  const copy = copyByLocale[locale] ?? copyByLocale["uz-latn"];

  return (
    <section className="landing-fade-up section-spacing">
      <div className="container-app space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.sectionLabel}</p>
          <h2 className="section-heading">{copy.heading}</h2>
          <p className="text-pretty text-muted-foreground sm:text-lg">{copy.description}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {copy.cards.map((card, index) => {
            const Icon = audienceIcons[index] ?? BrainCircuit;
            return (
              <Card key={card.label} className="landing-hover-lift surface-card h-full">
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{card.label}</p>
                    <CardTitle className="text-2xl">{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-sm leading-7 text-muted-foreground">{card.description}</p>
                  <ul className="space-y-2">
                    {card.bullets.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" className="mt-auto w-full rounded-full">
                    <Link href={card.href}>
                      {card.cta}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
