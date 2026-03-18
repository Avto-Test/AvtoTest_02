"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, Building2, CheckCircle2, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { createSchoolPartnerApplication } from "@/api/schools";
import { AppShell } from "@/components/app-shell";
import { useUser } from "@/hooks/use-user";
import { Button, buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Textarea } from "@/shared/ui/textarea";

const valueProps = [
  {
    icon: Building2,
    title: "Maktab profilingizni namoyish qiling",
    description: "Logo, kurs tariflari, lokatsiya va sharhlar bilan to'liq verified profil yarating.",
  },
  {
    icon: BarChart3,
    title: "Lead oqimini boshqaring",
    description: "Qiziqqan foydalanuvchilar, kurs kategoriyasi va holat bo'yicha so'rovlarni bir joyda kuzating.",
  },
  {
    icon: BrainCircuit,
    title: "Natijalarni kuzating",
    description: "Sharhlar, lead hajmi va faoliyat trendi asosida maktab profilingizni yaxshilang.",
  },
  {
    icon: ShieldCheck,
    title: "Kabinet orqali tezkor boshqaruv",
    description: "Profil, media, sharhlar va kelgan leadlarni alohida school kabinetdan boshqaring.",
  },
];

export function SchoolPartnerPage() {
  const { user } = useUser();
  const [form, setForm] = useState({
    school_name: "",
    city: "",
    responsible_person: "",
    phone: "",
    email: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    setForm((current) => ({
      ...current,
      responsible_person: current.responsible_person || user.full_name || "",
      email: current.email || user.email || "",
    }));
  }, [user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await createSchoolPartnerApplication({
        school_name: form.school_name.trim(),
        city: form.city.trim(),
        responsible_person: form.responsible_person.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        note: form.note.trim() || undefined,
      });
      setSuccess("Hamkorlik arizasi yuborildi. Admin tez orada ko'rib chiqadi.");
      setForm((current) => ({ ...current, school_name: "", city: "", phone: "", note: "" }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ariza yuborilmadi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Avtomaktab hamkorligi"
          description="Hamkor maktab profilingizni AUTOTEST katalogi va kabinetiga ulang."
        />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden border-0 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_16%,#06111f),#04101c)] text-white shadow-2xl">
            <CardContent className="space-y-6 p-8">
              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                  B2B School Onboarding
                </span>
                <h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em]">
                  Avtomaktab profilingizni katalog, sharh va lead oqimi bilan ishga tushiring
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-white/72">
                  Profil oching, arizalarni yig'ing va maktabingizni bitta kabinetdan boshqaring.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">Leadlar</p>
                  <p className="mt-3 text-3xl font-semibold">24/7</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">Tariflar</p>
                  <p className="mt-3 text-3xl font-semibold">Live</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">Kabinet</p>
                  <p className="mt-3 text-3xl font-semibold">Ready</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/school/dashboard" className={buttonStyles({ className: "bg-white text-slate-950 hover:bg-white/90" })}>
                  School kabineti
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/schools" className={buttonStyles({ variant: "outline", className: "border-white/20 text-white hover:bg-white/10" })}>
                  Katalogga qaytish
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hamkorlik arizasi</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleSubmit}>
                <Input
                  placeholder="Avtomaktab nomi"
                  value={form.school_name}
                  onChange={(event) => setForm((current) => ({ ...current, school_name: event.target.value }))}
                  required
                />
                <Input
                  placeholder="Shahar"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  required
                />
                <Input
                  placeholder="Mas'ul shaxs"
                  value={form.responsible_person}
                  onChange={(event) => setForm((current) => ({ ...current, responsible_person: event.target.value }))}
                  required
                />
                <Input
                  placeholder="Telefon"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
                <Textarea
                  placeholder="Qo'shimcha izoh, filiallar soni yoki onboarding savollari"
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                />
                {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
                {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Yuborilmoqda..." : "Ariza yuborish"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {valueProps.map((item) => (
            <Card key={item.title}>
              <CardContent className="space-y-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-2xl bg-[var(--muted)] p-4">
              <Users className="h-5 w-5 text-[var(--primary)]" />
              <p className="mt-4 font-semibold">Arizalar</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Katalogdan kelgan barcha so'rovlarni tartibli ko'rinishda kuzatishingiz mumkin.
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--muted)] p-4">
              <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
              <p className="mt-4 font-semibold">Kabinet ko'rinishi</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Profil, sharhlar va kelgan arizalar bitta joyda ko'rinadi.
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--muted)] p-4">
              <CheckCircle2 className="h-5 w-5 text-[var(--primary)]" />
              <p className="mt-4 font-semibold">Tez ishga tushadi</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Ariza yuborish va kabinetdan boshqarish darhol ishlaydi.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
