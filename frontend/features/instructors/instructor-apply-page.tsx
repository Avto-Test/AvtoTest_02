"use client";

import Link from "next/link";
import { BadgePercent, Clock3, ImagePlus, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  createInstructorApplication,
  getInstructorRegistrationSettings,
  uploadInstructorMedia,
} from "@/api/instructors";
import { AppShell } from "@/components/app-shell";
import { useUser } from "@/hooks/use-user";
import { formatCurrency } from "@/lib/utils";
import { Button, buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

type ApplicationForm = {
  full_name: string;
  phone: string;
  city: string;
  region: string;
  gender: string;
  years_experience: string;
  transmission: string;
  car_model: string;
  hourly_price: string;
  currency: string;
  short_bio: string;
  profile_image_url: string;
  extra_image_urls: string[];
};

const initialForm: ApplicationForm = {
  full_name: "",
  phone: "",
  city: "",
  region: "",
  gender: "",
  years_experience: "",
  transmission: "automatic",
  car_model: "",
  hourly_price: "",
  currency: "UZS",
  short_bio: "",
  profile_image_url: "",
  extra_image_urls: [],
};

export function InstructorApplyPage() {
  const { user } = useUser();
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof getInstructorRegistrationSettings>> | null>(null);
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    setForm((current) => ({
      ...current,
      full_name: current.full_name || user.full_name || "",
    }));
  }, [user]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setSettingsLoading(true);
      try {
        const nextSettings = await getInstructorRegistrationSettings();
        if (active) {
          setSettings(nextSettings);
        }
      } catch {
        if (active) {
          setSettings(null);
        }
      } finally {
        if (active) {
          setSettingsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const countdownText = useMemo(() => {
    if (!settings?.countdown_enabled || !settings.countdown_ends_at) {
      return null;
    }
    const diff = new Date(settings.countdown_ends_at).getTime() - Date.now();
    if (diff <= 0) {
      return null;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} soat ${minutes} daqiqa`;
  }, [settings]);

  const uploadSingleFile = async (file: File) => {
    const uploaded = await uploadInstructorMedia(file);
    return uploaded.url;
  };

  const handleProfileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploadingProfile(true);
    setError(null);
    try {
      const url = await uploadSingleFile(file);
      setForm((current) => ({ ...current, profile_image_url: url }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Profil rasmi yuklanmadi.");
    } finally {
      setUploadingProfile(false);
      event.target.value = "";
    }
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }
    setUploadingGallery(true);
    setError(null);
    try {
      const urls = await Promise.all(files.map((file) => uploadSingleFile(file)));
      setForm((current) => ({
        ...current,
        extra_image_urls: [...current.extra_image_urls, ...urls].slice(0, 15),
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Galereya yuklanmadi.");
    } finally {
      setUploadingGallery(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await createInstructorApplication({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        region: form.region.trim() || undefined,
        gender: form.gender.trim() || undefined,
        years_experience: Number(form.years_experience || 0),
        transmission: form.transmission,
        car_model: form.car_model.trim(),
        hourly_price_cents: Math.round(Number(form.hourly_price || 0) * 100),
        currency: form.currency.trim().toUpperCase(),
        short_bio: form.short_bio.trim(),
        profile_image_url: form.profile_image_url,
        extra_image_urls: form.extra_image_urls,
      });
      setSuccess("Arizangiz qabul qilindi. Admin tasdiqlagach profil katalogda chiqadi.");
      setForm(initialForm);
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
          title="Instruktor sifatida qo'shilish"
          description="Mavjud application API orqali profilingizni katalogga yuboring."
        />

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="overflow-hidden border-0 bg-[linear-gradient(155deg,#101a2d,#07111d)] text-white shadow-2xl">
            <CardContent className="space-y-6 p-8">
              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                  Instructor Onboarding
                </span>
                <h2 className="text-4xl font-semibold tracking-[-0.04em]">
                  O'zingizni verified instruktor sifatida AUTOTEST katalogiga joylashtiring
                </h2>
                <p className="text-sm leading-7 text-white/72">
                  Ariza yuborish, media qo'shish va kabinetni boshqarish endi shu oqimda mavjud.
                </p>
              </div>

              <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold">Ro'yxatdan o'tish shartlari</h3>
                {settingsLoading ? (
                  <p className="text-sm text-white/60">Yuklanmoqda...</p>
                ) : settings ? (
                  <>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {settings.free_banner_enabled ? (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">
                          Hozir bepul onboarding
                        </span>
                      ) : null}
                      {settings.discount_percent > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-100">
                          <BadgePercent className="h-3.5 w-3.5" />
                          {settings.discount_percent}% chegirma
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-white/70">
                      {settings.is_paid_enabled
                        ? `${formatCurrency(settings.price_cents, settings.currency)} / ${settings.validity_days} kun`
                        : "Onboarding hozircha bepul."}
                    </p>
                    {countdownText ? (
                      <p className="inline-flex items-center gap-2 text-sm text-amber-100">
                        <Clock3 className="h-4 w-4" />
                        Aksiya tugashiga: {countdownText}
                      </p>
                    ) : null}
                    {settings.campaign_title ? (
                      <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                        <p className="font-semibold">{settings.campaign_title}</p>
                        {settings.campaign_description ? (
                          <p className="mt-2 text-sm text-white/70">{settings.campaign_description}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-white/60">Registration settings hozircha mavjud emas.</p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/instructor/dashboard" className={buttonStyles({ className: "bg-white text-slate-950 hover:bg-white/90" })}>
                  Instruktor kabineti
                </Link>
                <Link href="/instructors" className={buttonStyles({ variant: "outline", className: "border-white/20 text-white hover:bg-white/10" })}>
                  Katalogga qaytish
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instruktor ariza formasi</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleSubmit}>
                <Input placeholder="Ism va familiya" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} required />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="Telefon" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
                  <Input placeholder="Shahar" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="Viloyat" value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} />
                  <Input placeholder="Tajriba (yil)" type="number" min={0} max={80} value={form.years_experience} onChange={(event) => setForm((current) => ({ ...current, years_experience: event.target.value }))} required />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={form.transmission} onChange={(event) => setForm((current) => ({ ...current, transmission: event.target.value }))}>
                    <option value="automatic">Avtomat</option>
                    <option value="manual">Mexanika</option>
                  </Select>
                  <Input placeholder="Mashina modeli" value={form.car_model} onChange={(event) => setForm((current) => ({ ...current, car_model: event.target.value }))} required />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input placeholder="Soatlik narx" type="number" min={0} value={form.hourly_price} onChange={(event) => setForm((current) => ({ ...current, hourly_price: event.target.value }))} required />
                  <Input placeholder="Valyuta" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} required />
                  <Input placeholder="Jins" value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} />
                </div>
                <Textarea placeholder="Qisqacha bio" value={form.short_bio} onChange={(event) => setForm((current) => ({ ...current, short_bio: event.target.value }))} required />

                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Profil rasmi</p>
                      <p className="text-sm text-[var(--muted-foreground)]">Majburiy maydon</p>
                    </div>
                    <label className={buttonStyles({ variant: "outline", className: "cursor-pointer" })}>
                      <Upload className="h-4 w-4" />
                      Fayl tanlash
                      <input type="file" accept="image/*,video/*" className="hidden" onChange={handleProfileUpload} />
                    </label>
                  </div>
                  {uploadingProfile ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">Yuklanmoqda...</p> : null}
                  {form.profile_image_url ? <p className="mt-3 text-sm text-emerald-600">Profil rasmi yuklandi.</p> : null}
                </div>

                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Galereya</p>
                      <p className="text-sm text-[var(--muted-foreground)]">Kamida 1 ta qo'shimcha rasm</p>
                    </div>
                    <label className={buttonStyles({ variant: "outline", className: "cursor-pointer" })}>
                      <ImagePlus className="h-4 w-4" />
                      Galereya yuklash
                      <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleGalleryUpload} />
                    </label>
                  </div>
                  {uploadingGallery ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">Yuklanmoqda...</p> : null}
                  {form.extra_image_urls.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-emerald-600">
                      <span>{form.extra_image_urls.length} ta media qo'shildi</span>
                    </div>
                  ) : null}
                </div>

                {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
                {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Yuborilmoqda..." : "Arizani yuborish"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
