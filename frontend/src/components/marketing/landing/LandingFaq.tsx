"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";

type FaqCopy = {
  sectionLabel: string;
  heading: string;
  questions: Array<{ question: string; answer: string }>;
};

const copyByLocale: Record<string, FaqCopy> = {
  "uz-latn": {
    sectionLabel: "Ko'p so'raladigan savollar",
    heading: "Haydovchilik imtihoniga tayyorgarlik bo'yicha eng ko'p so'raladigan savollar.",
    questions: [
      {
        question: "AUTOTEST oddiy test ishlashdan nimasi bilan farq qiladi?",
        answer: "Platforma faqat natijani ko'rsatib qolmaydi. U sizning imtihondan o'tish ehtimolingizni, tayyorgarlik darajangizni va zaif mavzularingizni ham ko'rsatadi.",
      },
      {
        question: "Imtihondan o'tish ehtimoli nima beradi?",
        answer: "Bu ko'rsatkich joriy natijalaringizga qarab haqiqiy imtihondan o'tish imkoningiz qanchalik yuqori ekanini tushunishga yordam beradi.",
      },
      {
        question: "Tayyorgarlik darajasi nimani anglatadi?",
        answer: "Tayyorgarlik darajasi sizning umumiy holatingizni ko'rsatadi: mashqlar, yakunlangan urinishlar va so'nggi aniqlik darajasi shu yerda jamlanadi.",
      },
      {
        question: "Imtihon simulyatsiyasi oddiy mashqdan alohidami?",
        answer: "Ha. Imtihon simulyatsiyasida vaqt cheklovi, alohida yakunlash jarayoni va qayta topshirish oralig'i bor. Oddiy mashq testlari esa o'z holicha qoladi.",
      },
      {
        question: "Instruktor yoki o'quv markazi ham bu tizimdan foydalana oladimi?",
        answer: "Ha. Instruktorlar guruhlar va o'quvchilar holatini ko'radi, o'quv markazlari esa jamlangan statistikani va umumiy natijalarni kuzatadi.",
      },
    ],
  },
  en: {
    sectionLabel: "FAQ",
    heading: "Common product questions, answered in platform terms.",
    questions: [
      {
        question: "Does AUTOTEST replace the standard test engine?",
        answer: "No. The platform keeps the existing attempts engine and layers prediction, readiness, simulation, engagement, and analytics on top of it.",
      },
      {
        question: "Is the pass probability the same as readiness?",
        answer: "No. Readiness remains a deterministic learning signal, while pass probability is produced by the ML prediction system.",
      },
      {
        question: "Can schools use the platform without breaking student privacy?",
        answer: "Yes. School and instructor views are aggregated or scoped through the existing RBAC and school analytics system.",
      },
      {
        question: "Is exam simulation separate from normal practice?",
        answer: "Yes. Exam simulation has its own cooldown and dedicated finish flow, while normal practice and learning sessions remain unchanged.",
      },
      {
        question: "Does the frontend use the real production backend?",
        answer: "Yes. The redesigned platform consumes the existing backend endpoints directly and does not rely on a parallel mock API layer.",
      },
    ],
  },
  "uz-cyrl": {
    sectionLabel: "FAQ",
    heading: "Common product questions, answered in platform terms.",
    questions: [
      {
        question: "Does AUTOTEST replace the standard test engine?",
        answer: "No. The platform keeps the existing attempts engine and layers prediction, readiness, simulation, engagement, and analytics on top of it.",
      },
      {
        question: "Is the pass probability the same as readiness?",
        answer: "No. Readiness remains a deterministic learning signal, while pass probability is produced by the ML prediction system.",
      },
      {
        question: "Can schools use the platform without breaking student privacy?",
        answer: "Yes. School and instructor views are aggregated or scoped through the existing RBAC and school analytics system.",
      },
      {
        question: "Is exam simulation separate from normal practice?",
        answer: "Yes. Exam simulation has its own cooldown and dedicated finish flow, while normal practice and learning sessions remain unchanged.",
      },
      {
        question: "Does the frontend use the real production backend?",
        answer: "Yes. The redesigned platform consumes the existing backend endpoints directly and does not rely on a parallel mock API layer.",
      },
    ],
  },
  ru: {
    sectionLabel: "FAQ",
    heading: "Common product questions, answered in platform terms.",
    questions: [
      {
        question: "Does AUTOTEST replace the standard test engine?",
        answer: "No. The platform keeps the existing attempts engine and layers prediction, readiness, simulation, engagement, and analytics on top of it.",
      },
      {
        question: "Is the pass probability the same as readiness?",
        answer: "No. Readiness remains a deterministic learning signal, while pass probability is produced by the ML prediction system.",
      },
      {
        question: "Can schools use the platform without breaking student privacy?",
        answer: "Yes. School and instructor views are aggregated or scoped through the existing RBAC and school analytics system.",
      },
      {
        question: "Is exam simulation separate from normal practice?",
        answer: "Yes. Exam simulation has its own cooldown and dedicated finish flow, while normal practice and learning sessions remain unchanged.",
      },
      {
        question: "Does the frontend use the real production backend?",
        answer: "Yes. The redesigned platform consumes the existing backend endpoints directly and does not rely on a parallel mock API layer.",
      },
    ],
  },
};

export function LandingFaq() {
  const { locale } = useI18n();
  const copy = copyByLocale[locale] ?? copyByLocale["uz-latn"];

  return (
    <section className="landing-fade-up section-spacing">
      <div className="container-app space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{copy.sectionLabel}</p>
          <h2 className="section-heading">{copy.heading}</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {copy.questions.map((item) => (
            <Card key={item.question} className="surface-card-soft h-full">
              <CardHeader>
                <CardTitle className="text-lg">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
