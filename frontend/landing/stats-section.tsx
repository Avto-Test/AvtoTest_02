import { Award, BookOpen, CheckCircle2, Users } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "10,000",
    suffix: "+",
    label: "Muvaffaqiyatli tayyorlangan haydovchilar",
    description: "Testlardan birinchi urinishda o'tgan.",
  },
  {
    icon: CheckCircle2,
    value: "50,000",
    suffix: "+",
    label: "Yechilgan real vaziyatlar",
    description: "Haqiqiy yo'l holatlari asosida.",
  },
  {
    icon: BookOpen,
    value: "100,000",
    suffix: "+",
    label: "AI bilan tushuntirilgan qoidalar",
    description: "Har bir savol uchun batafsil izoh.",
  },
];

export function StatsSection() {
  return (
    <section className="landing-section landing-section-plain landing-glow-blue relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/15 via-transparent to-transparent" />
      <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />

      <div className="landing-container relative px-4 sm:px-6 lg:px-8">
        <div className="mb-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Bizning natijalar</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Raqamlar o&apos;zlari gapiradi</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Minglab haydovchilar AUTOTEST yordamida testlardan muvaffaqiyatli o&apos;tishdi.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="landing-panel landing-card-hover group relative rounded-2xl p-8 text-center"
            >
              <div className="absolute inset-0 rounded-2xl bg-primary/10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 transition-transform duration-300 group-hover:scale-110">
                  <stat.icon className="h-7 w-7 text-primary" />
                </div>

                <div className="mb-2 text-4xl font-bold text-foreground md:text-5xl">
                  {stat.value}
                  <span className="text-primary">{stat.suffix}</span>
                </div>

                <p className="mb-2 font-medium text-foreground">{stat.label}</p>
                <p className="text-sm text-muted-foreground">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
