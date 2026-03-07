'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Copy, MapPin, Phone, Send, ShieldAlert, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/store/useAuth';
import {
  DrivingInstructorComplaintFormData,
  DrivingInstructorDetail,
  drivingInstructorComplaintSchema,
  drivingInstructorLeadSchema,
  drivingInstructorReviewSchema,
} from '@/schemas/drivingInstructor.schema';
import {
  buildDrivingInstructorReferralUrl,
  getDrivingInstructorDetail,
  getDrivingInstructorReviews,
  submitDrivingInstructorComplaint,
  submitDrivingInstructorLead,
  submitDrivingInstructorReview,
} from '@/lib/drivingInstructors';
import { resolvePublicMediaUrl } from '@/lib/media';

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, idx) => (
        <Star
          key={idx}
          className={`h-4 w-4 ${
            idx < rounded ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
          }`}
        />
      ))}
    </div>
  );
}

type LeadFormState = {
  full_name: string;
  phone: string;
  requested_transmission: string;
  comment: string;
};

type ReviewFormState = {
  rating: number;
  comment: string;
};

type ComplaintFormState = {
  full_name: string;
  phone: string;
  reason: string;
  comment: string;
};

export default function DrivingInstructorDetailPage() {
  const params = useParams<{ slug: string }>();
  const slugValue = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const router = useRouter();
  const { user, token } = useAuth();

  const [instructor, setInstructor] = useState<DrivingInstructorDetail | null>(null);
  const [reviews, setReviews] = useState<DrivingInstructorDetail['reviews']>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  const [leadForm, setLeadForm] = useState<LeadFormState>({
    full_name: user?.full_name || '',
    phone: '',
    requested_transmission: '',
    comment: '',
  });
  const [reviewForm, setReviewForm] = useState<ReviewFormState>({ rating: 5, comment: '' });
  const [complaintForm, setComplaintForm] = useState<ComplaintFormState>({
    full_name: user?.full_name || '',
    phone: '',
    reason: 'Noqulay muomala',
    comment: '',
  });

  useEffect(() => {
    if (user?.full_name) {
      setLeadForm((prev) => ({ ...prev, full_name: prev.full_name || user.full_name || '' }));
      setComplaintForm((prev) => ({ ...prev, full_name: prev.full_name || user.full_name || '' }));
    }
  }, [user?.full_name]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    if (!slugValue) {
      setError('Instruktor topilmadi.');
      setIsLoading(false);
      return () => {
        active = false;
      };
    }
    async function loadDetail() {
      try {
        const payload = await getDrivingInstructorDetail(slugValue);
        const reviewList = await getDrivingInstructorReviews(slugValue, 80);
        if (!active) return;
        setInstructor(payload);
        setReviews(reviewList);
        setError(null);
        setActiveMediaIdx(0);
      } catch {
        if (!active) return;
        setInstructor(null);
        setReviews([]);
        setError('Instruktor ma\'lumotini yuklashda xatolik.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadDetail();
    return () => {
      active = false;
    };
  }, [slugValue]);

  useEffect(() => {
    if (!slugValue) return;
    let alive = true;
    const sync = async () => {
      try {
        const [detail, list] = await Promise.all([
          getDrivingInstructorDetail(slugValue),
          getDrivingInstructorReviews(slugValue, 80),
        ]);
        if (!alive) return;
        setInstructor(detail);
        setReviews(list);
      } catch {
        // silent background refresh
      }
    };
    const onFocus = () => {
      void sync();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void sync();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [slugValue]);

  const activeMedia = useMemo(() => {
    if (!instructor || instructor.media_items.length === 0) return null;
    return instructor.media_items[activeMediaIdx] || instructor.media_items[0];
  }, [instructor, activeMediaIdx]);
  const activeMediaUrl = useMemo(
    () => resolvePublicMediaUrl(activeMedia?.url),
    [activeMedia?.url],
  );

  const referralUrl = instructor ? buildDrivingInstructorReferralUrl(instructor.referral_code) : '';

  const reviewStats = useMemo(() => {
    const total = reviews.length;
    const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const review of reviews) {
      const key = String(review.rating);
      distribution[key] = (distribution[key] || 0) + 1;
    }
    const average = total > 0 ? Number((reviews.reduce((acc, item) => acc + item.rating, 0) / total).toFixed(2)) : 0;
    return { total, distribution, average };
  }, [reviews]);

  const distributionRows = useMemo(() => {
    const total = Math.max(reviewStats.total, 1);
    return [5, 4, 3, 2, 1].map((star) => {
      const count = reviewStats.distribution[String(star)] || 0;
      const percent = Math.round((count / total) * 100);
      return { star, count, percent };
    });
  }, [reviewStats.distribution, reviewStats.total]);

  async function reloadInstructorState(slug: string) {
    const [detail, list] = await Promise.all([
      getDrivingInstructorDetail(slug),
      getDrivingInstructorReviews(slug, 80),
    ]);
    setInstructor(detail);
    setReviews(list);
  }

  async function handleLeadSubmit(event: FormEvent) {
    event.preventDefault();
    if (!instructor) return;
    const parsed = drivingInstructorLeadSchema.safeParse({
      ...leadForm,
      requested_transmission: leadForm.requested_transmission || undefined,
      comment: leadForm.comment || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Forma xato toldirildi.');
      return;
    }
    setIsSubmittingLead(true);
    try {
      await submitDrivingInstructorLead(instructor.slug, parsed.data);
      toast.success('Sorovingiz yuborildi. Instruktor va admin paneliga yetkazildi.');
      setLeadForm((prev) => ({ ...prev, phone: '', comment: '' }));
    } catch {
      toast.error('Sorov yuborishda xatolik yuz berdi.');
    } finally {
      setIsSubmittingLead(false);
    }
  }

  async function handleReviewSubmit(event: FormEvent) {
    event.preventDefault();
    if (!instructor) return;
    if (!token) {
      router.push(`/login?redirect=/driving-instructors/${instructor.slug}`);
      return;
    }
    const parsed = drivingInstructorReviewSchema.safeParse({
      rating: reviewForm.rating,
      comment: reviewForm.comment || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Baholash formasida xatolik.');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await submitDrivingInstructorReview(instructor.slug, parsed.data);
      await reloadInstructorState(instructor.slug);
      toast.success('Baho qabul qilindi.');
      setReviewForm((prev) => ({ ...prev, comment: '' }));
    } catch {
      toast.error('Baho yuborishda xatolik yuz berdi.');
    } finally {
      setIsSubmittingReview(false);
    }
  }

  async function handleComplaintSubmit(event: FormEvent) {
    event.preventDefault();
    if (!instructor) return;
    const formPayload: DrivingInstructorComplaintFormData = {
      full_name: complaintForm.full_name,
      phone: complaintForm.phone || undefined,
      reason: complaintForm.reason,
      comment: complaintForm.comment || undefined,
    };
    const parsed = drivingInstructorComplaintSchema.safeParse(formPayload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Shikoyat formasida xatolik.');
      return;
    }
    setIsSubmittingComplaint(true);
    try {
      await submitDrivingInstructorComplaint(instructor.slug, parsed.data);
      toast.success('Shikoyat qabul qilindi.');
      setComplaintForm((prev) => ({ ...prev, comment: '' }));
    } catch {
      toast.error('Shikoyat yuborishda xatolik yuz berdi.');
    } finally {
      setIsSubmittingComplaint(false);
    }
  }

  if (isLoading) {
    return (
      <section className="bg-background py-10">
        <div className="container-app space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      </section>
    );
  }

  if (error || !instructor) {
    return (
      <section className="bg-background py-12">
        <div className="container-app rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
          <p>{error || 'Instruktor topilmadi.'}</p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/driving-instructors">← Katalogga qaytish</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-10 md:py-14">
      <div className="container-app space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {instructor.city}
              {instructor.region ? `, ${instructor.region}` : ''}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{instructor.full_name}</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">{instructor.short_bio}</p>
            <div className="mt-4 flex items-center gap-3">
              <RatingStars rating={reviewStats.average} />
              <span className="text-sm font-medium">{reviewStats.average.toFixed(1)} / 5</span>
              <span className="text-sm text-muted-foreground">({reviewStats.total} ta baho)</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
                Ko&apos;rishlar: {instructor.view_count ?? 0}
              </span>
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                Oxirgi 24 soat: {instructor.views_last_24h ?? 0}
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
                Leadlar: {instructor.lead_count ?? 0}
              </span>
              {instructor.is_most_selected ? (
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-500">
                  Eng ko&apos;p tanlangan
                </span>
              ) : null}
              {instructor.is_top_rated ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
                  Top instruktor
                </span>
              ) : null}
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/driving-instructors">← Katalogga qaytish</Link>
          </Button>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{instructor.disclaimer}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">Media</h2>
            {activeMedia ? (
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                {activeMedia.media_type === 'video' ? (
                  <video src={activeMediaUrl ?? activeMedia.url} controls className="h-[360px] w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeMediaUrl ?? activeMedia.url} alt={activeMedia.caption || instructor.full_name} className="h-[360px] w-full object-cover" />
                )}
              </div>
            ) : (
              <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground">
                Hozircha media mavjud emas
              </div>
            )}

            {instructor.media_items.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {instructor.media_items.map((item, idx) => (
                  (() => {
                    const itemUrl = resolvePublicMediaUrl(item.url) ?? item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveMediaIdx(idx)}
                        className={`overflow-hidden rounded-lg border ${idx === activeMediaIdx ? 'border-primary' : 'border-border'}`}
                      >
                        {item.media_type === 'video' ? (
                          <div className="flex h-20 items-center justify-center bg-muted text-xs text-muted-foreground">Video</div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={itemUrl} alt={item.caption || `${instructor.full_name}-${idx + 1}`} className="h-20 w-full object-cover" />
                        )}
                      </button>
                    );
                  })()
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Asosiy ma&apos;lumotlar</h2>
            <ul className="space-y-3 text-sm">
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Tajriba: </span>
                {instructor.years_experience} yil
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Mashina: </span>
                {instructor.car_model} ({instructor.transmission === 'manual' ? 'Mexanika' : 'Avtomat'})
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Narx: </span>
                {(instructor.hourly_price_cents / 100).toLocaleString('en-US')} {instructor.currency} / soat
              </li>
              <li className="text-muted-foreground">
                <span className="font-medium text-foreground">Minimal dars: </span>
                {instructor.min_lesson_minutes} daqiqa
              </li>
              {instructor.special_services ? (
                <li className="text-muted-foreground">
                  <span className="font-medium text-foreground">Maxsus xizmatlar: </span>
                  {instructor.special_services}
                </li>
              ) : null}
              {instructor.service_areas ? (
                <li className="text-muted-foreground">
                  <span className="font-medium text-foreground">Hududlar: </span>
                  {instructor.service_areas}
                </li>
              ) : null}
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {instructor.city}
                  {instructor.region ? `, ${instructor.region}` : ''}
                </span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{instructor.phone}</span>
              </li>
              {instructor.telegram ? (
                <li className="text-muted-foreground">
                  <span className="font-medium text-foreground">Telegram: </span>
                  {instructor.telegram}
                </li>
              ) : null}
            </ul>

            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
              Referral kod: <span className="font-semibold">{instructor.referral_code}</span>
              {instructor.promo_code ? (
                <span className="ml-2">
                  Promo kod: <span className="font-semibold">{instructor.promo_code}</span>
                </span>
              ) : null}
              <div className="mt-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(referralUrl);
                    toast.success('Referral havola nusxalandi.');
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Referral linkni nusxalash
                </button>
              </div>
            </div>
          </div>
        </div>

        {instructor.map_embed_url ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <iframe
              src={instructor.map_embed_url}
              loading="lazy"
              className="h-[360px] w-full border-0"
              referrerPolicy="no-referrer-when-downgrade"
              title={`${instructor.full_name} xaritada`}
            />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <div id="contact-instructor" className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Instruktor bilan bog&apos;lanish</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Yuborilgan so&apos;rov instruktor kabineti va admin panelidagi so&apos;rovlar bo&apos;limiga tushadi.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleLeadSubmit}>
              <Input
                placeholder="Ism"
                value={leadForm.full_name}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, full_name: event.target.value }))}
              />
              <Input
                placeholder="Telefon"
                value={leadForm.phone}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <select
                value={leadForm.requested_transmission}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, requested_transmission: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Mexanika yoki Avtomat</option>
                <option value="manual">Mexanika</option>
                <option value="automatic">Avtomat</option>
              </select>
              <textarea
                className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Qoshimcha izoh"
                value={leadForm.comment}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, comment: event.target.value }))}
              />
              <Button type="submit" disabled={isSubmittingLead} className="w-full">
                <Send className="mr-2 h-4 w-4" />
                {isSubmittingLead ? 'Yuborilmoqda...' : 'Sorov yuborish'}
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Shikoyat yuborish</h2>
            <form className="mt-4 space-y-3" onSubmit={handleComplaintSubmit}>
              <Input
                placeholder="Ism"
                value={complaintForm.full_name}
                onChange={(event) => setComplaintForm((prev) => ({ ...prev, full_name: event.target.value }))}
              />
              <Input
                placeholder="Telefon (ixtiyoriy)"
                value={complaintForm.phone}
                onChange={(event) => setComplaintForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <Input
                placeholder="Shikoyat sababi"
                value={complaintForm.reason}
                onChange={(event) => setComplaintForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
              <textarea
                className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Batafsil izoh"
                value={complaintForm.comment}
                onChange={(event) => setComplaintForm((prev) => ({ ...prev, comment: event.target.value }))}
              />
              <Button type="submit" variant="outline" disabled={isSubmittingComplaint} className="w-full">
                {isSubmittingComplaint ? 'Yuborilmoqda...' : 'Shikoyat yuborish'}
              </Button>
            </form>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Baholash va izoh</h2>
            <form className="mt-4 space-y-3" onSubmit={handleReviewSubmit}>
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const value = idx + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReviewForm((prev) => ({ ...prev, rating: value }))}
                      className="rounded p-0.5"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          value <= reviewForm.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/40'
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="text-sm text-muted-foreground">{reviewForm.rating}/5</span>
              </div>
              <textarea
                className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Instruktor bo'yicha fikringiz..."
                value={reviewForm.comment}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
              />
              <Button type="submit" disabled={isSubmittingReview}>
                {isSubmittingReview ? 'Yuborilmoqda...' : 'Bahoni yuborish'}
              </Button>
              {!token ? (
                <p className="text-xs text-muted-foreground">Baho qoldirish uchun avval tizimga kiring.</p>
              ) : null}
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Reyting taqsimoti</h2>
            <div className="mt-4 space-y-2">
              {distributionRows.map((row) => (
                <div key={row.star} className="grid grid-cols-[48px_1fr_70px] items-center gap-2 text-sm">
                  <span>{row.star} в­ђ</span>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-amber-400" style={{ width: `${row.percent}%` }} />
                  </div>
                  <span className="text-right text-muted-foreground">
                    {row.count} ({row.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Izohlar</h2>
          <div className="mt-4 space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Hozircha izohlar yo&apos;q.</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{review.user_display_name || 'Foydalanuvchi'}</p>
                    <div className="flex items-center gap-2">
                      <RatingStars rating={review.rating} />
                      <span className="text-sm font-medium">{review.rating}/5</span>
                    </div>
                  </div>
                  {review.comment ? <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p> : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-5 right-5 z-40">
        <Button asChild className="h-11 rounded-full px-5 shadow-lg">
          <Link href="#contact-instructor">Bog&apos;lanish</Link>
        </Button>
      </div>
    </section>
  );
}

