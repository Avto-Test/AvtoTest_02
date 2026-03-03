'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BadgeCheck,
  CheckCircle2,
  Circle,
  Clock3,
  Crown,
  Gem,
  ImagePlus,
  Inbox,
  MessageSquare,
  PencilLine,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/store/useAuth';
import {
  DrivingInstructorAdmin,
  DrivingInstructorApplication,
  DrivingInstructorDashboardTrendPoint,
  DrivingInstructorLeadItem,
  DrivingInstructorReviewItem,
} from '@/schemas/drivingInstructor.schema';
import {
  getMyDrivingInstructorLeads,
  getMyDrivingInstructorReviews,
  getMyDrivingInstructorSummary,
} from '@/lib/drivingInstructors';
import { cn } from '@/lib/utils';

type StatusTone = 'active' | 'pending' | 'blocked';

type DashboardStatus = {
  tone: StatusTone;
  label: string;
  hint: string;
};

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('uz-UZ');
}

function dateKeyWithShift(date: Date, minusDays: number): string {
  const cloned = new Date(date);
  cloned.setDate(cloned.getDate() - minusDays);
  return cloned.toISOString().slice(0, 10);
}

function buildEmptyTrend(): DrivingInstructorDashboardTrendPoint[] {
  const now = new Date();
  const items: DrivingInstructorDashboardTrendPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    items.push({
      date: dateKeyWithShift(now, i),
      views: 0,
      leads: 0,
      reviews: 0,
    });
  }
  return items;
}

function parseDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

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

