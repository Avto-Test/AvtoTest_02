'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  Circle,
  Clock3,
  MapPinned,
  MessageSquare,
  PencilLine,
  PhoneCall,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/useAuth';
import {
  AdminDrivingSchool,
  AdminDrivingSchoolLead,
  DrivingSchoolPartnerApplication,
  DrivingSchoolReviewItem,
} from '@/schemas/drivingSchool.schema';
import {
  getMyDrivingSchoolLeads,
  getMyDrivingSchoolReviews,
  getMyDrivingSchoolSummary,
} from '@/lib/drivingSchools';

type StatusTone = 'active' | 'pending' | 'blocked';

type DashboardStatus = {
  tone: StatusTone;
  label: string;
  hint: string;
};

function statusBadgeClass(tone: StatusTone): string {
  if (tone === 'active') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (tone === 'blocked') return 'bg-red-500/15 text-red-400 border-red-500/30';
  return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
}

function leadStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'new') return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  if (normalized === 'contacted') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (normalized === 'closed') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  return 'bg-muted text-muted-foreground border-border';
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('uz-UZ');
}

function parseDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function ratingFromReviews(reviews: DrivingSchoolReviewItem[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
  return Number((sum / reviews.length).toFixed(2));
}

export default function SchoolDashboardPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<AdminDrivingSchool | null>(null);
  const [application, setApplication] = useState<DrivingSchoolPartnerApplication | null>(null);
  const [leads, setLeads] = useState<AdminDrivingSchoolLead[]>([]);
  const [reviews, setReviews] = useState<DrivingSchoolReviewItem[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push('/login?redirect=/school/dashboard');
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [summary, leadRows, reviewRows] = await Promise.all([
          getMyDrivingSchoolSummary(),
          getMyDrivingSchoolLeads(),
          getMyDrivingSchoolReviews(),
        ]);
        if (!active) return;
        setSchool(summary.school);
        setApplication(summary.latest_application);
        setLeads(leadRows);
        setReviews(reviewRows);
      } catch {
        if (!active) return;
        toast.error("Avtomaktab kabinetini yuklashda xatolik yuz berdi.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [hydrated, router, token]);

  const profileStatus = useMemo<DashboardStatus>(() => {
    if (school) {
      if (school.is_active) {
        return {
          tone: 'active',
          label: 'Faol',
          hint: "Profil katalogda ko'rinmoqda va lead qabul qilmoqda.",
        };
      }
      return {
        tone: 'blocked',
        label: 'NoFaol',
        hint: "Profil vaqtincha nofaol. Aktivatsiya uchun admin bilan bog'laning.",
      };
    }

    const applicationStatus = (application?.status || '').toLowerCase();
    if (applicationStatus === 'approved') {
      return {
        tone: 'active',
        label: 'Tasdiqlandi',
        hint: "Ariza tasdiqlangan. Profil biriktirilishi uchun sahifani yangilang.",
      };
    }
    if (applicationStatus === 'rejected') {
      return {
        tone: 'blocked',
        label: 'Rad etildi',
        hint: application?.note || "Ariza qayta to'ldirilishi kerak.",
      };
    }
    if (['pending', 'new', 'reviewing'].includes(applicationStatus)) {
      return {
        tone: 'pending',
        label: 'Tekshiruvda',
        hint: 'Arizangiz moderatsiyada.',
      };
    }
    return {
      tone: 'pending',
      label: "Profil yo'q",
      hint: "Kabinetni faollashtirish uchun hamkorlik arizasini yuboring.",
    };
  }, [application, school]);

  const profileCompletion = useMemo(() => {
    if (!school) return 0;
    const checks = [
      school.name,
      school.city,
      school.phone,
      school.short_description,
      school.full_description,
      school.logo_url,
      school.map_embed_url,
      school.address,
      school.work_hours,
      school.website,
    ];
    const filled = checks.filter((value) => Boolean(String(value || '').trim())).length;
    return Math.round((filled / checks.length) * 100);
  }, [school]);

  const newLeads7d = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return leads.filter((lead) => parseDate(lead.created_at).getTime() >= sevenDaysAgo).length;
  }, [leads]);

  const avgRating = useMemo(() => {
    if (school) return school.rating_avg || 0;
    return ratingFromReviews(reviews);
  }, [reviews, school]);

  const leadStatusOverview = useMemo(() => {
    const base = { new: 0, contacted: 0, closed: 0 };
    for (const lead of leads) {
      const key = lead.status.toLowerCase() as keyof typeof base;
      if (key in base) base[key] += 1;
    }
    return base;
  }, [leads]);

  const recentLeads = useMemo(() => leads.slice(0, 6), [leads]);
  const recentReviews = useMemo(() => reviews.slice(0, 6), [reviews]);

  if (!hydrated || loading) {
    return (
      <section className="container-app py-10">
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
      </section>
    );
  }

  return (
    <section className="container-app space-y-6 py-10">
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Avtomaktab kabineti</CardTitle>
              <CardDescription>
                Holat, leadlar, baholar va keyingi amallar bitta markazda.
              </CardDescription>
            </div>
            <Badge className={cn('border text-sm', statusBadgeClass(profileStatus.tone))}>
              {profileStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{profileStatus.hint}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Profil to‘liqligi</span>
              <span className="font-semibold">{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="h-2.5" />
          </div>
          <div className="text-xs text-muted-foreground">
            Oxirgi yangilangan:{' '}
            <span className="font-medium text-foreground">
              {formatDate(school?.updated_at || application?.updated_at || application?.created_at)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {!school ? (
              <Button asChild>
                <Link href="/driving-schools/partner">Ariza yuborish</Link>
              </Button>
            ) : null}
            {school ? (
              <>
                <Button asChild variant="secondary">
                  <Link href="/school/profile-builder">
                    <PencilLine className="mr-2 h-4 w-4" />
                    Profilni tahrirlash
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/driving-schools/${school.slug}`}>Public profilni ochish</Link>
                </Button>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {!school ? (
        <Card>
          <CardHeader>
            <CardTitle>Profil hali biriktirilmagan</CardTitle>
            <CardDescription>
              Ariza yuborilgach, admin tasdiqlaganidan keyin shaxsiy kabinet to‘liq ochiladi.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/driving-schools/partner">Hamkorlik arizasini yuborish</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/driving-schools">Katalogga qaytish</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>So‘nggi 7 kun leadlari</CardDescription>
                <CardTitle className="text-2xl">{newLeads7d}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Jami lead: <span className="font-semibold text-foreground">{school.lead_count}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>O‘rtacha reyting</CardDescription>
                <CardTitle className="text-2xl">{avgRating.toFixed(2)}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Baholar soni: <span className="font-semibold text-foreground">{school.review_count}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Yangi / Aloqada / Yopilgan</CardDescription>
                <CardTitle className="text-xl">
                  {leadStatusOverview.new} / {leadStatusOverview.contacted} / {leadStatusOverview.closed}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Lead pipeline holati.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Kurslar soni</CardDescription>
                <CardTitle className="text-2xl">{school.courses.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Faol kurslar va toifalar boshqaruvi admin panelda.
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Action center</CardTitle>
              <CardDescription>Eng ko‘p ishlatiladigan amallar.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/school/profile-builder">
                  <PencilLine className="mr-2 h-4 w-4" />
                  Profilni tahrirlash
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href={`/driving-schools/${school.slug}`}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Public sahifa
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <a href={`tel:${school.phone}`}>
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Telefon orqali aloqa
                </a>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/driving-schools/partner">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Hamkorlik statusi
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/history">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Tarix va natijalar
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  So‘nggi leadlar
                </CardTitle>
                <CardDescription>Yangi kelgan so‘rovlar va holati.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Hozircha leadlar yo‘q.</p>
                ) : (
                  recentLeads.map((lead) => (
                    <div key={lead.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{lead.full_name}</p>
                        <Badge className={cn('border', leadStatusBadgeClass(lead.status))}>{lead.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{lead.phone}</p>
                      {lead.requested_category ? (
                        <p className="mt-1 text-xs text-muted-foreground">Toifa: {lead.requested_category}</p>
                      ) : null}
                      {lead.comment ? <p className="mt-2 text-sm text-muted-foreground">{lead.comment}</p> : null}
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(lead.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  So‘nggi baholar
                </CardTitle>
                <CardDescription>Foydalanuvchi fikrlari va reyting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Hozircha baholar yo‘q.</p>
                ) : (
                  recentReviews.map((review) => (
                    <div key={review.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{review.user_display_name || 'Foydalanuvchi'}</p>
                        <p className="inline-flex items-center gap-1 text-sm font-semibold">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {review.rating}/5
                        </p>
                      </div>
                      {review.comment ? <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p> : null}
                      <p className="mt-2 text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profil lifecycle</CardTitle>
              <CardDescription>Avtomaktab onboarding bosqichlari.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: 'Ariza yuborildi', done: Boolean(application || school) },
                  { label: 'Admin tasdiqladi', done: Boolean(application?.status === 'approved' || school) },
                  { label: 'Profil to‘ldirildi', done: profileCompletion >= 100 },
                  { label: 'Lead olindi', done: school.lead_count > 0 },
                  { label: 'Fikrlar olindi', done: school.review_count > 0 },
                ].map((step) => (
                  <div
                    key={step.label}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border p-3 text-sm',
                      step.done
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-border bg-background text-muted-foreground'
                    )}
                  >
                    {step.done ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <Circle className="mt-0.5 h-4 w-4" />}
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Konversiya signal</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="inline-flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Yangi leadlar (7 kun): <span className="font-semibold text-foreground">{newLeads7d}</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Kontakt sifati</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="inline-flex items-center gap-1">
                  <MapPinned className="h-4 w-4 text-sky-400" />
                  Manzil ko‘rsatilgan:{' '}
                  <span className="font-semibold text-foreground">{school.address ? 'Ha' : "Yo'q"}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
