'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { submitPartnerApplication } from '@/lib/drivingSchools';
import { partnerApplicationSchema } from '@/schemas/drivingSchool.schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/store/useAuth';

type PartnerFormState = {
  school_name: string;
  city: string;
  responsible_person: string;
  phone: string;
  email: string;
  note: string;
};

const valueProps = [
  {
    icon: GraduationCap,
    title: "O'quvchi tayyorligini bashorat qilish",
    description: "Qaysi o'quvchilar tez orada tayyor bo'lishini va qaysi guruhlar hali ham maqsadli ishlashga muhtojligini ko'ring.",
  },
  {
    icon: BarChart3,
    title: 'Guruh analitikasi',
    description: "O'tish ehtimoli, zaif mavzu taqsimoti, completion rate va guruh dinamikasini bitta oynada kuzating.",
  },
  {
    icon: BrainCircuit,
    title: 'Instruktor nazorati',
    description: "Instruktorlarga guruh reytingi, xavfdagi o'quvchilar, nofaol signal va nudge'larni bering.",
  },
  {
    icon: ShieldCheck,
    title: 'Maktab brendingi va ishonch',
    description: "Logo, banner, brand color va analytics bilan mustahkamlangan qiymat hikoyasi orqali maktab profilingizni ko'rsating.",
  },
];

const metricCards = [
  { label: "O'rtacha tayyorlik", value: '72.1%' },
  { label: "O'tish ehtimoli", value: '68.2%' },
  { label: "Imtihonga tayyorlar", value: '34%' },
  { label: 'Zaif mavzu signallari', value: '12' },
];

export default function DrivingSchoolPartnerPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [form, setForm] = useState<PartnerFormState>({
    school_name: '',
    city: '',
    responsible_person: '',
    phone: '',
    email: '',
    note: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      router.push('/login?redirect=/driving-schools/partner');
      return;
    }

    const parsed = partnerApplicationSchema.safeParse({
      ...form,
      note: form.note || undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Ariza ma'lumotlarini tekshiring.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitPartnerApplication(parsed.data);
      toast.success('Arizangiz qabul qilindi. Tez orada aloqaga chiqamiz.');
      setForm({
        school_name: '',
        city: '',
        responsible_person: '',
        phone: '',
        email: '',
        note: '',
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
        if (error.response?.status === 409 && detail) {
          toast.error(detail);
          return;
        }
        if (detail) {
          toast.error(detail);
          return;
        }
      }
      toast.error("Ariza yuborishda xatolik bo'ldi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="marketing-shell py-12 md:py-16">
      <div className="container-app space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-[0_22px_60px_-38px_rgba(0,0,0,0.55)] backdrop-blur md:p-8">
            <div className="space-y-4">
                <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                B2B / Avtomaktab intellekti
              </p>
              <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] text-foreground md:text-5xl">
                {"Avtomaktabingizni ko'rinadigan o'quv tizimiga aylantiring"}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                {"AUTOTEST allaqachon guruh analitikasi, o'quvchi tayyorligini bashorat qilish, maktab brendingi, instruktor tahlili, zaif mavzu monitoringi va o'tish ehtimoli signalini qo'llab-quvvatlaydi. Bu sahifa shu backend imkoniyatlarini maktablar uchun tushunarli mahsulot hikoyasi va onboarding oqimiga aylantiradi."}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:brightness-110">
                <Link href={token ? '/school/profile-builder' : '/register'}>
                  Maktab hisobini yaratish
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link href="#partner-application">Hamkorlik arizasi</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => (
                <div key={metric.label} className="surface-card-soft p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="marketing-demo-frame">
            <div className="marketing-demo-header">
              <span>{"Maktab analitikasi ko'rinishi"}</span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-50">
                {"Faqat jamlangan ko'rinish"}
              </span>
            </div>
            <div className="marketing-demo-grid">
              <div className="space-y-4">
                <div className="marketing-demo-card">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/46">Maktab dashboardi</p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                    {"Guruh tayyorligi, qamrov va instruktor samaradorligi bitta ko'rinishda"}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="marketing-demo-card">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/46">Tayyorlik</p>
                    <p className="mt-3 text-3xl font-semibold text-cyan-100">72.1%</p>
                  </div>
                  <div className="marketing-demo-card">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/46">Tugatish darajasi</p>
                    <p className="mt-3 text-3xl font-semibold text-emerald-100">71.3%</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="marketing-demo-card">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/46">Zaif mavzu taqsimoti</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm text-white">
                      <span>Ustuvorlik qoidalari</span>
                      <span>52%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-white">
                      <span>{"To'xtash va parkovka"}</span>
                      <span>61%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-white">
                      <span>{"Yo'l belgilari"}</span>
                      <span>70%</span>
                    </div>
                  </div>
                </div>
                <div className="marketing-demo-card">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/46">{"Instruktor ko'rinishi"}</p>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    {"Reytinglangan guruhlar, xavfdagi o'quvchilar, nudge'lar va tayyorlik trendi allaqachon mavjud."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {valueProps.map((item) => (
            <Card key={item.title} className="surface-card h-full">
              <CardHeader className="space-y-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-2xl">{"Nega avtomaktablar AUTOTEST'dan foydalanadi"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
              <div className="flex items-start gap-3">
                <Users className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <p>{"O'quvchi natijalarini noto'g'ri rolga xom student ma'lumotini ochmasdan jamlangan ko'rinishda bering."}</p>
              </div>
              <div className="flex items-start gap-3">
                <BarChart3 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <p>{"Guruh tayyorligi va completion trendi orqali o'quvchilar real imtihonda yiqilishidan oldin xavfli cohortlarni toping."}</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <p>Promo kod, invite link va QR oqimlari orqali talabalarni amaldagi onboarding logikasini buzmasdan ulang.</p>
              </div>
              <div className="flex items-start gap-3">
                <BrainCircuit className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <p>{"Test platformasidan real guidance tizimiga o'tish uchun deterministik tayyorlikni AI coaching va prediction bilan birlashtiring."}</p>
              </div>
            </CardContent>
          </Card>

          <Card id="partner-application" className="surface-card">
            <CardHeader>
              <CardTitle className="text-2xl">Hamkorlik arizasi</CardTitle>
              <p className="text-sm leading-7 text-muted-foreground">
                {"Maktab ma'lumotlarini yuboring. Backenddagi mavjud ariza oqimi va validatsiya o'zgarmaydi."}
              </p>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
                <Input
                  placeholder="Avtomaktab nomi"
                  value={form.school_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, school_name: event.target.value }))}
                />
                <Input
                  placeholder="Shahar"
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                />
                <Input
                  placeholder="Mas'ul shaxs"
                  value={form.responsible_person}
                  onChange={(event) => setForm((prev) => ({ ...prev, responsible_person: event.target.value }))}
                />
                <Input
                  placeholder="Telefon"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="md:col-span-2"
                />
                <textarea
                  className="min-h-[120px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm md:col-span-2"
                  placeholder="Izoh, maktab hajmi, o'quvchilar soni yoki onboarding savollari"
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                />
                <Button type="submit" disabled={isSubmitting} className="md:col-span-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:brightness-110">
                  {isSubmitting ? 'Yuborilmoqda...' : 'Hamkorlik arizasini yuborish'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
