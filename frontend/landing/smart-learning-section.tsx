import { ArrowRight, Brain, RefreshCw, Target, TrendingUp, Zap } from "lucide-react";

const learningSteps = [
  {
    icon: Target,
    title: "Testlarni yeching",
    description: "Har bir javob tahlil qilinadi",
  },
  {
    icon: Brain,
    title: "AI tahlil qiladi",
    description: "Kuchli va zaif tomonlar aniqlanadi",
  },
  {
    icon: Zap,
    title: "Adaptiv savollar",
    description: "Sizga moslashtirilgan yangi savollar chiqadi",
  },
  {
    icon: TrendingUp,
    title: "Progress oshadi",
    description: "Bilim bo'shliqlari bosqichma-bosqich yopiladi",
  },
];

export function SmartLearningSection() {
  return (
    <section className="landing-section landing-section-surface landing-glow-blue overflow-hidden">
      <div className="landing-container px-4 sm:px-6 lg:px-8">
        <div className="mb-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Aqlli o&apos;qitish tizimi</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">AI sizni qanday o&apos;qitadi</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            AUTOTEST sizning bilimlaringizni tahlil qilib, zaif tomonlaringizni aniqlaydi va shaxsiy o&apos;quv siklini
            shakllantiradi.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 opacity-5">
            <RefreshCw className="h-96 w-96 text-primary" />
          </div>

          <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {learningSteps.map((step, index) => (
              <div key={step.title} className="group relative">
                {index < learningSteps.length - 1 ? (
                  <div className="absolute right-[-0.75rem] top-1/2 z-20 hidden -translate-y-1/2 lg:block">
                    <ArrowRight className="h-6 w-6 text-primary/40" />
                  </div>
                ) : null}

                <div className="landing-panel landing-card-hover relative rounded-2xl border border-border/50 bg-card p-6">
                  <div className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 hidden justify-center lg:flex">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span>Uzluksiz o&apos;qish sikli, har bir test sizni imtihonga yaqinlashtiradi</span>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Adaptiv algoritm",
              description: "Xatolaringiz asosida keyingi savollar tanlanadi.",
            },
            {
              title: "Zaiflik aniqlash",
              description: "Qaysi mavzular sizga ko'proq mashq kerakligini tizim topadi.",
            },
            {
              title: "Shaxsiy rejim",
              description: "Har bir foydalanuvchi uchun alohida o'quv yo'nalishi yaratiladi.",
            },
          ].map((item) => (
            <div key={item.title} className="landing-panel-subtle rounded-xl border border-primary/10 bg-gradient-to-br from-primary/5 to-transparent p-5">
              <h4 className="mb-1 font-semibold text-foreground">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