export default function InstructorDashboardPage() {
  const router = useRouter();
  const { token, hydrated, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [instructor, setInstructor] = useState<DrivingInstructorAdmin | null>(null);
  const [application, setApplication] = useState<DrivingInstructorApplication | null>(null);
  const [leads, setLeads] = useState<DrivingInstructorLeadItem[]>([]);
  const [reviews, setReviews] = useState<DrivingInstructorReviewItem[]>([]);
  const [trend, setTrend] = useState<DrivingInstructorDashboardTrendPoint[]>(buildEmptyTrend());
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push('/login?redirect=/instructor/dashboard');
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [summary, leadRows, reviewRows] = await Promise.all([
          getMyDrivingInstructorSummary(),
          getMyDrivingInstructorLeads(),
          getMyDrivingInstructorReviews(),
        ]);
        if (!active) return;
        setInstructor(summary.instructor);
        setApplication(summary.latest_application);
        setLeads(leadRows);
        setReviews(reviewRows);
        setTrend(summary.view_trend_7d?.length ? summary.view_trend_7d : buildEmptyTrend());
      } catch {
        if (!active) return;
        toast.error('Instruktor kabinetini yuklashda xatolik yuz berdi.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [hydrated, token, router]);

  const profileStatus = useMemo<DashboardStatus>(() => {
    if (instructor) {
      if (instructor.is_blocked) {
        return {
          tone: 'blocked',
          label: 'Bloklangan',
          hint: "Admin bilan bog'laning. Profil vaqtincha faol emas.",
        };
      }
      if (instructor.is_verified && instructor.is_active) {
        return {
          tone: 'active',
          label: 'Faol',
          hint: "Profil katalogda ko'rinmoqda va lead qabul qilmoqda.",
        };
      }
      return {
        tone: 'pending',
        label: 'Tekshiruvda',
        hint: "Profil moderatsiyadan o'tmoqda.",
      };
    }

    const applicationStatus = (application?.status || '').toLowerCase();
    if (applicationStatus === 'rejected') {
      return {
        tone: 'blocked',
        label: 'Rad etilgan',
        hint: application.rejection_reason || "Ariza qayta ko'rib chiqish uchun yangilanishi kerak.",
      };
    }
    if (applicationStatus === 'approved') {
      return {
        tone: 'active',
        label: 'Tasdiqlangan',
        hint: 'Profil biriktirilmoqda, sahifani yangilang.',
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
      hint: 'Instruktor sifatida ariza yuborib, kabinetni aktiv qiling.',
    };
  }, [application, instructor]);

  const profileCompletion = useMemo(() => {
    if (!instructor) return 0;
    const checks = [
      instructor.full_name,
      instructor.city,
      instructor.transmission,
      instructor.car_model,
      instructor.phone,
      instructor.short_bio,
      instructor.profile_image_url,
      instructor.service_areas,
      instructor.telegram,
      instructor.map_embed_url,
    ];
    const filled = checks.filter((value) => Boolean(String(value || '').trim())).length;
    return Math.round((filled / checks.length) * 100);
  }, [instructor]);

  const isPremium = user?.plan === 'premium';

  const views7d = useMemo(
    () => trend.reduce((acc, point) => acc + Number(point.views || 0), 0),
    [trend]
  );

  const newLeads7d = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return leads.filter((lead) => parseDate(lead.created_at).getTime() >= sevenDaysAgo).length;
  }, [leads]);

  const maxTrendViews = useMemo(() => {
    const maxValue = Math.max(...trend.map((point) => point.views), 0);
    return maxValue > 0 ? maxValue : 1;
  }, [trend]);

  const recentLeads = useMemo(() => leads.slice(0, 5), [leads]);
  const recentReviews = useMemo(() => reviews.slice(0, 5), [reviews]);

  const hasCoreInfo = useMemo(() => {
    if (!instructor) return false;
    return Boolean(
      instructor.full_name?.trim() &&
      instructor.city?.trim() &&
      instructor.phone?.trim() &&
      instructor.short_bio?.trim() &&
      instructor.car_model?.trim()
    );
  }, [instructor]);

  const hasMedia = useMemo(() => {
    if (!instructor) return false;
    return Boolean(instructor.profile_image_url?.trim()) && (instructor.media_items?.length || 0) > 0;
  }, [instructor]);

  const hasPricing = useMemo(() => {
    if (!instructor) return false;
    return instructor.hourly_price_cents > 0 && instructor.min_lesson_minutes >= 15;
  }, [instructor]);

  const onboardingSteps = useMemo(
    () => [
      {
        key: 'profile',
        title: "Ma'lumotlarni to'ldirish",
        done: hasCoreInfo,
        href: '/instructor/profile-builder',
      },
      {
        key: 'media',
        title: "Rasmlar qo'shish",
        done: hasMedia,
        href: '/instructor/profile-builder',
      },
      {
        key: 'pricing',
        title: 'Narxni aniqlash',
        done: hasPricing,
        href: '/instructor/profile-builder',
      },
    ],
    [hasCoreInfo, hasMedia, hasPricing]
  );

  const onboardingDoneCount = onboardingSteps.filter((step) => step.done).length;

  const isNewInstructor = useMemo(() => {
    if (!instructor?.created_at) return false;
    const createdAt = parseDate(instructor.created_at).getTime();
    return Date.now() - createdAt <= 14 * 24 * 60 * 60 * 1000;
  }, [instructor?.created_at]);

  const isTopInstructor = Boolean(
    instructor?.is_top_rated || ((instructor?.rating_avg || 0) >= 4.8 && (instructor?.review_count || 0) >= 5)
  );

  const activityLevel = useMemo(() => {
    const score = views7d + newLeads7d * 20 + (recentReviews.length || 0) * 8;
    if (score >= 180) return { label: 'Yuqori', className: 'text-emerald-400' };
    if (score >= 70) return { label: "O'rtacha", className: 'text-amber-400' };
    return { label: 'Past', className: 'text-muted-foreground' };
  }, [newLeads7d, recentReviews.length, views7d]);

  const showMonetizationTrigger = Boolean(
    instructor && !isPremium && instructor.view_count >= 100 && instructor.lead_count >= 5
  );

  const lifecycleSteps = useMemo(
    () => [
      { key: 'applied', label: 'Ariza yuborildi', done: Boolean(application || instructor) },
      {
        key: 'approved',
        label: 'Admin tasdiqladi',
        done: Boolean(instructor?.approved_at || application?.status === 'approved'),
      },
      { key: 'profile', label: "Profil to'ldirildi", done: profileCompletion >= 100 },
      { key: 'leads', label: 'Lead olindi', done: (instructor?.lead_count || 0) > 0 },
      { key: 'premium', label: 'Premiumga o‘tildi', done: Boolean(isPremium) },
    ],
    [application, instructor, profileCompletion, isPremium]
  );

  useEffect(() => {
    if (!instructor?.id || !instructor.approved_at) return;
    if (onboardingDoneCount >= onboardingSteps.length) return;
    if (typeof window === 'undefined') return;

    const key = `instructor-onboarding-dismissed:${instructor.id}`;
    const dismissed = window.localStorage.getItem(key) === '1';
    if (!dismissed) {
      setOnboardingOpen(true);
    }
  }, [instructor?.approved_at, instructor?.id, onboardingDoneCount, onboardingSteps.length]);

  if (!hydrated || loading) {
    return (
      <section className="container-app py-10">
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
      </section>
    );
  }

  function dismissOnboarding() {
    if (typeof window !== 'undefined' && instructor?.id) {
      window.localStorage.setItem(`instructor-onboarding-dismissed:${instructor.id}`, '1');
    }
    setOnboardingOpen(false);
  }

  return (
    <section className="container-app space-y-6 py-10">
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Instruktor kabineti</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Holatingiz, natijalaringiz va keyingi amallar shu yerda boshqariladi.
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
              <span className="text-muted-foreground">Profil to&apos;liqligi</span>
              <span className="font-semibold">{profileCompletion}%</span>
            </div>
            <Progress value={profileCompletion} className="h-2.5" />
          </div>
          <div className="text-xs text-muted-foreground">
            Oxirgi yangilangan:{' '}
            <span className="font-medium text-foreground">
              {formatDate(instructor?.updated_at || application?.updated_at || application?.created_at)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {!instructor ? (
              <Button asChild>
                <Link href="/driving-instructors/apply">Instruktor sifatida ariza yuborish</Link>
              </Button>
            ) : null}
            {instructor && profileCompletion < 100 ? (
              <Button asChild variant="secondary">
                <Link href="/instructor/profile-builder">Profilni to&apos;ldirish</Link>
              </Button>
            ) : null}
            {instructor ? (
              <Button asChild variant="outline">
                <Link href={`/driving-instructors/${instructor.slug}`}>Ochiq profilni ko&apos;rish</Link>
              </Button>
            ) : null}
            {!isPremium ? (
              <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-90">
                <Link href="/upgrade">Premiumga o&apos;tish</Link>
              </Button>
            ) : (
              <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                Premium faol
              </Badge>
            )}
          </div>

          {instructor ? (
            <div className="flex flex-wrap items-center gap-2">
              {isNewInstructor ? (
                <Badge className="border-sky-500/30 bg-sky-500/15 text-sky-300">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Yangi instruktor
                </Badge>
              ) : null}
              {isTopInstructor ? (
                <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-300">
                  <Crown className="mr-1 h-3.5 w-3.5" />
                  Top instruktor
                </Badge>
              ) : null}
              <Badge variant="outline" className={cn('border', activityLevel.className)}>
                <Zap className="mr-1 h-3.5 w-3.5" />
                Faollik: {activityLevel.label}
              </Badge>
              {onboardingDoneCount < onboardingSteps.length ? (
                <Button variant="ghost" size="sm" onClick={() => setOnboardingOpen(true)}>
                  Onboardingni davom ettirish
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instruktor lifecycle</CardTitle>
          <CardDescription>Jarayonning qaysi bosqichida turganingizni ko‘rsatadi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {lifecycleSteps.map((step) => (
              <div
                key={step.key}
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  step.done
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-border bg-background text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  <span className="font-medium">{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>KPI ko&apos;rsatkichlar</CardTitle>
          <CardDescription>So&apos;nggi faoliyat va biznes natijalari</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                So&apos;nggi 7 kunlik ko&apos;rishlar
              </div>
              <p className="mt-2 text-2xl font-bold">{views7d}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Inbox className="h-4 w-4" />
                Yangi leadlar (7 kun)
              </div>
              <p className="mt-2 text-2xl font-bold">{newLeads7d}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4" />
                O&apos;rtacha reyting
              </div>
              <p className="mt-2 text-2xl font-bold">{(instructor?.rating_avg || 0).toFixed(1)}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                Jami izohlar
              </div>
              <p className="mt-2 text-2xl font-bold">{instructor?.review_count || 0}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">7 kunlik ko&apos;rishlar trendi</p>
              <span className="text-xs text-muted-foreground">Kunlik kesim</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {trend.map((point) => {
                const height = Math.max(12, Math.round((point.views / maxTrendViews) * 88));
                const date = parseDate(point.date);
                return (
                  <div key={point.date} className="flex flex-col items-center gap-2">
                    <div className="flex h-24 w-full items-end justify-center rounded-md bg-muted/40 p-1">
                      <div
                        className="w-full rounded-sm bg-primary/85 transition-all"
                        style={{ height: `${height}%` }}
                        title={`${point.views} ta ko'rish`}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {date.toLocaleDateString('uz-UZ', { weekday: 'short' })}
                    </span>
                    <span className="text-xs font-semibold">{point.views}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {showMonetizationTrigger ? (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <CardHeader>
            <CardTitle className="text-amber-300">Premiumga o‘tish vaqti keldi</CardTitle>
            <CardDescription>
              Sizda {instructor?.view_count} ta ko‘rish va {instructor?.lead_count} ta lead bor.
              Premium orqali profilingizni yuqoriroq ko‘rsatish va ko‘proq mijoz jalb qilish mumkin.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-90">
              <Link href="/upgrade">Premiumga o‘tish</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/instructor/profile-builder">Profilni kuchaytirish</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Action Center</CardTitle>
          <CardDescription>Tezkor boshqaruv amallari</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Button asChild className="justify-start">
            <Link href="/instructor/profile-builder">
              <PencilLine className="h-4 w-4" />
              Profilni tahrirlash
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/instructor/profile-builder">
              <ImagePlus className="h-4 w-4" />
              Rasmlar qo&apos;shish
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/instructor/profile-builder">
              <TrendingUp className="h-4 w-4" />
              Narxni o&apos;zgartirish
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="#leads">
              <Inbox className="h-4 w-4" />
              Leadlarni ko&apos;rish
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/upgrade">
              <Gem className="h-4 w-4" />
              Premium tariflar
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="leads">
          <CardHeader>
            <CardTitle>So&apos;nggi leadlar</CardTitle>
            <CardDescription>Yangi / contacted / closed status bilan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLeads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Hozircha leadlar yo&apos;q.
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{lead.full_name}</p>
                    <Badge className={cn('border text-[11px] uppercase tracking-wide', leadStatusBadgeClass(lead.status))}>
                      {lead.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{lead.phone}</p>
                  {lead.comment ? <p className="mt-2 line-clamp-2 text-sm">{lead.comment}</p> : null}
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDate(lead.created_at)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>So&apos;nggi baholar</CardTitle>
            <CardDescription>Yulduz, preview va sana</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentReviews.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Hozircha baholar yo&apos;q.
              </div>
            ) : (
              recentReviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{review.user_display_name || 'Foydalanuvchi'}</p>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-semibold text-foreground">{review.rating}/5</span>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {review.comment || 'Izoh qoldirilmagan.'}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDate(review.created_at)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {!instructor ? (
        <Card className="border-amber-500/30">
          <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-400" />
              <div>
                <p className="font-semibold">Profil hali aktiv emas</p>
                <p className="text-sm text-muted-foreground">
                  Ariza yuborilgandan keyin admin tasdiqlaydi. Tasdiqdan keyin barcha KPI bloklari real vaqt ishlaydi.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/driving-instructors/apply">
                <BadgeCheck className="h-4 w-4" />
                Ariza yuborish
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Profilingizni to‘liq yakunlang</DialogTitle>
            <DialogDescription>
              Profilni to‘liq to‘ldirsangiz katalogda ko‘rinish, lead olish va konversiya sezilarli oshadi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Onboarding progress</span>
              <span className="font-semibold">
                {onboardingDoneCount}/{onboardingSteps.length}
              </span>
            </div>
            <Progress
              value={(onboardingDoneCount / Math.max(1, onboardingSteps.length)) * 100}
              className="h-2.5"
            />
            <div className="space-y-2">
              {onboardingSteps.map((step) => (
                <div
                  key={step.key}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                    step.done
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-border bg-background text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{step.title}</span>
                  </div>
                  {!step.done ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={step.href}>Bajarish</Link>
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold">Tayyor</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={dismissOnboarding}>
              Keyinroq
            </Button>
            <Button asChild>
              <Link href="/instructor/profile-builder">Profilni yakunlash</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

