import { Activity, Award, BarChart3, Clock, Lightbulb, PieChart, Target, TrendingUp } from "lucide-react";

const analyticsFeatures = [
  {
    icon: PieChart,
    title: "Zaif mavzular",
    description: "Qaysi mavzularda ko'proq xato qilayotganingizni ko'ring.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: TrendingUp,
    title: "Progress grafigi",
    description: "Kunlik va haftalik o'sishni kuzating.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Clock,
    title: "Vaqt tahlili",
    description: "Har bir savolga sarflangan vaqtni biling.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Target,
    title: "Aniqlik darajasi",
    description: "Mavzular bo'yicha to'g'ri javoblar foizi.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

const radarData = [
  { label: "Yo'l belgilari", value: 85 },
  { label: "Yo'l harakati", value: 72 },
  { label: "Texnik qoidalar", value: 58 },
  { label: "Birinchi yordam", value: 90 },
  { label: "Jarimalar", value: 65 },
  { label: "Haydash texnikasi", value: 78 },
];

export function AnalyticsSection() {
  return (
    <section className="landing-section landing-section-contrast landing-glow-blue">
      <div className="landing-container px-4 sm:px-6 lg:px-8">
        <div className="mb-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Shaxsiy analitika</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">Bilimlaringiz uchun fitness-treker</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Har bir yechilgan test tahlil qilinadi va vizualizatsiya qilinadi. O&apos;z progressingizni real vaqtda kuzating.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/10 to-transparent blur-2xl opacity-60" />

            <div className="landing-panel relative space-y-6 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Sizning statistikangiz</h3>
                  <p className="text-sm text-muted-foreground">So&apos;nggi 7 kun</p>
                </div>
                <Activity className="h-5 w-5 text-primary" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Yechilgan", value: "156", icon: Award },
                  { label: "Aniqlik", value: "78%", icon: Target },
                  { label: "Streak", value: "7 kun", icon: TrendingUp },
                ].map((stat) => (
                  <div key={stat.label} className="landing-panel-subtle rounded-xl bg-secondary/50 p-3 text-center">
                    <stat.icon className="mx-auto mb-1 h-4 w-4 text-primary" />
                    <div className="text-xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Kuchli va zaif tomonlar
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {radarData.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span
                          className={`font-medium ${
                            item.value >= 75 ? "text-accent" : item.value >= 60 ? "text-primary" : "text-destructive"
                          }`}
                        >
                          {item.value}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${
                            item.value >= 75 ? "bg-accent" : item.value >= 60 ? "bg-primary" : "bg-destructive"
                          }`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-primary/15 bg-primary/10 p-4">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Lightbulb className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">AI tavsiyasi</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Texnik qoidalar mavzusida zaiflik aniqlandi. Shu mavzu bo&apos;yicha 15 ta qo&apos;shimcha savol tavsiya qilinadi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              {analyticsFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="landing-panel landing-card-hover group flex gap-4 rounded-xl border border-border/50 bg-card p-4"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${feature.bgColor} transition-transform group-hover:scale-110`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-5">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Nima uchun muhim?</span>
                <br />
                <span className="mt-1 block text-muted-foreground">
                  Ko&apos;pchilik o&apos;quvchilar o&apos;zining zaif tomonlarini aniq bilmaydi. AUTOTEST buni avtomatik topib,
                  qayerda ko&apos;proq mashq qilish kerakligini ko&apos;rsatadi.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
