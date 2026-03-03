'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgePercent, Clock3, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/store/useAuth';
import {
  drivingInstructorApplicationSchema,
  DrivingInstructorApplicationFormData,
  DrivingInstructorRegistrationSettings,
} from '@/schemas/drivingInstructor.schema';
import {
  getDrivingInstructorRegistrationSettings,
  submitDrivingInstructorApplication,
  uploadDrivingInstructorMedia,
} from '@/lib/drivingInstructors';

type FormState = {
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

const initialState: FormState = {
  full_name: '',
  phone: '',
  city: '',
  region: '',
  gender: '',
  years_experience: '',
  transmission: 'automatic',
  car_model: '',
  hourly_price: '',
  currency: 'UZS',
  short_bio: '',
  profile_image_url: '',
  extra_image_urls: [],
};

export default function DrivingInstructorApplyPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingExtra, setIsUploadingExtra] = useState(false);
  const [settings, setSettings] = useState<DrivingInstructorRegistrationSettings | null>(null);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const payload = await getDrivingInstructorRegistrationSettings();
        if (active) setSettings(payload);
      } catch {
        if (active) setSettings(null);
      }
    }
    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const countdownText = useMemo(() => {
    if (!settings?.countdown_enabled || !settings.countdown_ends_at) return null;
    const end = new Date(settings.countdown_ends_at).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} soat ${mins} daqiqa`;
  }, [settings]);

  async function uploadProfile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingProfile(true);
    try {
      const uploaded = await uploadDrivingInstructorMedia(file);
      setForm((prev) => ({ ...prev, profile_image_url: uploaded.url }));
      toast.success('Profil rasmi yuklandi.');
    } catch {
      toast.error('Profil rasmini yuklashda xatolik.');
    } finally {
      setIsUploadingProfile(false);
      event.target.value = '';
    }
  }

  async function uploadExtra(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingExtra(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const uploaded = await uploadDrivingInstructorMedia(file);
        uploadedUrls.push(uploaded.url);
      }
      setForm((prev) => ({
        ...prev,
        extra_image_urls: [...prev.extra_image_urls, ...uploadedUrls].slice(0, 15),
      }));
      toast.success('Qoshimcha rasmlar yuklandi.');
    } catch {
      toast.error('Rasm yuklashda xatolik.');
    } finally {
      setIsUploadingExtra(false);
      event.target.value = '';
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      router.push('/login?redirect=/driving-instructors/apply');
      return;
    }
    const payload: DrivingInstructorApplicationFormData = {
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
    };

    const parsed = drivingInstructorApplicationSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Ariza maydonlarini tekshiring.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitDrivingInstructorApplication(parsed.data);
      toast.success('Arizangiz qabul qilindi. Admin tasdiqidan song katalogga chiqadi.');
      setForm(initialState);
    } catch {
      toast.error('Ariza yuborishda xatolik yuz berdi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="container-app grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Instruktor onboarding
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Instruktor sifatida royxatdan o&apos;tish
            </h1>
            <p className="text-muted-foreground">
              Ariza yuboring, admin tasdiqlagandan keyin profilingiz katalogda elon qilinadi.
              Platforma kelishuv va tolov jarayoniga aralashmaydi.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Hozirgi shartlar</h2>
            {settings ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {settings.free_banner_enabled ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-300">
                      Hozir bepul royxatdan otish
                    </span>
                  ) : null}
                  {settings.discount_percent > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-primary">
                      <BadgePercent className="h-3.5 w-3.5" />
                      Chegirma: {settings.discount_percent}%
                    </span>
                  ) : null}
                </div>
                {settings.is_paid_enabled ? (
                  <p className="text-sm text-muted-foreground">
                    Narx: {(settings.price_cents / 100).toLocaleString('en-US')} {settings.currency} /
                    {settings.validity_days} kun
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Royxatdan otish hozircha bepul.</p>
                )}
                {countdownText ? (
                  <p className="inline-flex items-center gap-1 text-sm text-amber-600 dark:text-amber-300">
                    <Clock3 className="h-4 w-4" />
                    Aksiya tugashiga: {countdownText}
                  </p>
                ) : null}
                {settings.campaign_title ? (
                  <div className="rounded-lg border border-border bg-background p-3 text-sm">
                    <p className="font-semibold">{settings.campaign_title}</p>
                    {settings.campaign_description ? (
                      <p className="mt-1 text-muted-foreground">{settings.campaign_description}</p>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Shartlarni yuklab bolmadi.</p>
            )}
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            Eslatma: platforma instruktor va o&apos;quvchi o&apos;rtasidagi shaxsiy kelishuvlarga aralashmaydi.
          </div>

          <Button asChild variant="outline">
            <Link href="/driving-instructors">Katalogga qaytish</Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-xl font-semibold">Ariza formasi</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Barcha majburiy maydonlar toldirilgandan keyin yuboriladi.
          </p>

          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <Input
              placeholder="Ism Familiya"
              value={form.full_name}
              onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Telefon"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <Input
                placeholder="Shahar / Hudud"
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Viloyat (ixtiyoriy)"
                value={form.region}
                onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))}
              />
              <Input
                placeholder="Tajriba (yil)"
                type="number"
                min={0}
                max={80}
                value={form.years_experience}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, years_experience: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.transmission}
                onChange={(event) => setForm((prev) => ({ ...prev, transmission: event.target.value }))}
              >
                <option value="automatic">Avtomat</option>
                <option value="manual">Mexanika</option>
              </select>
              <Input
                placeholder="Mashina modeli"
                value={form.car_model}
                onChange={(event) => setForm((prev) => ({ ...prev, car_model: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Soatlik narx"
                type="number"
                min={0}
                step={0.01}
                value={form.hourly_price}
                onChange={(event) => setForm((prev) => ({ ...prev, hourly_price: event.target.value }))}
              />
              <Input
                placeholder="Valyuta"
                value={form.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
              />
              <Input
                placeholder="Jins (ixtiyoriy)"
                value={form.gender}
                onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
              />
            </div>

            <textarea
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Qisqacha bio (kamida 20 belgi)"
              value={form.short_bio}
              onChange={(event) => setForm((prev) => ({ ...prev, short_bio: event.target.value }))}
            />

            <div className="space-y-2 rounded-md border border-border bg-background p-3">
              <p className="text-sm font-medium">Profil rasmi</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  Fayl tanlash
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={uploadProfile} />
                </label>
                {isUploadingProfile ? <span className="text-xs text-muted-foreground">Yuklanmoqda...</span> : null}
              </div>
              {form.profile_image_url ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-300">Profil rasmi yuklandi.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Majburiy maydon.</p>
              )}
            </div>

            <div className="space-y-2 rounded-md border border-border bg-background p-3">
              <p className="text-sm font-medium">Qoshimcha rasmlar (kamida 1 ta)</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  Fayllarni tanlash
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={uploadExtra} />
                </label>
                {isUploadingExtra ? <span className="text-xs text-muted-foreground">Yuklanmoqda...</span> : null}
              </div>
              <p className="text-xs text-muted-foreground">Yuklangan: {form.extra_image_urls.length} ta</p>
            </div>

            <Button type="submit" disabled={isSubmitting || isUploadingProfile || isUploadingExtra} className="w-full">
              {isSubmitting ? 'Yuborilmoqda...' : 'Ariza yuborish'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
