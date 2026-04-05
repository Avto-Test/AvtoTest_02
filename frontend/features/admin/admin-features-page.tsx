"use client";

import Link from "next/link";
import { CalendarClock, Crown, RefreshCcw, Sparkles, ToggleLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getAdminFeatureAnalytics, getAdminFeatureInsights } from "@/api/admin";
import { getPlatformFeatures, updatePlatformFeature } from "@/api/features";
import { useFeatureAccess } from "@/components/providers/feature-access-provider";
import { AdminStatCard, AdminSurface, AdminTableShell, AdminToolbar } from "@/features/admin/admin-ui";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useUser } from "@/hooks/use-user";
import { hasFeatureAccess, isFeatureTemporarilyOpen } from "@/lib/feature-access";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableCell, TableHead, TableRow } from "@/shared/ui/table";
import type { AdminFeaturePerformanceItem, AdminMonetizationInsightItem } from "@/types/admin";
import type { PlatformFeature } from "@/types/feature";

type FeatureDraft = {
  is_premium: boolean;
  enabled_for_all_until: string;
  experiment_group: string;
  rollout_percentage: string;
  feature_usage_limit: string;
  current_price: string;
};

function buildDraft(feature: PlatformFeature): FeatureDraft {
  return {
    is_premium: feature.is_premium,
    enabled_for_all_until: toDateTimeLocalValue(feature.enabled_for_all_until),
    experiment_group: feature.experiment_group ?? "",
    rollout_percentage: String(feature.rollout_percentage ?? 0),
    feature_usage_limit:
      typeof feature.feature_usage_limit === "number" ? String(feature.feature_usage_limit) : "",
    current_price: typeof feature.current_price === "number" ? String(feature.current_price) : "",
  };
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatPrice(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return "Not set";
  }

  return `$${value.toFixed(2)}`;
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-[1.75rem] bg-[var(--muted)]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-28 rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-28 rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-28 rounded-[1.75rem] bg-[var(--muted)]" />
      </div>
      <Skeleton className="h-[30rem] rounded-[1.75rem] bg-[var(--muted)]" />
    </div>
  );
}

