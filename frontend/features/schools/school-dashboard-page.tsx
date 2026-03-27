"use client";

import Link from "next/link";
import { ArrowRight, Building2, MessageSquare, PhoneCall, Star, Users } from "lucide-react";

import { getMySchoolLeads, getMySchoolReviews, getMySchoolSummary, getSchoolDashboard } from "@/api/schools";
import { AppShell } from "@/components/app-shell";
import { SchoolMediaManager } from "@/features/schools/school-media-manager";
import { SchoolProfileEditor } from "@/features/schools/school-profile-editor";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatStatusLabel } from "@/types/statuses";

export function SchoolDashboardPage() {
  const resource = useAsyncResource(async () => {
    const [summary, leads, reviews, stats] = await Promise.all([
      getMySchoolSummary(),
      getMySchoolLeads(),
      getMySchoolReviews(),
      getSchoolDashboard().catch(() => null),
    ]);
    return { summary, leads, reviews, stats };
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
        <ErrorState description="School kabinetini yuklab bo'lmadi." onRetry={() => void resource.reload()} />
      </AppShell>
    );
  }

  const { summary, leads, reviews, stats } = resource.data;
  const school = summary.school;
  const latestApplication = summary.latest_application;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="School kabineti"
          description="Avtomaktab profilingiz, leadlar va sharhlar boshqaruvi."
        />

        {!school ? (
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]">
                  <Building2 className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">Maktab profili hali tayyor emas</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Hamkorlik arizasini yuboring yoki mavjud ariza holatini shu yerda kuzating.
                  </p>
                </div>
              </div>

              {latestApplication ? (
                <div className="rounded-2xl border border-[var(--border)] p-5">
                  <p className="text-sm text-[var(--muted-foreground)]">Oxirgi ariza</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{latestApplication.school_name}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {latestApplication.city} - {latestApplication.responsible_person}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-sm font-medium">
                      {formatStatusLabel(latestApplication.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                    Yuborilgan: {formatDate(latestApplication.created_at)}
                  </p>
                </div>
              ) : (
                <EmptyState
                  title="Ariza topilmadi"
                  description="Hamkorlik arizasini yuborib, avtomaktab profilingizni ishga tushiring."
                />
              )}

              <Link href="/driving-schools/partner" className={buttonStyles({ className: "w-full sm:w-auto" })}>
                Hamkorlik arizasiga o&rsquo;tish
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Leadlar</p>
                  <p className="mt-2 text-3xl font-bold">{school.lead_count}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Katalogdan kelgan bog&rsquo;lanish so&rsquo;rovlari</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Sharhlar</p>
                  <p className="mt-2 text-3xl font-bold">{school.review_count}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Ko&rsquo;rinadigan foydalanuvchi baholari</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">Reyting</p>
                  <p className="mt-2 text-3xl font-bold">{school.rating_avg.toFixed(1)}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Current public profile rating</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-[var(--muted-foreground)]">RBAC stat</p>
                  <p className="mt-2 text-3xl font-bold">{stats?.member_count ?? "--"}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {stats ? `${stats.group_count} guruh - ${stats.active_role}` : "School RBAC dashboard yopiq"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Profil snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)]">
                      <Building2 className="h-8 w-8 text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold">{school.name}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {school.city}
                        {school.region ? `, ${school.region}` : ""} - {school.phone}
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{school.short_description ?? "Qisqa tavsif yo'q."}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--muted)] p-4">
                      <p className="text-sm text-[var(--muted-foreground)]">Referral code</p>
                      <p className="mt-2 font-semibold">{school.referral_code}</p>
                    </div>
                    <div className="rounded-2xl bg-[var(--muted)] p-4">
                      <p className="text-sm text-[var(--muted-foreground)]">Tariflar soni</p>
                      <p className="mt-2 font-semibold">{school.courses.length}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/schools" className={buttonStyles({ variant: "outline" })}>
                      Public katalog
                    </Link>
                    <Link href="/driving-schools/partner" className={buttonStyles({ variant: "outline" })}>
                      Hamkorlik sahifasi
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Oxirgi sharhlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reviews.length === 0 ? (
                    <EmptyState title="Sharh yo'q" description="Yangi sharhlar shu yerda ko'rinadi." />
                  ) : (
                    reviews.slice(0, 5).map((review) => (
                      <div key={review.id} className="rounded-2xl border border-[var(--border)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 fill-current text-amber-500" />
                            <span className="font-medium">{review.rating}/5</span>
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)]">{formatRelativeTime(review.created_at)}</span>
                        </div>
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{review.comment ?? "Izoh qoldirilmagan."}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <SchoolProfileEditor school={school} onSaved={() => void resource.reload()} />
              <SchoolMediaManager school={school} onSaved={() => void resource.reload()} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Yangi leadlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leads.length === 0 ? (
                    <EmptyState title="Lead yo'q" description="Katalogdan kelgan arizalar shu yerda paydo bo'ladi." />
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
                          <span className="rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-medium">{formatStatusLabel(lead.status)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kabinet ko&rsquo;rsatkichlari</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-[var(--muted)] p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[var(--primary)]" />
                      <p className="font-medium">Maktab a&rsquo;zolari</p>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {stats ? `${stats.member_count} a'zo - ${stats.group_count} guruh` : "School RBAC stats mavjud emas"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--muted)] p-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[var(--primary)]" />
                      <p className="font-medium">Ommaviy ko&rsquo;rinish</p>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      Profilingizga kelayotgan review va lead oqimi shu kabinetda jamlangan.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
