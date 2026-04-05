import Image from "next/image";
import { ArrowRight, BarChart3, Building2, CheckCircle2, GraduationCap, Landmark, Shield, Users } from "lucide-react";

import { LinkButton } from "@/landing/link-button";

const institutions = [
  {
    icon: Building2,
    title: "Avtomaktablar",
    description: "O'quvchilarni nazorat qilish va o'tish foizini oshirish.",
  },
  {
    icon: GraduationCap,
    title: "O'quv markazlari",
    description: "Katta guruhlarga samarali o'qitish.",
  },
  {
    icon: Landmark,
    title: "Davlat tashkilotlari",
    description: "Imtihon tayyorlash platformasi sifatida.",
  },
  {
    icon: Users,
    title: "Korporativ ta'lim",
    description: "Xodimlar uchun haydovchilik mashg'ulotlari.",
  },
];

const b2bFeatures = [
  "Barcha o'quvchilar progressini bir joyda kuzatish",
  "Guruh bo'yicha zaif mavzularni aniqlash",
  "Imtihonga tayyor o'quvchilarni ko'rish",
  "Batafsil hisobotlar va statistika",
  "API integratsiya imkoniyati",
  "Maxsus brending va sozlash",
];

export function InstitutionsSection() {
  return (
    <section id="b2b" className="landing-section landing-section-contrast landing-glow-green scroll-mt-24 overflow-hidden">
      <div className="landing-container px-4 sm:px-6 lg:px-8">
        <div className="mb-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Tashkilotlar uchun</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">AUTOTEST for Business</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Avtomaktablar va o&apos;quv markazlari uchun maxsus platforma. O&apos;quvchilaringiz progressini real vaqtda kuzating.
          </p>
        </div>

        <div className="relative mb-16 overflow-hidden rounded-2xl">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/15 via-accent/10 to-transparent blur-2xl opacity-70" />
          <div className="relative aspect-[21/9] overflow-hidden rounded-2xl border border-border/50">
            <Image src="/assets/landing/b2b-dashboard.jpg" alt="AUTOTEST admin paneli" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-4">
              {[
                { icon: Users, label: "Faol o'quvchilar", value: "156", tone: "bg-primary/20 text-primary" },
                { icon: BarChart3, label: "O'tish foizi", value: "94%", tone: "bg-accent/20 text-accent" },
                { icon: GraduationCap, label: "Imtihonga tayyor", value: "42", tone: "bg-primary/20 text-primary" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/50 bg-card/90 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.tone}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <h3 className="mb-6 text-xl font-semibold text-foreground">Kimlar uchun</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {institutions.map((item) => (
                <div key={item.title} className="landing-panel landing-card-hover group rounded-xl border border-border/50 bg-card p-5">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="mb-1 font-semibold text-foreground">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-6 text-xl font-semibold text-foreground">Imkoniyatlar</h3>

            <div className="relative mb-6">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-primary/15 to-accent/10 blur-xl opacity-60" />
              <div className="landing-panel relative rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="font-medium text-foreground">Admin Panel</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Avtomaktab #1</span>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "O'quvchilar", value: "156" },
                    { label: "O'rtacha ball", value: "78%" },
                    { label: "Tayyor", value: "42" },
                  ].map((stat) => (
                    <div key={stat.label} className="landing-panel-subtle rounded-lg bg-secondary/50 p-2 text-center">
                      <div className="text-lg font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {[
                    { name: "Alisher K.", score: 92, ready: true },
                    { name: "Nodira S.", score: 78, ready: true },
                    { name: "Jasur T.", score: 54, ready: false },
                  ].map((student) => (
                    <div key={student.name} className="flex items-center justify-between rounded-lg bg-secondary/30 p-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                          {student.name[0]}
                        </div>
                        <span className="text-sm text-foreground">{student.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${student.score >= 70 ? "text-accent" : "text-destructive"}`}>
                          {student.score}%
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            student.ready ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {student.ready ? "Tayyor" : "Davom"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {b2bFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <LinkButton href="/register" className="landing-button-primary group mt-6 rounded-full">
              Platformani ko&apos;rish
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </LinkButton>
          </div>
        </div>
      </div>
    </section>
  );
}
