'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Filter, MapPin, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DrivingInstructorCatalogItem,
  DrivingInstructorMetaResponse,
} from '@/schemas/drivingInstructor.schema';
import { getDrivingInstructorMeta, getDrivingInstructors } from '@/lib/drivingInstructors';

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toLocaleString('en-US')} ${currency}`;
}

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

export default function DrivingInstructorsCatalogPage() {
  const [items, setItems] = useState<DrivingInstructorCatalogItem[]>([]);
  const [meta, setMeta] = useState<DrivingInstructorMetaResponse>({
    cities: [],
    regions: [],
    transmissions: [],
    genders: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [transmission, setTransmission] = useState('');
  const [gender, setGender] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'experience' | 'newest' | 'activity'>(
    'rating'
  );
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [ratingMin, setRatingMin] = useState('');
  const [experienceMin, setExperienceMin] = useState('');

  const pageSize = 12;
  const hasPrev = page > 0;
  const hasNext = (page + 1) * pageSize < total;
  const topRated = useMemo(() => items.filter((row) => row.is_top_rated).slice(0, 4), [items]);

  const query = useMemo(
    () => ({
      q: search.trim() || undefined,
      city: city || undefined,
      region: region || undefined,
      transmission: transmission || undefined,
      gender: gender || undefined,
      sort_by: sortBy,
      limit: pageSize,
      offset: page * pageSize,
      price_min_cents: priceMin ? Math.round(Number(priceMin) * 100) : undefined,
      price_max_cents: priceMax ? Math.round(Number(priceMax) * 100) : undefined,
      rating_min: ratingMin ? Number(ratingMin) : undefined,
      experience_min_years: experienceMin ? Number(experienceMin) : undefined,
    }),
    [
      search,
      city,
      region,
      transmission,
      gender,
      sortBy,
      page,
      priceMin,
      priceMax,
      ratingMin,
      experienceMin,
    ]
  );

  useEffect(() => {
    let active = true;
    async function loadMeta() {
      try {
        const payload = await getDrivingInstructorMeta();
        if (active) setMeta(payload);
      } catch {
        if (active) {
          setMeta({ cities: [], regions: [], transmissions: [], genders: [] });
        }
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
    async function loadItems() {
      try {
        const payload = await getDrivingInstructors(query);
        if (!active) return;
        setItems(payload.items);
        setTotal(payload.total);
        setError(null);
      } catch {
        if (!active) return;
        setItems([]);
        setTotal(0);
        setError('Instruktorlar royxatini yuklashda xatolik yuz berdi.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadItems();
    return () => {
      active = false;
    };
  }, [query]);

  return (
    <section className="bg-background py-10 md:py-14">
      <div className="container-app space-y-8">
        <div className="space-y-3">
          <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Yangi bo&apos;lim
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Haydash instruktorlari katalogi
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            O&apos;zingizga mos instruktorni hudud, mashina turi, tajriba va narx bo&apos;yicha toping.
            Platforma faqat yo&apos;naltiruvchi rolni bajaradi, kelishuv to&apos;g&apos;ridan-to&apos;g&apos;ri tomonlar
            o&apos;rtasida amalga oshiriladi.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              size="sm"
              className="group relative overflow-hidden border border-primary/40 bg-gradient-to-r from-primary via-sky-500 to-cyan-500 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.2),0_10px_28px_rgba(14,165,233,0.35)] transition hover:brightness-110"
            >
              <Link href="/instructor/dashboard" className="inline-flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                Instruktor kabineti
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/driving-instructors/apply">Instruktor sifatida ro&apos;yxatdan o&apos;tish</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ism, bio, model yoki hudud bo'yicha qidirish..."
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
                <option key={value} value={value}>
                  {value}
                </option>
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
              <option value="">Barcha hududlar</option>
              {meta.regions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <select
              value={transmission}
              onChange={(event) => {
                setPage(0);
                setTransmission(event.target.value);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Mexanika/Avtomat</option>
              {meta.transmissions.map((value) => (
                <option key={value} value={value}>
                  {value === 'manual' ? 'Mexanika' : value === 'automatic' ? 'Avtomat' : value}
                </option>
              ))}
            </select>

            <select
              value={gender}
              onChange={(event) => {
                setPage(0);
                setGender(event.target.value);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Jins</option>
              {meta.genders.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
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
              placeholder="Reyting min"
              value={ratingMin}
              onChange={(event) => {
                setPage(0);
                setRatingMin(event.target.value);
              }}
            />

            <Input
              type="number"
              min={0}
              max={80}
              placeholder="Tajriba min (yil)"
              value={experienceMin}
              onChange={(event) => {
                setPage(0);
                setExperienceMin(event.target.value);
              }}
            />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={sortBy}
              onChange={(event) => {
                setPage(0);
                setSortBy(
                  event.target.value as 'rating' | 'price' | 'experience' | 'newest' | 'activity'
                );
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="rating">Reyting bo&apos;yicha</option>
              <option value="price">Narx bo&apos;yicha</option>
              <option value="experience">Tajriba bo&apos;yicha</option>
              <option value="activity">Faollik bo&apos;yicha</option>
              <option value="newest">Yangi qo&apos;shilgan</option>
            </select>
            <Button asChild variant="outline" className="h-10">
              <Link href="/driving-instructors/apply">Instruktor sifatida ro&apos;yxatdan o&apos;tish</Link>
            </Button>
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
            <h3 className="text-lg font-semibold">Mos instruktor topilmadi</h3>
            <p className="mt-2 text-sm text-muted-foreground">Filtrlarni o&apos;zgartirib yana urinib ko&apos;ring.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {topRated.length > 0 ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <h2 className="text-lg font-semibold">Eng yuqori reytingli instruktorlar</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {topRated.map((instructor) => (
                    <Link
                      key={`top-${instructor.id}`}
                      href={`/driving-instructors/${instructor.slug}`}
                      className="rounded-lg border border-amber-500/30 bg-background p-3 text-sm"
                    >
                      <p className="font-semibold">{instructor.full_name}</p>
                      <p className="mt-1 text-muted-foreground">{instructor.city}</p>
                      <p className="mt-1">{instructor.rating_avg.toFixed(1)} ⭐</p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((instructor) => (
                <article
                  key={instructor.id}
                  className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                      {instructor.profile_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={instructor.profile_image_url}
                          alt={instructor.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">IMG</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-lg font-semibold">{instructor.full_name}</h3>
                        {instructor.is_new ? (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                            Yangi
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {instructor.city}
                          {instructor.region ? `, ${instructor.region}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">Tajriba</p>
                      <p className="font-semibold">{instructor.years_experience} yil</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">Mashina</p>
                      <p className="font-semibold">
                        {instructor.transmission === 'manual' ? 'Mexanika' : 'Avtomat'}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">Model: {instructor.car_model}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Soatlik narx</p>
                      <p className="text-base font-semibold">
                        {formatMoney(instructor.hourly_price_cents, instructor.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Reyting</p>
                      <div className="mt-1 flex items-center justify-end gap-2">
                        <RatingStars rating={instructor.rating_avg} />
                        <span className="text-sm font-medium">
                          {instructor.rating_avg.toFixed(1)} ({instructor.review_count})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <Button asChild className="w-full">
                      <Link href={`/driving-instructors/${instructor.slug}`}>Batafsil ko&apos;rish</Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
