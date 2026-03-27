"use client";

import { BookOpen, ClipboardList, Crown, RefreshCcw, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { getAdminAnalyticsSummary } from "@/api/admin";
import { AdminStatCard, AdminSurface } from "@/features/admin/admin-ui";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ChartContainer } from "@/shared/ui/chart-container";
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
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-[1.75rem] bg-[var(--muted)]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[28rem] rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-[28rem] rounded-[1.75rem] bg-[var(--muted)]" />
      </div>
    </div>
  );
}

export function AdminAnalyticsPage() {
  const summary = useAsyncResource(getAdminAnalyticsSummary, [], true);

  if (summary.loading) {
    return <LoadingState />;
  }

  if (summary.error || !summary.data) {
    return (
      <ErrorState
        title="Admin analytics yuklanmadi"
        description="Analitika ma'lumotini olib bo'lmadi."
        error={summary.error}
        onRetry={() => void summary.reload()}
      />
    );
  }

  const stats = [
    {
      label: "Jami foydalanuvchi",
      value: summary.data.total_users,
      icon: Users,
      caption: `${summary.data.active_users} faol foydalanuvchi`,
      tone: "neutral" as const,
    },
    {
      label: "Pullik foydalanuvchi",
      value: summary.data.premium_users,
      icon: Crown,
      caption: "Faol pullik subscriptionga ega foydalanuvchilar",
      tone: "warning" as const,
    },
    {
      label: "Savollar",
      value: summary.data.total_questions,
      icon: BookOpen,
      caption: "Question bank bo'yicha umumiy qamrov",
      tone: "primary" as const,
    },
    {
      label: "Arizalar",
      value: summary.data.total_applications,
      icon: ClipboardList,
      caption: `${summary.data.pending_applications} pending, ${summary.data.new_leads} yangi lead`,
      tone: "success" as const,
    },
  ];

  const userHealth = [
    { label: "Faol", value: summary.data.active_users },
    { label: "Pullik", value: summary.data.premium_users },
    { label: "Faol emas", value: Math.max(summary.data.total_users - summary.data.active_users, 0) },
  ];

  const platformVolume = [
    { label: "Users", value: summary.data.total_users },
    { label: "Questions", value: summary.data.total_questions },
    { label: "Applications", value: summary.data.total_applications },
    { label: "Pending", value: summary.data.pending_applications },
    { label: "New leads", value: summary.data.new_leads },
  ];

  const categoryPerformance = (summary.data.category_performance ?? []).map((item) => ({
    name: item.category,
    accuracy: item.accuracy,
    attempts: item.attempts,
    questionCount: item.question_count,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analitika"
        description="Question bank, kategoriya natijalari va admin oqimlari bo'yicha aniq backend snapshot."
        action={
          <Button onClick={() => void summary.reload()}>
            <RefreshCcw className="h-4 w-4" />
            Yangilash
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <AdminStatCard
            key={item.label}
            label={item.label}
            value={item.value}
            caption={item.caption}
            icon={item.icon}
            tone={item.tone}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="muted">Hozirgi holat</Badge>
        <Badge variant="outline">Test terminlari olib tashlangan</Badge>
        <Badge variant="success">Backend aggregations only</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSurface title="Foydalanuvchi holati" description="Faol, pullik va faol bo'lmagan foydalanuvchilar kesimi.">
          <div className="p-5">
            <ChartContainer className="h-72" minHeight={288}>
              {({ width, height }) => (
                <BarChart width={width} height={height} data={userHealth} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="color-mix(in oklab,var(--border) 90%,transparent)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "color-mix(in oklab,var(--muted) 85%,transparent)" }}
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                    }}
                  />
                  <Bar dataKey="value" radius={[12, 12, 4, 4]} fill="var(--accent-green)" />
                </BarChart>
              )}
            </ChartContainer>
          </div>
        </AdminSurface>

        <AdminSurface title="Platforma hajmi" description="Murakkab chart emas, joriy biznes ko'rsatkichlari.">
          <div className="p-5">
            <ChartContainer className="h-72" minHeight={288}>
              {({ width, height }) => (
                <BarChart width={width} height={height} data={platformVolume} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="color-mix(in oklab,var(--border) 90%,transparent)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                    }}
                  />
                  <Bar dataKey="value" radius={[12, 12, 4, 4]} fill="var(--accent-yellow)" />
                </BarChart>
              )}
            </ChartContainer>
          </div>
        </AdminSurface>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <AdminSurface title="Kategoriya natijalari" description="Eng past aniqlikka ega kategoriyalar birinchi o'rinda.">
          <div className="p-5">
            {categoryPerformance.length === 0 ? (
              <EmptyState title="Kategoriya signali yo'q" description="Category performance paydo bo'lishi uchun ko'proq javoblar kerak." />
            ) : (
              <ChartContainer className="h-80" minHeight={320}>
                {({ width, height }) => (
                  <BarChart width={width} height={height} data={categoryPerformance} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="color-mix(in oklab,var(--border) 90%,transparent)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={72} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                    <Bar dataKey="accuracy" radius={[12, 12, 4, 4]} fill="var(--accent-red)" />
                  </BarChart>
                )}
              </ChartContainer>
            )}
          </div>
        </AdminSurface>

        <AdminSurface title="Kategoriya jadvali" description="Aniqlik, urinishlar va savollar qamrovi bir joyda.">
          <div className="p-5">
            {categoryPerformance.length === 0 ? (
              <EmptyState title="Kategoriya signali yo'q" description="Hozircha jadval uchun yetarli ma'lumot topilmadi." />
            ) : (
              <div className="overflow-hidden rounded-[1.35rem] border border-[var(--border)]/70">
                <Table>
                  <thead className="bg-[var(--muted)]/35">
                    <tr>
                      <TableHead>Kategoriya</TableHead>
                      <TableHead>Aniqlik</TableHead>
                      <TableHead>Urinishlar</TableHead>
                      <TableHead>Savollar</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryPerformance.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{typeof item.accuracy === "number" ? `${item.accuracy.toFixed(1)}%` : "Ma'lumot yo'q"}</TableCell>
                        <TableCell>{item.attempts}</TableCell>
                        <TableCell>{item.questionCount}</TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </AdminSurface>
      </div>
    </div>
  );
}
