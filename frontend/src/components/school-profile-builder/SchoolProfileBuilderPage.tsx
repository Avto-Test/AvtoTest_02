'use client';

import { type ChangeEvent, type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  BadgeCheck,
  Building2,
  Eye,
  LayoutPanelLeft,
  Link2,
  MapPinned,
  MonitorSmartphone,
  Navigation,
  Phone,
  Search,
  Save,
  Smartphone,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  getMyDrivingSchoolSummary,
  updateMyDrivingSchoolProfile,
  uploadMyDrivingSchoolMedia,
} from '@/lib/drivingSchools';
import { useAuth } from '@/store/useAuth';

const schoolProfileBuilderSchema = z.object({
  name: z.string().min(2, "Nomi kamida 2 belgidan iborat bo'lsin").max(255),
  city: z.string().min(2, 'Shaharni kiriting').max(120),
  region: z.string().max(120),
  phone: z.string().min(5, "Telefon noto'g'ri").max(40),
  address: z.string().max(500),
  landmark: z.string().max(255),
  work_hours: z.string().max(255),
  license_info: z.string().max(255),
  short_description: z.string().max(500),
  full_description: z.string().max(8000),
  telegram: z.string().max(120),
  website: z
    .string()
    .max(255)
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), 'Website https:// bilan boshlansin'),
  logo_url: z
    .string()
    .max(1000)
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), 'Logo URL https:// bilan boshlansin'),
  map_embed_url: z
    .string()
    .max(2000)
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), 'Xarita URL https:// bilan boshlansin'),
  years_active: z
    .string()
    .max(3)
    .refine(
      (value) => !value || (/^\d+$/.test(value) && Number(value) >= 0 && Number(value) <= 100),
      "Faoliyat yili 0-100 oralig'ida bo'lsin"
    ),
  slug: z.string().optional(),
  is_active: z.boolean().optional(),
});

type SchoolProfileBuilderForm = z.infer<typeof schoolProfileBuilderSchema>;
type PreviewMode = 'desktop' | 'mobile';
type PanelMode = 'edit' | 'preview';
type LogoMode = 'upload' | 'url';
type LocationMode = 'picker' | 'url';
type LocationSearchItem = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  address: string;
};

const MapPickerCanvas = dynamic(
  () =>
    import('@/components/instructor-profile-builder/MapPickerCanvas').then(
      (module) => module.MapPickerCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[50vh] min-h-[320px] items-center justify-center rounded-xl border border-cyan-400/40 bg-slate-900/70 text-sm text-slate-300">
        Xarita yuklanmoqda...
      </div>
    ),
  }
);

const locationMocks: LocationSearchItem[] = [
  { id: 'tash-1', label: 'Toshkent shahri, Chilonzor', latitude: 41.285, longitude: 69.203, address: 'Chilonzor, Toshkent' },
  { id: 'tash-2', label: 'Toshkent shahri, Yunusobod', latitude: 41.358, longitude: 69.288, address: 'Yunusobod, Toshkent' },
  { id: 'sam-1', label: 'Samarqand shahri, Registon', latitude: 39.654, longitude: 66.975, address: 'Registon, Samarqand' },
  { id: 'and-1', label: 'Andijon shahri, Bobur kochasi', latitude: 40.782, longitude: 72.345, address: 'Bobur kochasi, Andijon' },
  { id: 'jiz-1', label: 'Jizzax shahri, Markaz', latitude: 40.115, longitude: 67.842, address: 'Markaz, Jizzax' },
  { id: 'fer-1', label: "Farg'ona shahri, Aeroport atrofi", latitude: 40.389, longitude: 71.787, address: "Aeroport atrofi, Farg'ona" },
];

