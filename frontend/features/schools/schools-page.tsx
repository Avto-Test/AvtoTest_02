"use client";

import Link from "next/link";
import { Building2, MapPin, Phone, Search, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { getSchoolDetail, getSchoolMeta, getSchools } from "@/api/schools";
import { AppShell } from "@/components/app-shell";
import { useUser } from "@/hooks/use-user";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { SchoolLeadForm } from "@/features/schools/school-lead-form";
import type { SchoolCatalogResponse, SchoolDetail, SchoolMeta } from "@/types/school";

export function SchoolsPage() {
  const { user } = useUser();
  const [meta, setMeta] = useState<SchoolMeta | null>(null);
  const [schools, setSchools] = useState<SchoolCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState<"rating" | "price" | "name" | "newest">("rating");
  const [selectedDetail, setSelectedDetail] = useState<SchoolDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [nextMeta, nextSchools] = await Promise.all([
          getSchoolMeta(),
          getSchools({ q: query || undefined, city: city || undefined, category: category || undefined, sort_by: sortBy }),
        ]);
        if (active) {
          setMeta(nextMeta);
          setSchools(nextSchools);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Schools ma'lumoti yuklanmadi.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [category, city, query, sortBy]);

  const openDetail = async (slug: string) => {
    setDetailLoading(true);
    try {
      setSelectedDetail(await getSchoolDetail(slug));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Avtomaktablar" description="Search, filter va kartalar orqali mos maktabni tezroq toping." />

        <Card className="card-hover-lift">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium">Catalog va arizalar bir joyda</p>
              <p className="text-sm text-[var(--muted-foreground)]">Mos kursni toping, detail ichidan ariza yuboring yoki o'zingiz maktab sifatida qo'shiling.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/driving-schools/partner" className={buttonStyles({ className: "rounded-full bg-primary text-primary-foreground hover:bg-primary/90" })}>
                Hamkor bo'lish
              </Link>
              <Link
                href={user?.has_school_profile ? "/school/dashboard" : "/driving-schools/partner"}
                className={buttonStyles({ variant: "outline", className: "rounded-full border-border shadow-sm hover:bg-accent" })}
              >
                {user?.has_school_profile ? "School kabineti" : "Kabinet ochish"}
              </Link>
            </div>
          </CardContent>
        </Card>

        {error ? <ErrorState description={error} /> : null}

        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input className="pl-9" placeholder="Avtomaktab qidirish..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <Select value={city} onChange={(event) => setCity(event.target.value)} icon={<MapPin className="h-4 w-4" />}>
              <option value="">Barcha shaharlar</option>
              {(meta?.cities ?? []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Barcha kategoriyalar</option>
              {(meta?.categories ?? []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
            <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="rating">Reyting</option>
              <option value="price">Narx</option>
              <option value="name">Nom</option>
              <option value="newest">Yangi</option>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-3xl bg-[var(--muted)]" />
            <div className="h-64 animate-pulse rounded-3xl bg-[var(--muted)]" />
          </div>
        ) : schools && schools.items.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {schools.items.map((school) => (
              <Card key={school.id} className="card-hover-lift">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {school.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={school.logo_url}
                        alt={school.name}
                        className="h-20 w-20 shrink-0 rounded-2xl border border-[var(--border)] object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                        <Building2 className="h-10 w-10" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">{school.name}</h3>
                          <p className="mt-1 flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                            <MapPin className="h-3.5 w-3.5" />
                            {school.city}{school.region ? `, ${school.region}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 rounded-full border border-amber-300/35 bg-[color-mix(in_oklab,#f59e0b_12%,transparent)] px-3 py-1 text-sm font-semibold text-amber-700">
                          <Star className="h-4 w-4 fill-current" />
                          {school.rating_avg}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-[var(--muted-foreground)]">{school.short_description ?? "Qisqa tavsif mavjud emas."}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {school.categories.map((item) => (
                          <Badge key={item} variant="outline">{item}</Badge>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-col gap-4 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">{formatCurrency(school.starting_price_cents, school.currency ?? "UZS")}</p>
                          <p className="text-[var(--muted-foreground)]">{school.min_duration_weeks ? `${school.min_duration_weeks} hafta` : "Davomiylik ko'rsatilmagan"}</p>
                        </div>
                        <Button onClick={() => void openDetail(school.slug)}>Batafsil</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="Maktab topilmadi" description="Filterlarni o'zgartirib ko'ring." />
        )}

        <Modal
          open={Boolean(selectedDetail) || detailLoading}
          onClose={() => setSelectedDetail(null)}
          title={selectedDetail?.name ?? "Batafsil"}
          className="max-w-5xl"
        >
          {detailLoading || !selectedDetail ? (
            <div className="h-48 animate-pulse rounded-3xl bg-[var(--muted)]" />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {selectedDetail.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedDetail.logo_url}
                        alt={selectedDetail.name}
                        className="h-20 w-20 rounded-[1.5rem] border border-[var(--border)] object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[var(--primary)]/10 text-[var(--primary)]">
                        <Building2 className="h-10 w-10" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {selectedDetail.city}
                        {selectedDetail.region ? `, ${selectedDetail.region}` : ""}
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                        {selectedDetail.full_description ?? selectedDetail.short_description ?? "Batafsil tavsif mavjud emas."}
                      </p>
                    </div>
                  </div>
                  {selectedDetail.media_items.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {selectedDetail.media_items.slice(0, 3).map((media) => (
                        <div key={media.id} className="overflow-hidden rounded-[1.25rem] border border-[var(--border)] bg-[var(--muted)]/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={media.url} alt={media.caption ?? selectedDetail.name} className="h-32 w-full object-cover" />
                          <div className="p-3 text-xs text-[var(--muted-foreground)]">{media.caption ?? "Galereya rasmi"}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {selectedDetail.map_embed_url ? (
                  <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)]">
                    <iframe
                      src={selectedDetail.map_embed_url}
                      title={`${selectedDetail.name} xarita`}
                      className="h-full min-h-72 w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Aloqa</p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <Phone className="h-4 w-4" />
                    {selectedDetail.phone}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{selectedDetail.address ?? "Manzil ko'rsatilmagan"}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{selectedDetail.landmark ?? "Mo'ljal ko'rsatilmagan"}</p>
                </div>
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Ish vaqti</p>
                  <p className="mt-2 font-medium">{selectedDetail.work_hours ?? "Ko'rsatilmagan"}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Telegram: {selectedDetail.telegram ?? "yo'q"}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Litsenziya: {selectedDetail.license_info ?? "Ko'rsatilmagan"}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <p className="text-sm font-semibold">Bog'lanish uchun ariza</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    Qiziqqan kurs turini tanlab, maktabga to'g'ridan-to'g'ri so'rov yuboring.
                  </p>
                  <div className="mt-4">
                    <SchoolLeadForm slug={selectedDetail.slug} categories={selectedDetail.courses.map((course) => course.category_code)} />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold">Tariflar va kurslar</h4>
                <div className="mt-3 grid gap-3">
                  {selectedDetail.courses.map((course) => (
                    <div key={course.id} className="rounded-2xl border border-[var(--border)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{course.category_code}</p>
                          <p className="text-sm text-[var(--muted-foreground)]">{course.description ?? "Tavsif yo'q"}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold">{formatCurrency(course.price_cents, course.currency)}</p>
                          <p className="text-[var(--muted-foreground)]">{course.duration_weeks ?? "--"} hafta</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">Sharhlar</h4>
                {selectedDetail.reviews.length === 0 ? (
                  <EmptyState title="Sharh yo'q" description="Demo sharhlar hozircha mavjud emas." />
                ) : (
                  selectedDetail.reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="rounded-2xl border border-[var(--border)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{review.user_display_name ?? "Anonim foydalanuvchi"}</p>
                        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                          <Star className="h-4 w-4 fill-current" />
                          {review.rating}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{review.comment ?? "Izoh qoldirilmagan."}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
