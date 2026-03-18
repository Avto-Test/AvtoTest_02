"use client";

import Link from "next/link";
import { Car, MapPin, Phone, Search, ShieldCheck, Star, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { getInstructorDetail, getInstructorMeta, getInstructors } from "@/api/instructors";
import { AppShell } from "@/components/app-shell";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonStyles } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { InstructorLeadForm } from "@/features/instructors/instructor-lead-form";
import type { InstructorCatalogResponse, InstructorDetail, InstructorMeta } from "@/types/instructor";

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function transmissionLabel(value: string) {
  if (value === "manual") return "Mexanika";
  if (value === "automatic") return "Avtomat";
  if (value === "both") return "Ikkalasi";
  return value;
}

export function InstructorsPage() {
  const { user } = useUser();
  const [meta, setMeta] = useState<InstructorMeta | null>(null);
  const [instructors, setInstructors] = useState<InstructorCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [transmission, setTransmission] = useState("");
  const [gender, setGender] = useState("");
  const [sortBy, setSortBy] = useState<"rating" | "price" | "experience" | "newest" | "activity">("rating");
  const [selectedDetail, setSelectedDetail] = useState<InstructorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [nextMeta, nextInstructors] = await Promise.all([
          getInstructorMeta(),
          getInstructors({
            q: query || undefined,
            city: city || undefined,
            transmission: transmission || undefined,
            gender: gender || undefined,
            sort_by: sortBy,
          }),
        ]);

        if (active) {
          setMeta(nextMeta);
          setInstructors(nextInstructors);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Instruktorlar ma'lumoti yuklanmadi.");
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
  }, [city, gender, query, sortBy, transmission]);

  const openDetail = async (slug: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      setSelectedDetail(await getInstructorDetail(slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Instruktor tafsiloti yuklanmadi.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Instruktorlar"
          description="Search, filter va profil kartalari orqali mos instruktorni tezroq tanlang."
        />

        <Card className="card-hover-lift">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium">Dars uchun ariza yoki owner oqimi</p>
              <p className="text-sm text-[var(--muted-foreground)]">Katalogdan instruktor toping, detail ichidan so'rov yuboring yoki o'zingiz instruktor sifatida qo'shiling.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/driving-instructors/apply" className={buttonStyles({ className: "rounded-full bg-primary text-primary-foreground hover:bg-primary/90" })}>
                Instruktor bo'lish
              </Link>
              <Link
                href={user?.has_instructor_profile ? "/instructor/dashboard" : "/driving-instructors/apply"}
                className={buttonStyles({ variant: "outline", className: "rounded-full border-border shadow-sm hover:bg-accent" })}
              >
                {user?.has_instructor_profile ? "Instruktor kabineti" : "Kabinet ochish"}
              </Link>
            </div>
          </CardContent>
        </Card>

        {error ? <ErrorState description={error} /> : null}

        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input className="pl-9" placeholder="Instruktor qidirish..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <Select value={city} onChange={(event) => setCity(event.target.value)} icon={<MapPin className="h-4 w-4" />}>
              <option value="">Barcha shaharlar</option>
              {(meta?.cities ?? []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
            <Select value={transmission} onChange={(event) => setTransmission(event.target.value)} icon={<Car className="h-4 w-4" />}>
              <option value="">Barcha uzatmalar</option>
              {(meta?.transmissions ?? []).map((item) => (
                <option key={item} value={item}>{transmissionLabel(item)}</option>
              ))}
            </Select>
            <Select value={gender} onChange={(event) => setGender(event.target.value)} icon={<UserRound className="h-4 w-4" />}>
              <option value="">Barcha jinslar</option>
              {(meta?.genders ?? []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
            <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="rating">Reyting</option>
              <option value="price">Narx</option>
              <option value="experience">Tajriba</option>
              <option value="newest">Yangi</option>
              <option value="activity">Faollik</option>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <div className="h-72 animate-pulse rounded-3xl bg-muted" />
            <div className="h-72 animate-pulse rounded-3xl bg-muted" />
            <div className="h-72 animate-pulse rounded-3xl bg-muted" />
          </div>
        ) : instructors && instructors.items.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {instructors.items.map((instructor) => (
              <Card key={instructor.id} className="card-hover-lift">
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-start gap-4">
                    <Avatar
                      src={instructor.profile_image_url}
                      fallback={initialsFromName(instructor.full_name)}
                      alt={instructor.full_name}
                      className="h-16 w-16 rounded-2xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold">{instructor.full_name}</h3>
                        {instructor.is_top_rated ? <Badge>Top rated</Badge> : null}
                        {instructor.is_new ? <Badge variant="outline">Yangi</Badge> : null}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                        <MapPin className="h-3.5 w-3.5" />
                        {instructor.city}{instructor.region ? `, ${instructor.region}` : ""}
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-current text-amber-500" />
                        <span className="font-medium">{instructor.rating_avg}</span>
                        <span className="text-[var(--muted-foreground)]">({instructor.review_count} sharh)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--muted)] p-4">
                      <p className="text-sm text-[var(--muted-foreground)]">Tajriba</p>
                      <p className="mt-2 font-semibold">{instructor.years_experience} yil</p>
                    </div>
                    <div className="rounded-2xl bg-[var(--muted)] p-4">
                      <p className="text-sm text-[var(--muted-foreground)]">Transport</p>
                      <p className="mt-2 font-semibold">{transmissionLabel(instructor.transmission)}</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{instructor.car_model}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--border)] pt-5">
                    <div>
                      <p className="text-lg font-bold">{formatCurrency(instructor.hourly_price_cents, instructor.currency)}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Soatlik narx</p>
                    </div>
                    <Button onClick={() => void openDetail(instructor.slug)}>Batafsil</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="Instruktor topilmadi" description="Filtrlarni o'zgartirib qayta sinab ko'ring." />
        )}

        <Modal
          open={Boolean(selectedDetail) || detailLoading}
          onClose={() => setSelectedDetail(null)}
          title={selectedDetail?.full_name ?? "Instruktor tafsiloti"}
          className="max-w-5xl"
        >
          {detailLoading || !selectedDetail ? (
            <div className="h-56 animate-pulse rounded-3xl bg-[var(--muted)]" />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Avatar
                      src={selectedDetail.profile_image_url}
                      fallback={initialsFromName(selectedDetail.full_name)}
                      alt={selectedDetail.full_name}
                      className="h-20 w-20 rounded-[1.5rem]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-2xl font-semibold">{selectedDetail.full_name}</h3>
                        {selectedDetail.is_top_rated ? <Badge>Top rated</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{selectedDetail.short_bio}</p>
                    </div>
                  </div>
                  {selectedDetail.media_items.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {selectedDetail.media_items.slice(0, 3).map((media) => (
                        <div key={media.id} className="overflow-hidden rounded-[1.25rem] border border-[var(--border)] bg-[var(--muted)]/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={media.url} alt={media.caption ?? selectedDetail.full_name} className="h-32 w-full object-cover" />
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
                      title={`${selectedDetail.full_name} xarita`}
                      className="h-full min-h-72 w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Aloqa</p>
                  <p className="mt-2 flex items-center gap-2 font-medium">
                    <Phone className="h-4 w-4" />
                    {selectedDetail.phone}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Telegram: {selectedDetail.telegram ?? "Ko'rsatilmagan"}</p>
                </div>
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Tajriba va transport</p>
                  <p className="mt-2 font-medium">{selectedDetail.years_experience} yil tajriba</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {transmissionLabel(selectedDetail.transmission)} - {selectedDetail.car_model}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Maktab affiliatsiyasi</p>
                  <p className="mt-2 font-medium">Demo katalog profili</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Aloqa va joylashuv ma'lumoti profil ichida ko'rsatiladi.</p>
                </div>
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Narx va minimal dars</p>
                  <p className="mt-2 font-medium">{formatCurrency(selectedDetail.hourly_price_cents, selectedDetail.currency)}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{selectedDetail.min_lesson_minutes} daqiqadan boshlab</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] p-4">
                <p className="text-sm font-semibold">Dars uchun ariza</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Telefon va qulay uzatma turini qoldiring, instruktor siz bilan bog'lanadi.
                </p>
                <div className="mt-4">
                  <InstructorLeadForm slug={selectedDetail.slug} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Teaching style</p>
                  <p className="mt-2">{selectedDetail.teaching_style ?? "Ko'rsatilmagan"}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">Service area</p>
                  <p className="mt-2">{selectedDetail.service_areas ?? `${selectedDetail.city}${selectedDetail.region ? `, ${selectedDetail.region}` : ""}`}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--muted-foreground)]">Mashina va tarif tafsiloti</p>
                <p className="mt-2 font-medium">
                  {selectedDetail.car_model}
                  {selectedDetail.car_year ? `, ${selectedDetail.car_year}` : ""}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{selectedDetail.car_features ?? "Qo'shimcha jihozlar ko'rsatilmagan."}</p>
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                  {formatCurrency(selectedDetail.hourly_price_cents, selectedDetail.currency)} / dars
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--muted-foreground)]">Special services</p>
                <p className="mt-2">{selectedDetail.special_services ?? "Qo'shimcha xizmat ko'rsatilmagan."}</p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Sharhlar</p>
                  <Badge variant="outline">{selectedDetail.review_count} ta</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedDetail.reviews.slice(0, 3).length === 0 ? (
                    <EmptyState title="Sharh mavjud emas" description="Instruktor uchun sharhlar hali shakllanmagan." />
                  ) : (
                    selectedDetail.reviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="rounded-2xl bg-[var(--muted)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{review.user_display_name ?? "Anonim foydalanuvchi"}</p>
                          <div className="flex items-center gap-1 text-sm text-amber-600">
                            <Star className="h-4 w-4 fill-current" />
                            {review.rating}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{review.comment ?? "Izoh qoldirilmagan."}</p>
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">{formatDate(review.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{selectedDetail.disclaimer}</p>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppShell>
  );
}
