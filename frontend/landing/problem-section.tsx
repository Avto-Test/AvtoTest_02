import { Bot, Check, Eye, TrendingUp, X } from "lucide-react";

const problems = [
  { text: "Testlarni yodlash qiyin", detail: "Nazariyani eslab qolish murakkab" },
  { text: "Nazariya zerikarli", detail: "An'anaviy o'qish usullari samarasiz" },
  { text: "Amaliy vaziyatlar yetishmaydi", detail: "Haqiqiy holatlarni ko'rmasdan o'rganish qiyin" },
];

const solutions = [
  {
    icon: Eye,
    title: "Real hayotga yaqin vaziyatlar",
    description: "Haqiqiy yo'l vaziyatlari bilan mashq qiling",
    details: ["Turli ob-havo sharoitlari", "Kundalik yo'l holatlari"],
  },
  {
    icon: Bot,
    title: "AI hammasini tushuntiradi",
    description: "Har bir savol uchun batafsil tushuntirish",
    details: ["Nima uchun bu javob to'g'ri", "Qoidalarni amalda qo'llash"],
  },
  {
    icon: TrendingUp,
    title: "Taraqqiyotingiz kuzatiladi",
    description: "O'sishingizni real vaqtda kuzating",
    details: ["Kuchli va zaif tomonlar", "Shaxsiy tavsiyalar"],
  },
];

export function ProblemSection() {
  return (
    <section className="landing-section landing-section-surface landing-glow-danger">
      <div className="landing-container px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">An&apos;anaviy usullar yetarli emas</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            AUTOTEST bilan nazariyani zamonaviy yondashuv orqali tezroq va aniqroq o&apos;rganing.
          </p>
        </div>

        <div className="mb-14 grid gap-8 lg:grid-cols-2">
          <div className="landing-problem-panel rounded-2xl p-8">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-semibold text-foreground">
              <X className="h-5 w-5 text-destructive" />
              Qiyinchiliklar
            </h3>
            <ul className="space-y-4">
              {problems.map((problem) => (
                <li key={problem.text} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                    <X className="h-3 w-3 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{problem.text}</p>
                    <p className="text-sm text-muted-foreground">{problem.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="landing-solution-panel rounded-2xl p-8">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-semibold text-foreground">
              <Check className="h-5 w-5 text-accent" />
              AUTOTEST yechimi
            </h3>
            <ul className="space-y-4">
              {solutions.map((solution) => (
                <li key={solution.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20">
                    <Check className="h-3 w-3 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{solution.title}</p>
                    <p className="text-sm text-muted-foreground">{solution.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {solutions.map((solution) => (
            <div
              key={solution.title}
              className="landing-panel landing-card-hover group rounded-2xl border border-border/50 bg-gradient-to-b from-card to-card/50 p-6"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                <solution.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{solution.title}</h3>
              <p className="mb-4 text-muted-foreground">{solution.description}</p>
              <ul className="space-y-2">
                {solution.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
