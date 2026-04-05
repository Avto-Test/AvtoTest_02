"use client";

import Link from "next/link";
import { BarChart3, Crown, RefreshCcw, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { getAdminAnalyticsSummary, getAdminFeatureInsights } from "@/api/admin";
import { AdminStatCard, AdminSurface } from "@/features/admin/admin-ui";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableCell, TableHead, TableRow } from "@/shared/ui/table";
import { ChartContainer } from "@/shared/ui/chart-container";

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

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0.00%";
  }
  return `${value.toFixed(2)}%`;
}

function formatPrice(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "Not set";
  }

  return `$${value.toFixed(2)}`;
}

function signalBadgeVariant(signal: string) {
  if (signal === "raise_price") {
    return "warning" as const;
  }
  if (signal === "reduce_price") {
    return "outline" as const;
  }
  return "success" as const;
}

export function AdminAnalyticsPage() {
  const summary = useAsyncResource(getAdminAnalyticsSummary, [], true);
  const insights = useAsyncResource(getAdminFeatureInsights, [], true);

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

  const monetization = summary.data.monetization;
  const featurePerformance = monetization?.feature_performance ?? [];
  const insightItems = insights.data ?? [];
  const funnelData = monetization
    ? [
        { name: "Views", value: monetization.funnel.views },
        { name: "Clicks", value: monetization.funnel.clicks },
        { name: "Purchases", value: monetization.funnel.purchases },
      ]
    : [];
  const conversionTrend = monetization?.daily_conversions ?? [];
  const topFeature = monetization?.top_performing_feature ?? "No leader yet";

  const stats = [
    {
      label: "Premium conversions",
      value: monetization?.total_premium_conversions ?? 0,
      icon: Crown,
      caption: `${summary.data.premium_users} active premium users`,
      tone: "warning" as const,
    },
    {
      label: "Overall CVR",
      value: formatPercent(monetization?.overall_conversion_rate),
      icon: TrendingUp,
      caption: "Purchases / premium lock views",
      tone: "success" as const,
    },
    {
      label: "Drop-off rate",
      value: formatPercent(monetization?.drop_off_rate),
      icon: TrendingDown,
      caption: "Users who see a lock but do not click upgrade",
      tone: "neutral" as const,
    },
    {
      label: "Top feature",
      value: topFeature,
      icon: BarChart3,
      caption: "Highest-performing premium capability",
      tone: "primary" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monetization analytics"
        description="Premium funnel, conversion signals, and feature pricing intelligence from backend-tracked events."
        action={
          <Button
            onClick={() =>
              void Promise.allSettled([summary.reload({ force: true }), insights.reload({ force: true })])
            }
          >
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
        <Badge variant="muted">Feature-level gating</Badge>
        <Badge variant="outline">Backend enforced</Badge>
        <Badge variant="success">Admin-managed pricing signals</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSurface title="Premium funnel" description="View to click to purchase flow for locked premium features.">
          <div className="p-5">
            {funnelData.length === 0 ? (
              <EmptyState title="Funnel yo'q" description="Premium interactions yig'ilgach ko'rinadi." />
            ) : (
              <ChartContainer className="h-72" minHeight={288}>
                {({ width, height }) => (
                  <BarChart width={width} height={height} data={funnelData} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="color-mix(in oklab,var(--border) 90%,transparent)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
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
            )}
          </div>
        </AdminSurface>

        <AdminSurface title="Daily conversions" description="Recent daily premium conversion trend with views and clicks in the same series.">
          <div className="p-5">
            {conversionTrend.length === 0 ? (
              <EmptyState title="Trend yo'q" description="Kunlik conversion signali hali yig'ilmagan." />
            ) : (
              <ChartContainer className="h-72" minHeight={288}>
                {({ width, height }) => (
                  <LineChart width={width} height={height} data={conversionTrend} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="color-mix(in oklab,var(--border) 90%,transparent)" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                    <Line type="monotone" dataKey="views" stroke="var(--accent-yellow)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="clicks" stroke="var(--accent-blue)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="purchases" stroke="var(--accent-green)" strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ChartContainer>
            )}
          </div>
        </AdminSurface>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <AdminSurface title="Feature performance" description="Usage, lock pressure, upgrade clicks, and pricing signals per premium capability.">
          <div className="p-5">
            {featurePerformance.length === 0 ? (
              <EmptyState title="Feature signali yo'q" description="Premium feature analytics paydo bo'lishi uchun foydalanuvchi interaksiyalari kerak." />
            ) : (
              <div className="overflow-hidden rounded-[1.35rem] border border-[var(--border)]/70">
                <Table>
                  <thead className="bg-[var(--muted)]/35">
                    <tr>
                      <TableHead>Feature</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>7d clicks</TableHead>
                      <TableHead>CVR</TableHead>
                      <TableHead>Signal</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {featurePerformance.map((item) => (
                      <TableRow key={item.feature_key}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.feature_name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{item.feature_key}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.usage_count}</TableCell>
                        <TableCell>{item.lock_views}</TableCell>
                        <TableCell>{item.upgrade_clicks}</TableCell>
                        <TableCell>{item.last_7_days_clicks}</TableCell>
                        <TableCell>{formatPercent(item.conversion_rate)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={signalBadgeVariant(item.pricing_insight.signal)}>{item.pricing_insight.signal}</Badge>
                            <p className="text-xs text-[var(--muted-foreground)]">{item.pricing_insight.reason}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </AdminSurface>

        <AdminSurface title="Platform context" description="Keep monetization alongside core platform growth and content quality.">
          <div className="space-y-4 p-5">
            <div className="rounded-[1.35rem] border border-[var(--border)]/70 bg-[var(--muted)]/30 p-4">
              <p className="text-sm font-semibold">Users</p>
              <p className="mt-2 text-3xl font-semibold">{summary.data.total_users}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{summary.data.active_users} active users</p>
            </div>
            <div className="rounded-[1.35rem] border border-[var(--border)]/70 bg-[var(--muted)]/30 p-4">
              <p className="text-sm font-semibold">Question bank</p>
              <p className="mt-2 text-3xl font-semibold">{summary.data.total_questions}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Avg accuracy: {typeof summary.data.average_accuracy === "number" ? `${summary.data.average_accuracy.toFixed(1)}%` : "No data"}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-[var(--border)]/70 bg-[var(--muted)]/30 p-4">
              <p className="text-sm font-semibold">Marketplace inflow</p>
              <p className="mt-2 text-3xl font-semibold">{summary.data.total_applications}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {summary.data.pending_applications} pending, {summary.data.new_leads} recent leads
              </p>
            </div>
          </div>
        </AdminSurface>
      </div>

      <AdminSurface title="Smart insights" description="Manual pricing recommendations only. Admin decisions remain the source of truth.">
        <div className="p-5">
          {insights.error ? (
            <EmptyState title="Insights yuklanmadi" description="Narx tavsiyalarini olishda xatolik yuz berdi." />
          ) : insightItems.length === 0 ? (
            <EmptyState title="Insights yo'q" description="Feature-level monetization data yig'ilgach tavsiyalar ko'rinadi." />
          ) : (
            <div className="overflow-hidden rounded-[1.35rem] border border-[var(--border)]/70">
              <Table>
                <thead className="bg-[var(--muted)]/35">
                  <tr>
                    <TableHead>Feature</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Suggested</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {insightItems.map((item) => (
                    <TableRow key={item.feature}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.feature_name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{item.feature}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(item.current_price)}</TableCell>
                      <TableCell>
                        {formatPrice(item.suggested_price_range.min)} - {formatPrice(item.suggested_price_range.max)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{item.message}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{item.recommendation}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href="/admin/features">Update price</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </AdminSurface>
    </div>
  );
}
