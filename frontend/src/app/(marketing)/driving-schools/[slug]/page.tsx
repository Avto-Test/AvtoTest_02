'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Copy, MapPin, Phone, Send, Star, Clock, Globe, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
    DrivingSchoolDetail,
    drivingSchoolLeadSchema,
    drivingSchoolReviewSchema,
} from '@/schemas/drivingSchool.schema';
import {
    buildReferralUrl,
    getDrivingSchoolDetail,
    getDrivingSchoolReviews,
    submitDrivingSchoolLead,
    submitDrivingSchoolReview,
} from '@/lib/drivingSchools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/store/useAuth';

function RatingStars({ rating }: { rating: number }) {
    const rounded = Math.round(rating);
    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                    key={idx}
                    className={`h-4 w-4 ${idx < rounded ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
                />
            ))}
        </div>
    );
}

type LeadFormState = {
    full_name: string;
    phone: string;
    requested_category: string;
    comment: string;
};

type ReviewFormState = {
    rating: number;
    comment: string;
};

export default function DrivingSchoolDetailPage() {
    const params = useParams<{ slug: string }>();
    const slugValue = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    const router = useRouter();
    const { user, token } = useAuth();
    const [school, setSchool] = useState<DrivingSchoolDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmittingLead, setIsSubmittingLead] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [activeMediaIdx, setActiveMediaIdx] = useState(0);
    const [reviews, setReviews] = useState<DrivingSchoolDetail['reviews']>([]);

    const [leadForm, setLeadForm] = useState<LeadFormState>({
        full_name: user?.full_name || '',
        phone: '',
        requested_category: '',
        comment: '',
    });

    const [reviewForm, setReviewForm] = useState<ReviewFormState>({
        rating: 5,
        comment: '',
    });

    useEffect(() => {
        if (user?.full_name && !leadForm.full_name) {
            setLeadForm((prev) => ({ ...prev, full_name: user.full_name || '' }));
        }
    }, [user?.full_name, leadForm.full_name]);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        if (!slugValue) {
            setError('Avtomaktab topilmadi.');
            setIsLoading(false);
            return () => {
                active = false;
            };
        }
        async function loadDetail() {
            try {
                const payload = await getDrivingSchoolDetail(slugValue);
                const list = await getDrivingSchoolReviews(slugValue, 50);
                if (!active) return;
                setSchool(payload);
                setReviews(list);
                setActiveMediaIdx(0);
                setError(null);
            } catch {
                if (!active) return;
                setSchool(null);
                setReviews([]);
                setError('Avtomaktab ma’lumotini yuklab bo‘lmadi.');
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
                    getDrivingSchoolDetail(slugValue),
                    getDrivingSchoolReviews(slugValue, 50),
                ]);
                if (!alive) return;
                setSchool(detail);
                setReviews(list);
            } catch {
                // silent refresh
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
        if (!school || school.media_items.length === 0) return null;
        return school.media_items[activeMediaIdx] || school.media_items[0];
    }, [school, activeMediaIdx]);

    const reviewStats = useMemo(() => {
        const total = reviews.length;
        const average = total > 0
            ? Number((reviews.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(2))
            : 0;
        return { total, average };
    }, [reviews]);

    const referralUrl = school ? buildReferralUrl(school.referral_code) : '';

    async function handleLeadSubmit(event: FormEvent) {
        event.preventDefault();
        if (!school) return;

        const parsed = drivingSchoolLeadSchema.safeParse({
            ...leadForm,
            requested_category: leadForm.requested_category || undefined,
            comment: leadForm.comment || undefined,
        });
        if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message || 'Forma noto‘g‘ri to‘ldirildi.');
            return;
        }

        setIsSubmittingLead(true);
        try {
            await submitDrivingSchoolLead(school.slug, parsed.data);
            toast.success('So‘rovingiz yuborildi. Tez orada aloqaga chiqishadi.');
            setLeadForm((prev) => ({ ...prev, phone: '', comment: '' }));
        } catch {
            toast.error('So‘rov yuborishda xatolik bo‘ldi.');
        } finally {
            setIsSubmittingLead(false);
        }
    }

    async function handleReviewSubmit(event: FormEvent) {
        event.preventDefault();
        if (!school) return;
        if (!token) {
            router.push(`/login?redirect=/driving-schools/${school.slug}`);
            return;
        }

        const parsed = drivingSchoolReviewSchema.safeParse({
            rating: reviewForm.rating,
            comment: reviewForm.comment || undefined,
        });
        if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message || 'Baholash formasida xatolik.');
            return;
        }

        setIsSubmittingReview(true);
        try {
            await submitDrivingSchoolReview(school.slug, parsed.data);
            const [updatedDetail, updatedReviews] = await Promise.all([
                getDrivingSchoolDetail(school.slug),
                getDrivingSchoolReviews(school.slug, 50),
            ]);
            setSchool(updatedDetail);
            setReviews(updatedReviews);
            toast.success('Bahongiz qabul qilindi.');
            setReviewForm((prev) => ({ ...prev, comment: '' }));
        } catch {
            toast.error('Baho yuborishda xatolik bo‘ldi.');
        } finally {
            setIsSubmittingReview(false);
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

    if (error || !school) {
        return (
            <section className="bg-background py-12">
                <div className="container-app rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
                    <p>{error || 'Avtomaktab topilmadi.'}</p>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/driving-schools">Katalogga qaytish</Link>
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
                        <p className="text-sm text-muted-foreground">{school.city}{school.region ? `, ${school.region}` : ''}</p>
                        <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{school.name}</h1>
                        <p className="mt-3 max-w-3xl text-muted-foreground">{school.short_description || school.full_description || 'Tavsif mavjud emas.'}</p>
                        <div className="mt-4 flex items-center gap-3">
                            <RatingStars rating={reviewStats.average} />
                            <span className="text-sm font-medium">{reviewStats.average.toFixed(1)} / 5</span>
                            <span className="text-sm text-muted-foreground">({reviewStats.total} ta baho)</span>
                        </div>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/driving-schools">← Katalogga qaytish</Link>
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                        <h2 className="text-lg font-semibold">Media</h2>
                        {activeMedia ? (
                            <div className="overflow-hidden rounded-xl border border-border bg-background">
                                {activeMedia.media_type === 'video' ? (
                                    <video src={activeMedia.url} controls className="h-[360px] w-full object-cover" />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={activeMedia.url} alt={activeMedia.caption || school.name} className="h-[360px] w-full object-cover" />
                                )}
                            </div>
                        ) : (
                            <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground">
                                Hozircha media joylanmagan
                            </div>
                        )}

                        {school.media_items.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                                {school.media_items.map((item, idx) => (
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
                                            <img src={item.url} alt={item.caption || `${school.name}-${idx + 1}`} className="h-20 w-full object-cover" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
                        <h2 className="text-lg font-semibold">Asosiy ma’lumotlar</h2>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-2 text-muted-foreground">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{school.address || 'Manzil kiritilmagan'}{school.landmark ? ` (${school.landmark})` : ''}</span>
                            </li>
                            <li className="flex items-start gap-2 text-muted-foreground">
                                <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{school.phone}</span>
                            </li>
                            <li className="flex items-start gap-2 text-muted-foreground">
                                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{school.work_hours || 'Ish vaqti ko‘rsatilmagan'}</span>
                            </li>
                            <li className="flex items-start gap-2 text-muted-foreground">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{school.license_info || 'Litsenziya ma’lumoti kiritilmagan'}</span>
                            </li>
                            <li className="flex items-start gap-2 text-muted-foreground">
                                <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{school.website ? <a href={school.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{school.website}</a> : 'Website yo‘q'}</span>
                            </li>
                        </ul>

                        <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
                            Referral kod: <span className="font-semibold">{school.referral_code}</span>
                            {school.promo_code ? <span className="ml-2">Promo kod: <span className="font-semibold">{school.promo_code}</span></span> : null}
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

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-card p-5">
                        <h2 className="text-lg font-semibold">Kurslar va narxlar</h2>
                        <div className="mt-4 space-y-3">
                            {school.courses.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Kurs ma’lumotlari mavjud emas.</p>
                            ) : (
                                school.courses.map((course) => (
                                    <div key={course.id} className="rounded-lg border border-border bg-background p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-semibold">Toifa: {course.category_code}</p>
                                            <p className="font-semibold">
                                                {course.price_cents !== null ? `${(course.price_cents / 100).toLocaleString('en-US')} ${course.currency}` : 'Narx kelishiladi'}
                                            </p>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Muddat: {course.duration_weeks ? `${course.duration_weeks} hafta` : 'Kelishiladi'}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            To‘lov: {course.installment_available ? 'Bo‘lib to‘lash mumkin' : 'Bir martalik'}
                                        </p>
                                        {course.description ? <p className="mt-2 text-sm text-muted-foreground">{course.description}</p> : null}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5">
                        <h2 className="text-lg font-semibold">Ushbu avtomaktab bilan bog‘lanish</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Yuborilgan so&apos;rov avtomaktab egasi kabineti va admin panelidagi so&apos;rovlar bo&apos;limiga tushadi.
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
                            <Input
                                placeholder="Qaysi toifa (B, C, BC...)"
                                value={leadForm.requested_category}
                                onChange={(event) => setLeadForm((prev) => ({ ...prev, requested_category: event.target.value }))}
                            />
                            <textarea
                                className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Qo‘shimcha izoh"
                                value={leadForm.comment}
                                onChange={(event) => setLeadForm((prev) => ({ ...prev, comment: event.target.value }))}
                            />
                            <Button type="submit" disabled={isSubmittingLead} className="w-full">
                                <Send className="mr-2 h-4 w-4" />
                                {isSubmittingLead ? 'Yuborilmoqda...' : 'So‘rov yuborish'}
                            </Button>
                        </form>
                    </div>
                </div>

                {school.map_embed_url ? (
                    <div className="overflow-hidden rounded-2xl border border-border bg-card">
                        <iframe
                            src={school.map_embed_url}
                            loading="lazy"
                            className="h-[360px] w-full border-0"
                            referrerPolicy="no-referrer-when-downgrade"
                            title={`${school.name} xaritada`}
                        />
                    </div>
                ) : null}

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
                                                className={`h-6 w-6 ${value <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
                                            />
                                        </button>
                                    );
                                })}
                                <span className="text-sm text-muted-foreground">{reviewForm.rating}/5</span>
                            </div>
                            <textarea
                                className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="O‘quv sifati, instruktorlar, narx bo‘yicha fikringiz..."
                                value={reviewForm.comment}
                                onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                            />
                            <Button type="submit" disabled={isSubmittingReview}>
                                {isSubmittingReview ? 'Yuborilmoqda...' : 'Bahoni yuborish'}
                            </Button>
                            {!token ? (
                                <p className="text-xs text-muted-foreground">
                                    Baho qoldirish uchun avval tizimga kiring.
                                </p>
                            ) : null}
                        </form>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-5">
                        <h2 className="text-lg font-semibold">O‘quvchilar fikri</h2>
                        <div className="mt-4 space-y-3">
                            {reviews.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Hozircha fikrlar yo‘q.</p>
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
                                        {review.comment ? (
                                            <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                                        ) : null}
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
