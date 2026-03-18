"use client";

import Link from "next/link";
import { ArrowRight, Car, Eye, MessageSquare, PhoneCall, Star, UserRound } from "lucide-react";

import { getMyInstructorLeads, getMyInstructorReviews, getMyInstructorSummary } from "@/api/instructors";
import { AppShell } from "@/components/app-shell";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { InstructorMediaManager } from "@/features/instructors/instructor-media-manager";
import { InstructorProfileEditor } from "@/features/instructors/instructor-profile-editor";

export function InstructorDashboardPage() {
  const resource = useAsyncResource(async () => {
    const [summary, leads, reviews] = await Promise.all([
      getMyInstructorSummary(),
      getMyInstructorLeads(),
      getMyInstructorReviews(),
    ]);
    return { summary, leads, reviews };
  }, []);

  if (resource.loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-24" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (resource.error || !resource.data) {
    return (
      <AppShell>
        <ErrorState description="Instruktor kabinetini yuklab bo'lmadi." onRetry={() => void resource.reload()} />
      </AppShell>
    );
  }

  const { summary, leads, reviews } = resource.data;
  const instructor = summary.instructor;
  const application = summary.latest_application;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Instruktor kabineti"
          description="Profil, ko'rishlar, arizalar va sharhlarni bir joyda kuzating."
        />

        {!instructor ? (
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]">
                  <UserRound className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Instruktor profili hali yo'q</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Ariza yuboring yoki mavjud arizangiz holatini shu kabinetdan kuzating.
                  </p>
                </div>
              </div>

              {application ? (
                <div className="rounded-2xl border border-[var(--border)] p-5">
                  <p className="text-sm text-[var(--muted-foreground)]">Oxirgi ariza</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{application.full_name}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {application.city}
                        {application.region ? `, ${application.region}` : ""} - {application.car_model}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-sm font-medium">
                      {application.status}
                    </span>
                  </div>
                  {application.rejection_reason ? (
                    <p className="mt-3 text-sm text-[var(--destructive)]">{application.rejection_reason}</p>
                  ) : null}
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                    Yuborilgan: {formatDate(application.created_at)}
                  </p>
                </div>
              ) : (
                <EmptyState
                  title="Ariza topilmadi"
                  description="Katalogga qo'shilish uchun instruktor arizasini yuboring."
                />
              )}

              <Link href="/driving-instructors/apply" className={buttonStyles({ className: "w-full sm:w-auto" })}>
                Instruktor arizasiga o'tish
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Ko'rishlar</p>
                  <p className="mt-2 text-3xl font-bold">{instructor.view_count}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Public profile view count</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Leadlar</p>
                  <p className="mt-2 text-3xl font-bold">{instructor.lead_count}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Kelgan dars so'rovlari</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Sharhlar</p>
                  <p className="mt-2 text-3xl font-bold">{instructor.review_count}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Visible public reviews</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Reyting</p>
                  <p className="mt-2 text-3xl font-bold">{instructor.rating_avg.toFixed(1)}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{instructor.is_top_rated ? "Top rated profil" : "Verified profil"}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Profil snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)]">
                      <UserRound className="h-8 w-8 text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold">{instructor.full_name}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {instructor.city}
                        {instructor.region ? `, ${instructor.region}` : ""} - {instructor.phone}
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{instructor.short_bio}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--muted)] p-4">
                      <p className="text-sm text-[var(--muted-foreground)]">Narx</p>
                      <p className="mt-2 font-semibold">{formatCurrency(instructor.hourly_price_cents, instructor.currency)}</p>
                    </div>
                    <div className="rounded-2xl bg-[var(--muted)] p-4">
                      <p className="text-sm text-[var(--muted-foreground)]">Mashina</p>
                      <p className="mt-2 font-semibold">{instructor.car_model}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/instructors" className={buttonStyles({ variant: "outline" })}>
                      Public katalog
                    </Link>
                    <Link href="/driving-instructors/apply" className={buttonStyles({ variant: "outline" })}>
                      Apply sahifasi
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>7 kunlik trend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {summary.view_trend_7d.map((point) => (
                    <div key={point.date} className="rounded-2xl border border-[var(--border)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{formatDate(point.date)}</p>
                        <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
                          <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" />{point.views}</span>
                          <span className="inline-flex items-center gap-1"><PhoneCall className="h-4 w-4" />{point.leads}</span>
                          <span className="inline-flex items-center gap-1"><MessageSquare className="h-4 w-4" />{point.reviews}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <InstructorProfileEditor instructor={instructor} onSaved={() => void resource.reload()} />
              <InstructorMediaManager instructor={instructor} onSaved={() => void resource.reload()} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Yangi leadlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leads.length === 0 ? (
                    <EmptyState title="Lead yo'q" description="Public katalogdan kelgan dars so'rovlari shu yerda ko'rinadi." />
                  ) : (
                    leads.slice(0, 6).map((lead) => (
                      <div key={lead.id} className="rounded-2xl border border-[var(--border)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{lead.full_name}</p>
                            <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                              <PhoneCall className="h-4 w-4" />
                              {lead.phone}
                            </p>
                            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{lead.comment ?? "Izoh qoldirilmagan."}</p>
                          </div>
                          <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-medium">{lead.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sharhlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reviews.length === 0 ? (
                    <EmptyState title="Sharh yo'q" description="Yangi baholar shu yerda ko'rinadi." />
                  ) : (
                    reviews.slice(0, 6).map((review) => (
                      <div key={review.id} className="rounded-2xl border border-[var(--border)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 fill-current text-amber-500" />
                            <span className="font-medium">{review.rating}/5</span>
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)]">{formatDate(review.created_at)}</span>
                        </div>
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{review.comment ?? "Izoh qoldirilmagan."}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="grid gap-4 p-6 md:grid-cols-3">
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <Car className="h-5 w-5 text-[var(--primary)]" />
                  <p className="mt-4 font-semibold">Transport tipi</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{instructor.transmission} - {instructor.car_model}</p>
                </div>
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <Eye className="h-5 w-5 text-[var(--primary)]" />
                  <p className="mt-4 font-semibold">Ko'rishlar</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{summary.view_trend_7d.reduce((sum, point) => sum + point.views, 0)} ta oxirgi 7 kunlik ko'rish</p>
                </div>
                <div className="rounded-2xl bg-[var(--muted)] p-4">
                  <MessageSquare className="h-5 w-5 text-[var(--primary)]" />
                  <p className="mt-4 font-semibold">Kabinet oqimi</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Profil, arizalar va sharhlar shu kabinetda yangilanib turadi.</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
