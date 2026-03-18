"use client";

import { Activity, BarChart3, Crown, Database, Sparkles } from "lucide-react";

import { getAdminAnalyticsSummary, getAdminTopTests } from "@/api/admin";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Badge } from "@/shared/ui/badge";
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

export function AdminAnalyticsPage() {
  const summary = useAsyncResource(getAdminAnalyticsSummary, [], true);
  const topTests = useAsyncResource(() => getAdminTopTests(12), [], true);

  if (summary.loading || topTests.loading) {
    return <LoadingState />;
  }

  if (summary.error || topTests.error || !summary.data || !topTests.data) {
    return (
      <ErrorState
        title="Admin analytics yuklanmadi"
        description="Analitika ma'lumotini olib bo'lmadi."
        error={summary.error ?? topTests.error}
        onRetry={() => {
          void summary.reload();
          void topTests.reload();
        }}
      />
    );
  }

  const stats = [
    { label: "Jami foydalanuvchi", value: summary.data.total_users, icon: Database, tone: "text-[var(--primary)]" },
    { label: "Premium user", value: summary.data.premium_users, icon: Crown, tone: "text-amber-500" },
    { label: "Testlar", value: summary.data.total_tests, icon: BarChart3, tone: "text-[var(--accent)]" },
    { label: "Urinishlar", value: summary.data.total_attempts, icon: Activity, tone: "text-sky-500" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analitika"
        description="Platforma statistikasi va eng faol testlar shu yerda ko'rinadi."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold">{item.value}</p>
                </div>
                <div className={`rounded-2xl bg-[var(--muted)] p-3 ${item.tone}`}>
                  <item.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Top testlar</CardTitle>
            <CardDescription>Attempt count va average score bo‘yicha yuqori testlar</CardDescription>
          </CardHeader>
          <CardContent>
            {topTests.data.length === 0 ? (
              <EmptyState title="Top testlar yo'q" description="Hozircha yetarli ma'lumot topilmadi." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <TableHead>Test</TableHead>
                      <TableHead>Urinishlar</TableHead>
                      <TableHead>Average score</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {topTests.data.map((item) => (
                      <TableRow key={item.test_id}>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>{item.attempts_count}</TableCell>
                        <TableCell>{item.average_score.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coverage eslatmasi</CardTitle>
            <CardDescription>Legacy paneldagi farqlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] p-3 text-[var(--accent)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Analitika tayyor</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Bu sahifa asosiy ko'rsatkichlar va top testlar bilan ishlaydi.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] p-4">
              <Badge variant="warning">Legacy mismatch</Badge>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                Sahifa asosiy analitika va test natijalariga e'tibor qaratadi.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
