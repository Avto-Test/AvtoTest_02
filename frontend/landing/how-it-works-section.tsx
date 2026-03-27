import { ArrowRight, BookOpen, Brain, Trophy } from "lucide-react";

const steps = [
  {
    icon: BookOpen,
    number: "01",
    title: "Sizni tahlil qiladi",
    description: "AI sizning bilim darajangizni aniqlaydi. Har bir javobingiz kuzatiladi. Qaysi mavzuda qiynalayotganingiz aniqlanadi.",
  },
  {
    icon: Brain,
    number: "02",
    title: "Sizga mos mashq beradi",
    description: "Har kimga individual savollar. Savollar darajasi sizga moslashadi. Keraksiz takrorlar bo'lmaydi.",
  },
  {
    icon: Trophy,
    number: "03",
    title: "Imtihonga tayyorlaydi",
    description: "Aniq natijaga olib boradi. Qanchalik tayyor ekaningiz ko'rsatiladi. Faqat kerakli mavzular ustida ishlaysiz.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="landing-section landing-section-muted landing-glow-blue scroll-mt-24">
      <div className="landing-container px-4 sm:px-6 lg:px-8">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Qanday ishlaydi?</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            AI sizni o‘rganadi va imtihonga tayyorlaydi
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {index < steps.length - 1 ? (
                <div className="absolute left-[calc(50%+40px)] top-12 hidden h-px w-[calc(100%-80px)] md:block">
                  <div className="h-full w-full bg-gradient-to-r from-primary/50 to-primary/10" />
                  <ArrowRight className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
                </div>
              ) : null}

              <div className="landing-panel landing-card-hover group relative rounded-2xl border border-border/50 bg-card p-8">
                <div className="absolute -top-4 left-8 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                  {step.number}
                </div>
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/20">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