function buildOpenStreetMapEmbed(latitude: number, longitude: number): string {
  const delta = 0.012;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;
  const bbox = `${left}%2C${bottom}%2C${right}%2C${top}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

function parseMapLatLng(embedUrl?: string | null): { latitude: number | null; longitude: number | null } {
  if (!embedUrl) return { latitude: null, longitude: null };

  const decoded = decodeURIComponent(embedUrl);
  const markerMatch = decoded.match(/marker=([-\d.]+),([-\d.]+)/i);
  if (markerMatch) {
    return {
      latitude: Number(markerMatch[1]) || null,
      longitude: Number(markerMatch[2]) || null,
    };
  }

  const centerMatch = decoded.match(/#map=\d+\/([-\d.]+)\/([-\d.]+)/i);
  if (centerMatch) {
    return {
      latitude: Number(centerMatch[1]) || null,
      longitude: Number(centerMatch[2]) || null,
    };
  }

  return { latitude: null, longitude: null };
}

const defaultValues: SchoolProfileBuilderForm = {
  name: '',
  city: '',
  region: '',
  phone: '',
  address: '',
  landmark: '',
  work_hours: '',
  license_info: '',
  short_description: '',
  full_description: '',
  telegram: '',
  website: '',
  logo_url: '',
  map_embed_url: '',
  years_active: '',
  slug: '',
  is_active: true,
};

export function SchoolProfileBuilderPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [autosaving, setAutosaving] = useState(false);
  const [savingNow, setSavingNow] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('edit');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [schoolExists, setSchoolExists] = useState(false);
  const [logoMode, setLogoMode] = useState<LogoMode>('upload');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [locationMode, setLocationMode] = useState<LocationMode>('picker');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationResults, setLocationResults] = useState<LocationSearchItem[]>([]);
  const [locationCoords, setLocationCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<SchoolProfileBuilderForm>({
    resolver: zodResolver(schoolProfileBuilderSchema),
    defaultValues,
    mode: 'onChange',
  });

  const values = useWatch({ control: form.control });
  const initializedRef = useRef(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push('/login?redirect=/school/profile-builder');
    }
  }, [hydrated, token, router]);

  const mapSchoolToForm = useCallback((school: Record<string, unknown>): SchoolProfileBuilderForm => {
    return {
      name: String(school.name || ''),
      city: String(school.city || ''),
      region: String(school.region || ''),
      phone: String(school.phone || ''),
      address: String(school.address || ''),
      landmark: String(school.landmark || ''),
      work_hours: String(school.work_hours || ''),
      license_info: String(school.license_info || ''),
      short_description: String(school.short_description || ''),
      full_description: String(school.full_description || ''),
      telegram: String(school.telegram || ''),
      website: String(school.website || ''),
      logo_url: String(school.logo_url || ''),
      map_embed_url: String(school.map_embed_url || ''),
      years_active: school.years_active != null ? String(school.years_active) : '',
      slug: String(school.slug || ''),
      is_active: Boolean(school.is_active),
    };
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const summary = await getMyDrivingSchoolSummary();
      const school = summary.school;
      setSchoolExists(Boolean(school));
      if (school) {
        const mapped = mapSchoolToForm(school as unknown as Record<string, unknown>);
        const coords = parseMapLatLng(mapped.map_embed_url);
        initializedRef.current = false;
        form.reset(mapped);
        setLocationCoords({ lat: coords.latitude, lng: coords.longitude });
        setLocationMode(coords.latitude != null && coords.longitude != null ? 'picker' : 'url');
        setLocationQuery(mapped.address || mapped.city || '');
        setLogoMode(mapped.logo_url ? 'url' : 'upload');
        setUnsavedChanges(false);
        setSaveError(null);
        setLastSavedAt(school.updated_at || null);
        setTimeout(() => {
          initializedRef.current = true;
        }, 0);
      } else {
        setLocationCoords({ lat: null, lng: null });
        setLocationResults([]);
        setLocationQuery('');
        setLocationMode('picker');
        setLogoMode('upload');
        initializedRef.current = true;
      }
    } catch {
      toast.error("Profil ma'lumotlarini yuklab bo'lmadi.");
      initializedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [form, mapSchoolToForm]);

  useEffect(() => {
    if (!token) return;
    void loadSummary();
  }, [token, loadSummary]);

  useEffect(() => {
    const sub = form.watch(() => {
      if (!initializedRef.current) return;
      setUnsavedChanges(true);
    });
    return () => sub.unsubscribe();
  }, [form]);

  const toPayload = useCallback((data: SchoolProfileBuilderForm) => {
    return {
      name: data.name.trim(),
      city: data.city.trim(),
      region: data.region.trim() || undefined,
      phone: data.phone.trim(),
      address: data.address.trim() || undefined,
      landmark: data.landmark.trim() || undefined,
      work_hours: data.work_hours.trim() || undefined,
      license_info: data.license_info.trim() || undefined,
      short_description: data.short_description.trim() || undefined,
      full_description: data.full_description.trim() || undefined,
      telegram: data.telegram.trim() || undefined,
      website: data.website.trim() || undefined,
      logo_url: data.logo_url.trim() || undefined,
      map_embed_url: data.map_embed_url.trim() || undefined,
      years_active: data.years_active ? Number(data.years_active) : undefined,
    };
  }, []);

  const performSave = useCallback(
    async (manual: boolean) => {
      if (!schoolExists || saveInFlightRef.current) return false;
      const parsed = schoolProfileBuilderSchema.safeParse(form.getValues());
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message || "Forma ma'lumotlarini tekshiring";
        setSaveError(msg);
        if (manual) {
          await form.trigger();
          toast.error(msg);
        }
        return false;
      }

      saveInFlightRef.current = true;
      if (manual) setSavingNow(true);
      else setAutosaving(true);
      setSaveError(null);
      try {
        const updated = await updateMyDrivingSchoolProfile(toPayload(parsed.data));
        const mapped = mapSchoolToForm(updated as unknown as Record<string, unknown>);
        initializedRef.current = false;
        form.reset(mapped);
        setUnsavedChanges(false);
        setLastSavedAt(updated.updated_at || new Date().toISOString());
        setTimeout(() => {
          initializedRef.current = true;
        }, 0);
        if (manual) toast.success('Profil saqlandi.');
        return true;
      } catch {
        const msg = "Saqlashda xatolik. Internet yoki serverni tekshiring.";
        setSaveError(msg);
        if (manual) toast.error(msg);
        return false;
      } finally {
        saveInFlightRef.current = false;
        setSavingNow(false);
        setAutosaving(false);
      }
    },
    [form, mapSchoolToForm, schoolExists, toPayload]
  );

  const searchLocations = useCallback(async (query: string) => {
    setLocationQuery(query);
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      setLocationResults([]);
      return;
    }
    setLocationLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 180));
    setLocationResults(
      locationMocks.filter((item) => item.label.toLowerCase().includes(normalized)).slice(0, 6)
    );
    setLocationLoading(false);
  }, []);

  const applyLocation = useCallback(
    (location: LocationSearchItem) => {
      setLocationCoords({ lat: location.latitude, lng: location.longitude });
      setLocationQuery(location.label);
      setLocationResults([]);
      setLocationMode('picker');
      form.setValue('address', location.address, { shouldDirty: true, shouldValidate: true });
      form.setValue('city', location.label.split(',')[0]?.trim() || form.getValues('city'), {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue('map_embed_url', buildOpenStreetMapEmbed(location.latitude, location.longitude), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setLocationModalOpen(false);
    },
    [form]
  );

  const setLocationFromMap = useCallback(
    (lat: number, lng: number) => {
      setLocationCoords({ lat, lng });
      const fallbackLabel = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setLocationQuery(fallbackLabel);
      form.setValue('map_embed_url', buildOpenStreetMapEmbed(lat, lng), {
        shouldDirty: true,
        shouldValidate: true,
      });
      if (!form.getValues('address')) {
        form.setValue('address', fallbackLabel, { shouldDirty: true, shouldValidate: true });
      }
      setLocationMode('picker');
    },
    [form]
  );

  const handleLogoUpload = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setLogoUploading(true);
      setLogoUploadProgress(2);
      setSaveError(null);
      try {
        const result = await uploadMyDrivingSchoolMedia(file, (percent) => {
          setLogoUploadProgress(percent);
        });
        form.setValue('logo_url', result.url, { shouldDirty: true, shouldValidate: true });
        setLogoMode('upload');
        toast.success("Logo yuklandi.");
      } catch {
        toast.error("Logo yuklashda xatolik yuz berdi.");
      } finally {
        setLogoUploading(false);
        setTimeout(() => setLogoUploadProgress(0), 700);
      }
    },
    [form]
  );

  const onLogoFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      await handleLogoUpload(file);
      event.target.value = '';
    },
    [handleLogoUpload]
  );

  const onLogoDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const file = event.dataTransfer.files?.[0] || null;
      await handleLogoUpload(file);
    },
    [handleLogoUpload]
  );

  useEffect(() => {
    if (!initializedRef.current || !unsavedChanges || !schoolExists) return;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      void performSave(false);
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [performSave, unsavedChanges, schoolExists, values]);

  useEffect(() => {
    if (locationMode !== 'url') return;
    const parsed = parseMapLatLng(values.map_embed_url || '');
    setLocationCoords((prev) => {
      if (prev.lat === parsed.latitude && prev.lng === parsed.longitude) return prev;
      return { lat: parsed.latitude, lng: parsed.longitude };
    });
  }, [locationMode, values.map_embed_url]);

  const completion = useMemo(() => {
    const current = values;
    const field = (value?: string | null) => (value ?? '').trim();
    const checks = [
      Boolean(field(current.name)),
      Boolean(field(current.city)),
      Boolean(field(current.phone)),
      Boolean(field(current.short_description)),
      Boolean(field(current.full_description)),
      Boolean(field(current.logo_url)),
      Boolean(field(current.map_embed_url)),
      Boolean(field(current.address)),
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [values]);

  const canSave = form.formState.isValid && !savingNow && !autosaving && schoolExists;
  const live = values;

  if (!hydrated || loading) {
    return (
      <section className="container-app py-10">
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
      </section>
    );
  }

  if (!schoolExists) {
    return (
      <section className="container-app py-10">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Avtomaktab profili topilmadi</CardTitle>
            <CardDescription>
              Avval hamkorlik arizasini yuboring yoki admin tasdiqlashini kuting.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/driving-schools/partner">Ariza yuborish</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/school/dashboard">Kabinetga qaytish</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="container-app flex min-h-[calc(100dvh-72px)] flex-col gap-3 py-3">
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="gap-2 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-2xl">Avtomaktab profil builder</CardTitle>
              <CardDescription>
                Chapda ma&apos;lumotlarni yangilang, o&apos;ngda real ko&apos;rinishni jonli preview qiling.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/school/dashboard">Kabinet</Link>
              </Button>
              {live.slug ? (
                <Button asChild variant="outline">
                  <Link href={`/driving-schools/${live.slug}`}>Public sahifa</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <CardContent className="rounded-xl border border-border bg-background/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    unsavedChanges ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                {unsavedChanges ? "Saqlanmagan o'zgarishlar bor" : "Barcha o'zgarishlar saqlangan"}
                {lastSavedAt ? (
                  <span className="text-muted-foreground">
                    • {new Date(lastSavedAt).toLocaleTimeString('uz-UZ')}
                  </span>
                ) : null}
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === 'desktop' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('desktop')}
                >
                  <MonitorSmartphone className="h-4 w-4" />
                  Desktop
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === 'mobile' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </Button>
              </div>
            </div>
          </CardContent>
        </CardHeader>
      </Card>

      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2">
          <Button
            type="button"
            variant={panelMode === 'edit' ? 'default' : 'outline'}
            onClick={() => setPanelMode('edit')}
          >
            <LayoutPanelLeft className="h-4 w-4" />
            Tahrirlash
          </Button>
          <Button
            type="button"
            variant={panelMode === 'preview' ? 'default' : 'outline'}
            onClick={() => setPanelMode('preview')}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:h-[calc(100dvh-176px)] lg:min-h-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className={`${panelMode === 'preview' ? 'hidden md:block' : ''} lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1`}>
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Tahrirlash paneli</CardTitle>
              <CardDescription>Asosiy ma&apos;lumotlar, logo, lokatsiya va tavsif bo&apos;limlari.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Profil to&apos;liqligi</span>
                  <span className="font-semibold">{completion}%</span>
                </div>
                <Progress value={completion} className="h-2.5" />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Avtomaktab nomi" {...form.register('name')} />
                <Input placeholder="Telefon" {...form.register('phone')} />
                <Input placeholder="Shahar" {...form.register('city')} />
                <Input placeholder="Viloyat / Hudud" {...form.register('region')} />
                <Input placeholder="Manzil" {...form.register('address')} />
                <Input placeholder="Mo'ljal" {...form.register('landmark')} />
                <Input placeholder="Ish vaqti (08:00-20:00)" {...form.register('work_hours')} />
                <Input placeholder="Litsenziya ma'lumoti" {...form.register('license_info')} />
                <Input placeholder="Telegram (@...)" {...form.register('telegram')} />
                <Input placeholder="Website (https://...)" {...form.register('website')} />
                <Controller
                  control={form.control}
                  name="years_active"
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Faoliyat yili"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  )}
                />
              </div>

              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Logo</p>
                    <p className="text-xs text-muted-foreground">Lokaldan yuklash yoki URL orqali berish mumkin.</p>
                  </div>
                  <div className="inline-flex rounded-md border border-border bg-background p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={logoMode === 'upload' ? 'default' : 'ghost'}
                      onClick={() => setLogoMode('upload')}
                    >
                      Yuklash
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={logoMode === 'url' ? 'default' : 'ghost'}
                      onClick={() => setLogoMode('url')}
                    >
                      URL
                    </Button>
                  </div>
                </div>

                {logoMode === 'upload' ? (
                  <div
                    className="space-y-3"
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDrop={(event) => {
                      void onLogoDrop(event);
                    }}
                  >
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(event) => {
                        void onLogoFileInputChange(event);
                      }}
                    />

                    {live.logo_url ? (
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={live.logo_url}
                          alt="Logo preview"
                          className="h-16 w-20 rounded-md border border-border object-cover"
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">Logo tayyor</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{live.logo_url}</p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => logoFileInputRef.current?.click()}
                              disabled={logoUploading}
                            >
                              Almashtirish
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => form.setValue('logo_url', '', { shouldDirty: true, shouldValidate: true })}
                              disabled={logoUploading}
                            >
                              <X className="h-4 w-4" />
                              O&apos;chirish
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-cyan-500/40 bg-cyan-500/5 px-4 py-5 text-sm transition hover:bg-cyan-500/10"
                        onClick={() => logoFileInputRef.current?.click()}
                        disabled={logoUploading}
                      >
                        <UploadCloud className="h-6 w-6 text-cyan-300" />
                        <span>Logo faylini bu yerga tashlang yoki bosing</span>
                        <span className="text-xs text-muted-foreground">PNG/JPG/WEBP/GIF, 10MB gacha</span>
                      </button>
                    )}

                    {logoUploading ? (
                      <div className="space-y-1">
                        <Progress value={logoUploadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground">Yuklanmoqda: {logoUploadProgress}%</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input placeholder="https://.../logo.png" {...form.register('logo_url')} />
                    <p className="text-xs text-muted-foreground">URL ishlaydigan ochiq rasm manzili bo&apos;lishi kerak.</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Lokatsiya</p>
                    <p className="text-xs text-muted-foreground">
                      Qidiruv/map picker yoki to&apos;g&apos;ridan-to&apos;g&apos;ri URL orqali xarita biriktiring.
                    </p>
                  </div>
                  <div className="inline-flex rounded-md border border-border bg-background p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={locationMode === 'picker' ? 'default' : 'ghost'}
                      onClick={() => setLocationMode('picker')}
                    >
                      Picker
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={locationMode === 'url' ? 'default' : 'ghost'}
                      onClick={() => setLocationMode('url')}
                    >
                      URL
                    </Button>
                  </div>
                </div>

                {locationMode === 'picker' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={locationQuery}
                        onChange={(event) => {
                          void searchLocations(event.target.value);
                        }}
                        placeholder="Joy qidiring: shahar, tuman, ko'cha..."
                        className="pl-9"
                      />
                    </div>

                    {locationLoading ? <p className="text-xs text-muted-foreground">Qidirilmoqda...</p> : null}

                    {!locationLoading && locationResults.length > 0 ? (
                      <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-1">
                        {locationResults.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-accent"
                            onClick={() => applyLocation(item)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setLocationModalOpen(true)}>
                        <Navigation className="h-4 w-4" />
                        Xaritadan tanlash
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setLocationCoords({ lat: null, lng: null });
                          setLocationQuery('');
                          setLocationResults([]);
                          form.setValue('map_embed_url', '', { shouldDirty: true, shouldValidate: true });
                        }}
                      >
                        Tozalash
                      </Button>
                    </div>

                    {locationCoords.lat != null && locationCoords.lng != null ? (
                      <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                        Tanlangan nuqta: {locationCoords.lat.toFixed(6)}, {locationCoords.lng.toFixed(6)}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="https://www.openstreetmap.org/export/embed.html?..."
                      {...form.register('map_embed_url')}
                    />
                    <p className="text-xs text-muted-foreground">
                      OpenStreetMap yoki boshqa xarita servisidan embed URL kiriting.
                    </p>
                  </div>
                )}

                <div className="mt-3 overflow-hidden rounded-lg border border-border">
                  {live.map_embed_url ? (
                    <iframe
                      src={live.map_embed_url}
                      loading="lazy"
                      className="h-44 w-full border-0"
                      title="Lokatsiya preview"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-background text-sm text-muted-foreground">
                      Lokatsiya hali tanlanmagan
                    </div>
                  )}
                </div>
              </div>

              <textarea
                className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Qisqacha tavsif"
                {...form.register('short_description')}
              />
              <textarea
                className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="To'liq tavsif"
                {...form.register('full_description')}
              />

              {saveError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {saveError}
                </div>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingNow || autosaving || !canSave}
                  onClick={() => void performSave(true)}
                >
                  <Save className="h-4 w-4" />
                  {savingNow ? 'Saqlanmoqda...' : 'Saqlash'}
                </Button>
                <Button type="button" variant="secondary" disabled>
                  {autosaving ? 'Autosave...' : 'Autosave yoqilgan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={`${panelMode === 'edit' ? 'hidden md:block' : ''} lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pl-1`}>
          <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <CardTitle>Live preview</CardTitle>
              <CardDescription>
                {previewMode === 'mobile' ? "Mobil ko'rinish" : "Desktop ko'rinish"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`mx-auto w-full rounded-2xl border border-border bg-card ${
                  previewMode === 'mobile' ? 'max-w-[390px]' : 'max-w-none'
                }`}
              >
                <div className="relative overflow-hidden rounded-t-2xl border-b border-border">
                  <div className="h-44 w-full bg-gradient-to-br from-sky-500/25 via-cyan-400/15 to-emerald-400/20">
                    {live.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={live.logo_url} alt={live.name || 'Logo'} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-4">
                    <h3 className="text-2xl font-bold">{live.name || 'Avtomaktab nomi'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {[live.city, live.region].filter(Boolean).join(', ') || 'Shahar, Hudud'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-300">
                      <Building2 className="mr-1 h-3.5 w-3.5" />
                      Avtomaktab
                    </Badge>
                    {live.is_active ? (
                      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                        <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                        Faol
                      </Badge>
                    ) : (
                      <Badge variant="secondary">NoFaol</Badge>
                    )}
                    {live.years_active ? <Badge variant="outline">{live.years_active} yil tajriba</Badge> : null}
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Qisqacha</p>
                    <p className="mt-2">{live.short_description || "Qisqacha tavsif bu yerda ko'rinadi."}</p>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Batafsil</p>
                    <p className="mt-2 whitespace-pre-line text-muted-foreground">
                      {live.full_description || "To'liq tavsif bu yerda ko'rinadi."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Aloqa</p>
                      <p className="mt-2 inline-flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        {live.phone || '-'}
                      </p>
                      {live.telegram ? (
                        <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground">
                          <Link2 className="h-4 w-4 text-primary" />
                          {live.telegram}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Lokatsiya</p>
                      <p className="mt-2 inline-flex items-start gap-2 text-muted-foreground">
                        <MapPinned className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{live.address || 'Manzil kiritilmagan'}</span>
                      </p>
                    </div>
                  </div>

                  {live.map_embed_url ? (
                    <div className="overflow-hidden rounded-xl border border-border">
                      <iframe
                        src={live.map_embed_url}
                        loading="lazy"
                        className="h-56 w-full border-0"
                        title="Avtomaktab xaritasi preview"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                      Xarita preview ko&apos;rsatish uchun lokatsiya tanlang.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={locationModalOpen} onOpenChange={setLocationModalOpen}>
        <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto border border-cyan-400/40 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Xaritadan lokatsiya tanlash</DialogTitle>
            <DialogDescription className="text-slate-300">
              Maydon ustiga bosib pin qo&apos;ying. Koordinata avtomatik saqlanadi.
            </DialogDescription>
          </DialogHeader>
          <MapPickerCanvas
            latitude={locationCoords.lat}
            longitude={locationCoords.lng}
            onPick={setLocationFromMap}
            isOpen={locationModalOpen}
            heightClass="h-[50vh] min-h-[320px]"
          />
          <DialogFooter className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-300">
              {locationCoords.lat != null && locationCoords.lng != null
                ? `Tanlangan: ${locationCoords.lat.toFixed(6)}, ${locationCoords.lng.toFixed(6)}`
                : "Tanlangan nuqta yo'q"}
            </p>
            <Button type="button" variant="secondary" onClick={() => setLocationModalOpen(false)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}





