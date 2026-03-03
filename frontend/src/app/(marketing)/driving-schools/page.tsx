'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, Star, MapPin, Filter } from 'lucide-react';
import {
    DrivingSchoolCatalogItem,
    DrivingSchoolMetaResponse,
} from '@/schemas/drivingSchool.schema';
import { getDrivingSchoolMeta, getDrivingSchools } from '@/lib/drivingSchools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function formatMoney(cents: number | null, currency: string | null): string {
    if (cents === null || currency === null) return 'Narx kelishiladi';
    const amount = cents / 100;
    return `${amount.toLocaleString('en-US')} ${currency}`;
}

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

export default function DrivingSchoolsCatalogPage() {
    const [items, setItems] = useState<DrivingSchoolCatalogItem[]>([]);
    const [meta, setMeta] = useState<DrivingSchoolMetaResponse>({
        cities: [],
        regions: [],
        categories: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState('');
    const [city, setCity] = useState('');
    const [region, setRegion] = useState('');
    const [category, setCategory] = useState('');
    const [sortBy, setSortBy] = useState<'rating' | 'price' | 'name' | 'newest'>('rating');
    const [ratingMin, setRatingMin] = useState('');
    const [durationMaxWeeks, setDurationMaxWeeks] = useState('');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [error, setError] = useState<string | null>(null);

    const pageSize = 12;
    const hasPrev = page > 0;
    const hasNext = (page + 1) * pageSize < total;

    const query = useMemo(() => {
        return {
            q: search.trim() || undefined,
            city: city || undefined,
            region: region || undefined,
            category: category || undefined,
            sort_by: sortBy,
            limit: pageSize,
            offset: page * pageSize,
            rating_min: ratingMin ? Number(ratingMin) : undefined,
            duration_max_weeks: durationMaxWeeks ? Number(durationMaxWeeks) : undefined,
            price_min_cents: priceMin ? Math.round(Number(priceMin) * 100) : undefined,
            price_max_cents: priceMax ? Math.round(Number(priceMax) * 100) : undefined,
        };
    }, [search, city, region, category, sortBy, page, ratingMin, durationMaxWeeks, priceMin, priceMax]);

    useEffect(() => {
        let active = true;
        async function loadMeta() {
            try {
                const payload = await getDrivingSchoolMeta();
                if (active) {
                    setMeta(payload);
                }
            } catch {
                if (active) setMeta({ cities: [], regions: [], categories: [] });
            }
        }
        void loadMeta();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        async function loadSchools() {
            try {
                const payload = await getDrivingSchools(query);
                if (!active) return;
                setItems(payload.items);
                setTotal(payload.total);
                setError(null);
            } catch {
                if (!active) return;
                setItems([]);
                setTotal(0);
                setError('Avtomaktablar ro‘yxatini yuklashda xatolik.');
            } finally {
                if (active) setIsLoading(false);
            }
        }
        void loadSchools();
        return () => {
            active = false;
        };
    }, [query]);

    return (
        <section className="bg-background py-10 md:py-14">
            <div className="container-app space-y-8">
                <div className="space-y-3">
                    <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        Yangi bo‘lim
                    </p>
                    <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Hamkor avtomaktablar katalogi</h1>
                    <p className="max-w-3xl text-muted-foreground">
                        O‘zingizga mos avtomaktabni shahar, toifa, narx va reyting bo‘yicha toping. Har bir profil sahifasida
                        bevosita bog‘lanish va kurslar tafsiloti mavjud.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            asChild
                            size="sm"
                            className="group relative overflow-hidden border border-primary/40 bg-gradient-to-r from-primary via-sky-500 to-cyan-500 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.2),0_10px_28px_rgba(14,165,233,0.35)] transition hover:brightness-110"
                        >
                            <Link href="/school/dashboard" className="inline-flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 opacity-75" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                                </span>
                                Avtomaktab kabineti
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                        </Button>
                        <Button asChild size="sm">
                            <Link href="/driving-schools/partner">Hamkor bo&apos;lish</Link>
                        </Button>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="relative md:col-span-2 lg:col-span-2">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Nomi, tavsif yoki manzil bo‘yicha qidirish..."
                                value={search}
                                onChange={(event) => {
                                    setPage(0);
                                    setSearch(event.target.value);
                                }}
                                className="pl-9"
                            />
                        </div>

                        <select
                            value={city}
                            onChange={(event) => {
                                setPage(0);
                                setCity(event.target.value);
                            }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="">Barcha shaharlar</option>
                            {meta.cities.map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>

                        <select
                            value={region}
                            onChange={(event) => {
                                setPage(0);
                                setRegion(event.target.value);
                            }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="">Barcha viloyatlar</option>
                            {meta.regions.map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                        <select
                            value={category}
                            onChange={(event) => {
                                setPage(0);
                                setCategory(event.target.value);
                            }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="">Barcha toifalar</option>
                            {meta.categories.map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>

                        <Input
                            type="number"
                            min={0}
                            step={0.1}
                            placeholder="Narx min"
                            value={priceMin}
                            onChange={(event) => {
                                setPage(0);
                                setPriceMin(event.target.value);
                            }}
                        />

                        <Input
                            type="number"
                            min={0}
                            step={0.1}
                            placeholder="Narx max"
                            value={priceMax}
                            onChange={(event) => {
                                setPage(0);
                                setPriceMax(event.target.value);
                            }}
                        />

                        <Input
                            type="number"
                            min={1}
                            max={5}
                            step={0.1}
                            placeholder="Reyting (min)"
                            value={ratingMin}
                            onChange={(event) => {
                                setPage(0);
                                setRatingMin(event.target.value);
                            }}
                        />

                        <Input
                            type="number"
                            min={1}
                            max={520}
                            placeholder="Muddat (hafta)"
                            value={durationMaxWeeks}
                            onChange={(event) => {
                                setPage(0);
                                setDurationMaxWeeks(event.target.value);
                            }}
                        />

                        <select
                            value={sortBy}
                            onChange={(event) => {
                                setPage(0);
                                setSortBy(event.target.value as 'rating' | 'price' | 'name' | 'newest');
                            }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="rating">Reyting bo‘yicha</option>
                            <option value="price">Narx bo‘yicha</option>
                            <option value="name">Nom bo‘yicha</option>
                            <option value="newest">Yangi qo‘shilgan</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        <span>Jami topildi: {total}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" disabled={!hasPrev} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
                            Oldingi
                        </Button>
                        <span className="text-sm text-muted-foreground">Sahifa: {page + 1}</span>
                        <Button variant="outline" disabled={!hasNext} onClick={() => setPage((prev) => prev + 1)}>
                            Keyingi
                        </Button>
                    </div>
                </div>

                {error ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}

                {isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <div key={idx} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                        <h3 className="text-lg font-semibold">Mos avtomaktab topilmadi</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Filtrlarni o‘zgartirib yana urinib ko‘ring.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {items.map((school) => (
                            <article key={school.id} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/30">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                                        {school.logo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={school.logo_url} alt={school.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-semibold text-muted-foreground">LOGO</span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-lg font-semibold">{school.name}</h3>
                                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span>{school.city}{school.region ? `, ${school.region}` : ''}</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                                    {school.short_description || 'Qisqacha tavsif mavjud emas.'}
                                </p>

                                <div className="mt-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Boshlang‘ich narx</p>
                                        <p className="text-base font-semibold">{formatMoney(school.starting_price_cents, school.currency)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Reyting</p>
                                        <div className="mt-1 flex items-center justify-end gap-2">
                                            <RatingStars rating={school.rating_avg} />
                                            <span className="text-sm font-medium">{school.rating_avg.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {school.categories.slice(0, 3).map((value) => (
                                        <span key={value} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                            {value}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-5">
                                    <Button asChild className="w-full">
                                        <Link href={`/driving-schools/${school.slug}`}>Batafsil ko‘rish</Link>
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
                    <h2 className="text-xl font-semibold">Avtomaktabmisiz?</h2>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                        AUTOTEST orqali yangi o‘quvchilar oqimini oshiring, maxsus referral/promo tizimi bilan
                        natijalarni kuzating. Boshlang‘ich bosqichda joylashtirish bepul.
                    </p>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link href="/driving-schools/partner">Hamkor bo‘lish</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
