"use client";

import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, GraduationCap, RefreshCcw, Users } from "lucide-react";

import { getAdminAnalyticsSummary } from "@/api/admin";
import { AdminStatCard, AdminSurface } from "@/features/admin/admin-ui";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Button, buttonStyles } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-[1.75rem] bg-[var(--muted)]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[1.75rem] bg-[var(--muted)]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-56 rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-56 rounded-[1.75rem] bg-[var(--muted)]" />
      </div>
    </div>
  );
}

export function AdminMarketplacePage() {
  const summary = useAsyncResource(getAdminAnalyticsSummary, [], true);

  if (summary.loading) {
    return <LoadingState />;
  }

  if (summary.error || !summary.data) {
    return (
      <ErrorState
        title="Marketplace markazi yuklanmadi"
        description="Arizalar va leadlar bo'yicha boshqaruv ma'lumotini olib bo'lmadi."
        error={summary.error}
        onRetry={() => void summary.reload()}
      />
    );
  }

  const data = summary.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace markazi"
        description="Ko'rib chiqilishi kerak bo'lgan arizalar, yangi leadlar va marketplace oqimlariga tezkor kirish."
        action={
          <Button onClick={() => void summary.reload()}>
            <RefreshCcw className="h-4 w-4" />
            Yangilash
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Pending arizalar"
          value={data.pending_applications}
          caption="Ko'rib chiqilishi kerak bo'lgan barcha marketplace arizalari"
          icon={ClipboardList}
          tone={data.pending_applications > 0 ? "warning" : "success"}
        />
        <AdminStatCard
          label="Jami arizalar"
          value={data.total_applications}
          caption="Maktab va instruktor arizalari yig'indisi"
          icon={Users}
          tone="neutral"
        />
        <AdminStatCard
          label="Yangi leadlar"
          value={data.new_leads}
          caption="So'nggi 7 kundagi marketplace leadlari"
          icon={Users}
          tone={data.new_leads > 0 ? "primary" : "neutral"}
        />
        <AdminStatCard
          label="Faol foydalanuvchilar"
          value={data.active_users}
          caption="Marketplace oqimiga ta'sir qiluvchi umumiy platforma faolligi"
          icon={Users}
          tone="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSurface
          title="Avtomaktablar oqimi"
          description="Partner applications, leadlar, reviewlar va maktab profillarini boshqarish."
          action={
            <Link href="/admin/driving-schools" className={buttonStyles({ variant: "outline", size: "sm" })}>
              Oqimni ochish
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="space-y-4 p-5">
            <div className="rounded-[1.25rem] border border-[var(--border)]/70 bg-[var(--card-bg-muted)] p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[var(--accent-green-soft)] p-3 text-[var(--accent-green)]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Maktab partner pipeline</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                    Linked/unlinked arizalar, lead statuslari va review moderation shu bo&apos;limda.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/driving-schools" className={buttonStyles({ variant: "default" })}>
                Avtomaktablar sahifasi
              </Link>
            </div>
          </div>
        </AdminSurface>

        <AdminSurface
          title="Instruktorlar oqimi"
          description="Instructor applications, complaintlar, leadlar va profil boshqaruvi."
          action={
            <Link href="/admin/driving-instructors" className={buttonStyles({ variant: "outline", size: "sm" })}>
              Oqimni ochish
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="space-y-4 p-5">
            <div className="rounded-[1.25rem] border border-[var(--border)]/70 bg-[var(--card-bg-muted)] p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[var(--accent-yellow-soft)] p-3 text-[var(--accent-yellow)]">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Instruktor moderation</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                    Arizalar, shikoyatlar va leadlar bo&apos;yicha operatsion qarorlar shu bo&apos;limda qilinadi.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/driving-instructors" className={buttonStyles({ variant: "default" })}>
                Instruktorlar sahifasi
              </Link>
            </div>
          </div>
        </AdminSurface>
      </div>
    </div>
  );
}
