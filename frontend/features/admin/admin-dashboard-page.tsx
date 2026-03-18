"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  FileText,
  Inbox,
  Shield,
  UserRound,
  Users,
} from "lucide-react";

import { getAdminDashboardData } from "@/api/admin";
import { formatAdminStatus, sortByCreatedAt, statusVariant } from "@/features/admin/utils";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useUser } from "@/hooks/use-user";
import { flatAdminNavigation } from "@/lib/admin-navigation";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableCell, TableHead, TableRow } from "@/shared/ui/table";

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-[1.75rem] bg-[var(--muted)]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32 rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-32 rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-32 rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-32 rounded-[1.75rem] bg-[var(--muted)]" />
      </div>
      <Skeleton className="h-[28rem] rounded-[1.75rem] bg-[var(--muted)]" />
    </div>
  );
}

export function AdminDashboardPage() {
  const { user, authenticated } = useUser();
  const isAdmin = authenticated && user?.is_admin === true;
  const dashboard = useAsyncResource(getAdminDashboardData, [isAdmin], isAdmin);

  if (dashboard.loading) {
    return <LoadingState />;
  }

  if (dashboard.error || !dashboard.data) {
    return (
      <ErrorState
        title="Admin dashboard yuklanmadi"
        description="Admin overview ma'lumotlarini yig'ib bo'lmadi."
        error={dashboard.error}
        onRetry={() => void dashboard.reload()}
      />
    );
  }

  const data = dashboard.data;
  const latestUsers = sortByCreatedAt(data.users).slice(0, 6);
  const recentLeads = sortByCreatedAt([
    ...data.schoolLeads.map((lead) => ({
      id: `school-${lead.id}`,
      title: lead.school_name ?? "Avtomaktab leadi",
      contact: lead.full_name,
      phone: lead.phone,
      status: lead.status,
      created_at: lead.created_at,
      source: "School",
    })),
    ...data.instructorLeads.map((lead) => ({
      id: `instructor-${lead.id}`,
      title: lead.instructor_name ?? "Instruktor leadi",
      contact: lead.full_name,
      phone: lead.phone,
      status: lead.status,
      created_at: lead.created_at,
      source: "Instructor",
    })),
  ]).slice(0, 6);
  const recentApplications = sortByCreatedAt([
    ...data.schoolApplications.map((application) => ({
      id: `school-${application.id}`,
      title: application.school_name,
      subtitle: application.responsible_person,
      status: application.status,
      created_at: application.created_at,
      source: "School partner",
    })),
    ...data.instructorApplications.map((application) => ({
      id: `instructor-${application.id}`,
      title: application.full_name,
      subtitle: application.city,
      status: application.status,
      created_at: application.created_at,
      source: "Instructor apply",
    })),
  ]).slice(0, 6);

  const stats = [
    {
      label: "Foydalanuvchilar",
      value: data.analytics?.total_users ?? data.users.length,
      tone: "bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-[var(--primary)]",
      icon: Users,
      caption: `${data.analytics?.premium_users ?? data.users.filter((entry) => entry.is_premium).length} premium`,
    },
    {
      label: "Testlar / savollar",
      value: `${data.analytics?.total_tests ?? data.tests.length} / ${data.questions.length}`,
      tone: "bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]",
      icon: BookOpen,
      caption: `${data.analytics?.total_attempts ?? 0} urinish`,
    },
    {
      label: "Marketplace",
      value: `${data.schools.length} maktab`,
      tone: "bg-[color-mix(in_oklab,var(--secondary)_18%,transparent)] text-[var(--secondary-foreground)]",
      icon: Building2,
      caption: `${data.instructors.length} instruktor`,
    },
    {
      label: "Navbat",
      value: recentApplications.length + recentLeads.length,
      tone: "bg-[color-mix(in_oklab,#f59e0b_14%,transparent)] text-amber-600",
      icon: Inbox,
      caption: `${recentApplications.length} ariza, ${recentLeads.length} lead`,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description="Asosiy ko'rsatkichlar va navbatdagi ishlar bir joyda."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/users" className={buttonStyles()}>
              Foydalanuvchilar
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/admin/content" className={buttonStyles({ variant: "outline" })}>
              Kontent banki
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold">{item.value}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.caption}</p>
                </div>
                <div className={`rounded-2xl p-3 ${item.tone}`}>
                  <item.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Boshqaruv bo'limlari</CardTitle>
          <CardDescription>Kerakli bo'limga bir bosishda o'ting</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {flatAdminNavigation.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-2xl border border-[var(--border)] p-4 transition hover:border-[var(--primary)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] p-3 text-[var(--primary)]">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>So'nggi foydalanuvchilar</CardTitle>
            <CardDescription>Rol va subscription holati bilan birga</CardDescription>
          </CardHeader>
          <CardContent>
            {latestUsers.length === 0 ? (
              <EmptyState title="Foydalanuvchilar topilmadi" description="Foydalanuvchilar ro'yxati hozircha bo'sh." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <TableHead>Foydalanuvchi</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Holat</TableHead>
                      <TableHead>Yaratilgan</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {latestUsers.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.full_name || entry.email}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{entry.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {entry.is_admin ? <Badge variant="success">Admin</Badge> : <Badge variant="outline">User</Badge>}
                            {entry.is_premium ? <Badge variant="warning">Premium</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={entry.is_active ? "success" : "outline"}>
                              {entry.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant={entry.is_verified ? "success" : "warning"}>
                              {entry.is_verified ? "Verified" : "Pending"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(entry.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Arizalar oqimi</CardTitle>
              <CardDescription>School partner va instructor apply so'rovlari</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentApplications.length === 0 ? (
                <EmptyState title="Arizalar yo'q" description="Hozircha tekshiriladigan yangi ariza topilmadi." />
              ) : (
                recentApplications.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.subtitle}</p>
                      </div>
                      <Badge variant={statusVariant(item.status)}>{formatAdminStatus(item.status)}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
                      <span>{item.source}</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tezkor ko'rinish</CardTitle>
              <CardDescription>Asosiy boshqaruv holati</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] p-3 text-[var(--primary)]">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Admin shell aktiv</p>
                    <p className="text-sm text-[var(--muted-foreground)]">Chap sidebar endi yagona admin menyusi bo'lib ishlaydi</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] p-3 text-[var(--accent)]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{data.questions.length} savol bankda</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{data.tests.length} test boshqaruvda</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[color-mix(in_oklab,var(--secondary)_18%,transparent)] p-3 text-[var(--secondary-foreground)]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{data.schools.length} avtomaktab</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{data.schoolApplications.length} partner ariza</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[color-mix(in_oklab,#f59e0b_14%,transparent)] p-3 text-amber-600">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{data.instructors.length} instruktor</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{data.instructorApplications.length} apply so'rovi</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>So'nggi leadlar</CardTitle>
          <CardDescription>Public katalogdan tushgan arizalar oqimi</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <EmptyState title="Leadlar topilmadi" description="Katalogdan yuborilgan arizalar shu yerda ko'rinadi." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{lead.contact}</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{lead.title}</p>
                    </div>
                    <Badge variant={statusVariant(lead.status)}>{formatAdminStatus(lead.status)}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-[var(--muted-foreground)]">
                    <p>{lead.phone}</p>
                    <p>{lead.source}</p>
                    <p>{formatDate(lead.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