export function AdminFeaturesPage() {
  const resource = useAsyncResource(getPlatformFeatures, [], true);
  const analyticsResource = useAsyncResource(getAdminFeatureAnalytics, [], true);
  const insightsResource = useAsyncResource(getAdminFeatureInsights, [], true);
  const { reload: reloadFeatureAccess } = useFeatureAccess();
  const { user } = useUser();
  const [drafts, setDrafts] = useState<Record<string, FeatureDraft>>({});
  const [query, setQuery] = useState("");
  const [premiumFilter, setPremiumFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!resource.data) {
      return;
    }

    setDrafts(
      Object.fromEntries(resource.data.map((feature) => [feature.id, buildDraft(feature)])),
    );
  }, [resource.data]);

  const filteredFeatures = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const features = resource.data ?? [];

    return features
      .filter((feature) => {
        const matchesQuery =
          !normalizedQuery ||
          feature.key.toLowerCase().includes(normalizedQuery) ||
          feature.name.toLowerCase().includes(normalizedQuery);
        const matchesFilter =
          premiumFilter === "all" ||
          (premiumFilter === "premium" && feature.is_premium) ||
          (premiumFilter === "free" && !feature.is_premium) ||
          (premiumFilter === "promo" && isFeatureTemporarilyOpen(feature));
        return matchesQuery && matchesFilter;
      })
      .sort((left, right) => left.key.localeCompare(right.key));
  }, [premiumFilter, query, resource.data]);

  const featureInsightsByKey = useMemo(
    () => new Map<string, AdminFeaturePerformanceItem>((analyticsResource.data ?? []).map((item) => [item.feature_key, item])),
    [analyticsResource.data],
  );
  const monetizationInsightsByKey = useMemo(
    () => new Map<string, AdminMonetizationInsightItem>((insightsResource.data ?? []).map((item) => [item.feature, item])),
    [insightsResource.data],
  );

  const stats = useMemo(() => {
    const features = resource.data ?? [];
    return {
      total: features.length,
      premium: features.filter((feature) => feature.is_premium).length,
      free: features.filter((feature) => !feature.is_premium).length,
      promo: features.filter((feature) => isFeatureTemporarilyOpen(feature)).length,
    };
  }, [resource.data]);

  async function refreshAll() {
    const refreshedFeatures = await getPlatformFeatures({ force: true }).catch(() => null);
    if (refreshedFeatures) {
      resource.setData(refreshedFeatures);
    }

    await Promise.allSettled([
      analyticsResource.reload({ force: true }),
      insightsResource.reload({ force: true }),
      reloadFeatureAccess({ force: true }),
    ]);
  }

  async function saveFeature(feature: PlatformFeature) {
    const draft = drafts[feature.id] ?? buildDraft(feature);
    setBusyId(feature.id);
    setNotice(null);

    try {
      const updatedFeature = await updatePlatformFeature(feature.id, {
        is_premium: draft.is_premium,
        enabled_for_all_until: draft.enabled_for_all_until
          ? new Date(draft.enabled_for_all_until).toISOString()
          : null,
        experiment_group: draft.experiment_group.trim() || null,
        rollout_percentage: Number(draft.rollout_percentage || 0),
        feature_usage_limit: draft.feature_usage_limit ? Number(draft.feature_usage_limit) : null,
        current_price: draft.current_price.trim() ? Number(draft.current_price) : null,
      });

      resource.setData(
        (current) =>
          current?.map((entry) => (entry.id === updatedFeature.id ? updatedFeature : entry)) ?? [],
      );
      setDrafts((current) => ({
        ...current,
        [updatedFeature.id]: buildDraft(updatedFeature),
      }));
      await Promise.allSettled([
        reloadFeatureAccess({ force: true }),
        analyticsResource.reload({ force: true }),
        insightsResource.reload({ force: true }),
      ]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Feature saqlanmadi.");
    } finally {
      setBusyId(null);
    }
  }

  if (resource.loading) {
    return <LoadingState />;
  }

  if (resource.error || !resource.data) {
    return (
      <ErrorState
        title="Feature flags yuklanmadi"
        description="Premium feature katalogini olib bo'lmadi."
        error={resource.error}
        onRetry={() => void refreshAll()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature flags"
        description="Premium gating endi sahifa emas, capability darajasida boshqariladi."
        action={
          <Button onClick={() => void refreshAll()}>
            <RefreshCcw className="h-4 w-4" />
            Yangilash
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Jami feature" value={stats.total} caption="Platformadagi boshqariladigan capability lar" icon={ToggleLeft} />
        <AdminStatCard label="Premium feature" value={stats.premium} caption="Pullik access bilan himoyalanganlar" icon={Crown} tone="warning" />
        <AdminStatCard label="Free feature" value={stats.free} caption="Hamma foydalanuvchi uchun ochiq capability lar" icon={Sparkles} tone="success" />
        <AdminStatCard label="Promo unlock" value={stats.promo} caption="Vaqtinchalik free oynasi yoqilganlar" icon={CalendarClock} tone="primary" />
      </div>

      <AdminToolbar
        search={
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Feature key yoki nomi bo'yicha qidiring"
          />
        }
        filters={
          <Select value={premiumFilter} onChange={(event) => setPremiumFilter(event.target.value)} className="min-w-44">
            <option value="all">Barcha holatlar</option>
            <option value="premium">Faqat premium</option>
            <option value="free">Faqat free</option>
            <option value="promo">Promo unlock</option>
          </Select>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-[var(--accent-yellow-strong)] bg-[var(--accent-yellow-soft)] px-4 py-3 text-sm text-[var(--accent-yellow)]">
          {notice}
        </div>
      ) : null}

      <AdminSurface
        title="Feature catalog"
        description="Har bir feature uchun premium holati, vaqtinchalik free override va joriy access natijasi shu jadvalda ko'rinadi."
      >
        <div className="p-5">
          {filteredFeatures.length === 0 ? (
            <EmptyState title="Feature topilmadi" description="Qidiruv yoki filtr bo'yicha mos yozuv yo'q." />
          ) : (
            <AdminTableShell>
              <Table>
                <thead className="bg-[var(--muted)]/35">
                  <tr>
                    <TableHead>Feature</TableHead>
                    <TableHead>Access mode</TableHead>
                    <TableHead>Free for all until</TableHead>
                    <TableHead>Experiment</TableHead>
                    <TableHead>Trial</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Insights</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeatures.map((feature) => {
                    const insight = featureInsightsByKey.get(feature.key);
                    const monetizationInsight = monetizationInsightsByKey.get(feature.key);
                    const draft = drafts[feature.id] ?? buildDraft(feature);
                    const isDirty =
                      draft.is_premium !== feature.is_premium ||
                      draft.enabled_for_all_until !== toDateTimeLocalValue(feature.enabled_for_all_until) ||
                      draft.experiment_group !== (feature.experiment_group ?? "") ||
                      draft.rollout_percentage !== String(feature.rollout_percentage ?? 0) ||
                      draft.feature_usage_limit !==
                        (typeof feature.feature_usage_limit === "number" ? String(feature.feature_usage_limit) : "") ||
                      draft.current_price !== (typeof feature.current_price === "number" ? String(feature.current_price) : "");

                    return (
                      <TableRow key={feature.id} className="align-top">
                        <TableCell>
                          <div>
                            <p className="font-medium">{feature.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{feature.key}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={draft.is_premium ? "premium" : "free"}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [feature.id]: {
                                  ...draft,
                                  is_premium: event.target.value === "premium",
                                },
                              }))
                            }
                            className="min-w-36"
                          >
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="datetime-local"
                            value={draft.enabled_for_all_until}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [feature.id]: {
                                  ...draft,
                                  enabled_for_all_until: event.target.value,
                                },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Input
                              value={draft.experiment_group}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [feature.id]: {
                                    ...draft,
                                    experiment_group: event.target.value,
                                  },
                                }))
                              }
                              placeholder="experiment_group"
                            />
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={draft.rollout_percentage}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [feature.id]: {
                                    ...draft,
                                    rollout_percentage: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Rollout %"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={draft.feature_usage_limit}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [feature.id]: {
                                  ...draft,
                                  feature_usage_limit: event.target.value,
                                },
                              }))
                            }
                            placeholder="Unlimited"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={draft.current_price}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [feature.id]: {
                                    ...draft,
                                    current_price: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Current price"
                            />
                            <p className="text-xs text-[var(--muted-foreground)]">
                              Current: {formatPrice(feature.current_price)}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              Suggested:{" "}
                              {monetizationInsight
                                ? `${formatPrice(monetizationInsight.suggested_price_range.min)} - ${formatPrice(monetizationInsight.suggested_price_range.max)}`
                                : "No analysis yet"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p>Usage: {insight?.usage_count ?? 0}</p>
                            <p>CVR: {typeof insight?.conversion_rate === "number" ? `${insight.conversion_rate.toFixed(2)}%` : "0.00%"}</p>
                            <p>7d clicks: {insight?.last_7_days_clicks ?? 0}</p>
                            {monetizationInsight ? (
                              <>
                                <p className="text-xs text-[var(--muted-foreground)]">{monetizationInsight.message}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">{monetizationInsight.recommendation}</p>
                              </>
                            ) : null}
                            {insight ? (
                              <Badge variant={insight.pricing_insight.signal === "reduce_price" ? "outline" : insight.pricing_insight.signal === "raise_price" ? "warning" : "success"}>
                                {insight.pricing_insight.signal}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={feature.is_premium ? "warning" : "success"}>
                              {feature.is_premium ? "Premium" : "Free"}
                            </Badge>
                            {isFeatureTemporarilyOpen(feature) ? (
                              <Badge variant="success">Promo open</Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                            {feature.enabled_for_all_until
                              ? `Override: ${formatDate(feature.enabled_for_all_until)}`
                              : "Override belgilanmagan"}
                          </p>
                          <Badge variant={hasFeatureAccess(user, feature) ? "success" : "muted"}>
                            {hasFeatureAccess(user, feature) ? "Access bor" : "Locked"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {isDirty ? <Badge variant="warning">Unsaved</Badge> : null}
                            <Button asChild size="sm" variant="outline">
                              <Link href="/admin/analytics">Update price</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === feature.id}
                              onClick={() =>
                                setDrafts((current) => ({
                                  ...current,
                                  [feature.id]: buildDraft(feature),
                                }))
                              }
                            >
                              Reset
                            </Button>
                            <Button
                              size="sm"
                              disabled={!isDirty || busyId === feature.id}
                              onClick={() => void saveFeature(feature)}
                            >
                              Save
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </tbody>
              </Table>
            </AdminTableShell>
          )}
        </div>
      </AdminSurface>
    </div>
  );
}
