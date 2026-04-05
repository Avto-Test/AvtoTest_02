"use client";

import { CreditCard, Gift, Plus, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createAdminPlan,
  createAdminPromo,
  deleteAdminPlan,
  deleteAdminPromo,
  getAdminBillingData,
  updateAdminPlan,
  updateAdminPromo,
} from "@/api/admin";
import { AdminActionMenu, AdminStatCard, AdminSurface, AdminTableShell, AdminToolbar } from "@/features/admin/admin-ui";
import { toIsoOrNull, toNullableString, toRequiredNumber } from "@/features/admin/utils";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableCell, TableHead, TableRow } from "@/shared/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import type {
  AdminPromoCode,
  AdminPromoCodePayload,
  AdminSubscriptionPlan,
  AdminSubscriptionPlanPayload,
} from "@/types/admin";

type PlanDraft = {
  code: string;
  name: string;
  description: string;
  price_cents: string;
  currency: string;
  duration_days: string;
  sort_order: string;
  is_active: boolean;
};

type PromoDraft = {
  code: string;
  name: string;
  description: string;
  discount_type: string;
  discount_value: string;
  school_id: string;
  group_id: string;
  max_redemptions: string;
  max_uses: string;
  starts_at: string;
  expires_at: string;
  applicable_plan_ids_raw: string;
  is_active: boolean;
};

function makePlanDraft(plan?: AdminSubscriptionPlan): PlanDraft {
  return {
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    price_cents: String(plan?.price_cents ?? 0),
    currency: plan?.currency ?? "UZS",
    duration_days: String(plan?.duration_days ?? 30),
    sort_order: String(plan?.sort_order ?? 0),
    is_active: plan?.is_active ?? true,
  };
}

function makePromoDraft(promo?: AdminPromoCode): PromoDraft {
  return {
    code: promo?.code ?? "",
    name: promo?.name ?? "",
    description: promo?.description ?? "",
    discount_type: promo?.discount_type ?? "percent",
    discount_value: String(promo?.discount_value ?? 10),
    school_id: promo?.school_id ?? "",
    group_id: promo?.group_id ?? "",
    max_redemptions: promo?.max_redemptions != null ? String(promo.max_redemptions) : "",
    max_uses: promo?.max_uses != null ? String(promo.max_uses) : "",
    starts_at: promo?.starts_at ? promo.starts_at.slice(0, 16) : "",
    expires_at: promo?.expires_at ? promo.expires_at.slice(0, 16) : "",
    applicable_plan_ids_raw: promo?.applicable_plan_ids.join(", ") ?? "",
    is_active: promo?.is_active ?? true,
  };
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
      <Skeleton className="h-[32rem] rounded-[1.75rem] bg-[var(--muted)]" />
    </div>
  );
}

export function AdminBillingPage() {
  const resource = useAsyncResource(getAdminBillingData, [], true);
  const [tab, setTab] = useState("plans");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminSubscriptionPlan | null>(null);
  const [editingPromo, setEditingPromo] = useState<AdminPromoCode | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft>(makePlanDraft());
  const [promoDraft, setPromoDraft] = useState<PromoDraft>(makePromoDraft());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const planOptions = useMemo(
    () => (resource.data?.plans ?? []).map((plan) => ({ id: plan.id, label: `${plan.name} (${plan.code})` })),
    [resource.data?.plans],
  );

  const filteredPlans = useMemo(() => {
    const plans = resource.data?.plans ?? [];
    const normalized = query.trim().toLowerCase();

    return plans.filter((plan) => {
      const matchesQuery =
        !normalized ||
        plan.name.toLowerCase().includes(normalized) ||
        plan.code.toLowerCase().includes(normalized);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && plan.is_active) ||
        (statusFilter === "inactive" && !plan.is_active);
      return matchesQuery && matchesStatus;
    });
  }, [query, resource.data?.plans, statusFilter]);

  const filteredPromos = useMemo(() => {
    const promos = resource.data?.promos ?? [];
    const normalized = query.trim().toLowerCase();

    return promos.filter((promo) => {
      const matchesQuery =
        !normalized ||
        promo.code.toLowerCase().includes(normalized) ||
        (promo.name ?? "").toLowerCase().includes(normalized);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && promo.is_active) ||
        (statusFilter === "inactive" && !promo.is_active);
      return matchesQuery && matchesStatus;
    });
  }, [query, resource.data?.promos, statusFilter]);

  const summary = useMemo(() => {
    const plans = resource.data?.plans ?? [];
    const promos = resource.data?.promos ?? [];
    return {
      totalPlans: plans.length,
      activePlans: plans.filter((plan) => plan.is_active).length,
      totalPromos: promos.length,
      activePromos: promos.filter((promo) => promo.is_active).length,
      redemptions: promos.reduce((total, promo) => total + promo.redeemed_count, 0),
    };
  }, [resource.data?.plans, resource.data?.promos]);

  const openPlanModal = (plan?: AdminSubscriptionPlan) => {
    setEditingPlan(plan ?? null);
    setPlanDraft(makePlanDraft(plan));
    setPlanModalOpen(true);
  };

  const openPromoModal = (promo?: AdminPromoCode) => {
    setEditingPromo(promo ?? null);
    setPromoDraft(makePromoDraft(promo));
    setPromoModalOpen(true);
  };

  const runRefresh = async () => {
    await resource.reload();
  };

  const savePlan = async () => {
    setBusy("plan");
    setNotice(null);
    const payload: AdminSubscriptionPlanPayload = {
      code: planDraft.code.trim(),
      name: planDraft.name.trim(),
      description: toNullableString(planDraft.description),
      price_cents: toRequiredNumber(planDraft.price_cents, 0),
      currency: planDraft.currency.trim() || "UZS",
      duration_days: toRequiredNumber(planDraft.duration_days, 30),
      is_active: planDraft.is_active,
      sort_order: toRequiredNumber(planDraft.sort_order, 0),
    };

    try {
      if (editingPlan) {
        await updateAdminPlan(editingPlan.id, payload);
      } else {
        await createAdminPlan(payload);
      }
      setPlanModalOpen(false);
      await runRefresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Plan saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const savePromo = async () => {
    setBusy("promo");
    setNotice(null);
    const payload: AdminPromoCodePayload = {
      code: promoDraft.code.trim(),
      name: toNullableString(promoDraft.name),
      description: toNullableString(promoDraft.description),
      discount_type: promoDraft.discount_type,
      discount_value: toRequiredNumber(promoDraft.discount_value, 0),
      school_id: toNullableString(promoDraft.school_id),
      group_id: toNullableString(promoDraft.group_id),
      max_redemptions: promoDraft.max_redemptions.trim() ? toRequiredNumber(promoDraft.max_redemptions, 0) : null,
      max_uses: promoDraft.max_uses.trim() ? toRequiredNumber(promoDraft.max_uses, 0) : null,
      starts_at: toIsoOrNull(promoDraft.starts_at),
      expires_at: toIsoOrNull(promoDraft.expires_at),
      is_active: promoDraft.is_active,
      applicable_plan_ids: promoDraft.applicable_plan_ids_raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    };

    try {
      if (editingPromo) {
        await updateAdminPromo(editingPromo.id, payload);
      } else {
        await createAdminPromo(payload);
      }
      setPromoModalOpen(false);
      await runRefresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Promo saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const removePlan = async (planId: string) => {
    setBusy(planId);
    setNotice(null);
    try {
      await deleteAdminPlan(planId);
      await runRefresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Plan o'chirilmadi.");
    } finally {
      setBusy(null);
    }
  };

  const removePromo = async (promoId: string) => {
    setBusy(promoId);
    setNotice(null);
    try {
      await deleteAdminPromo(promoId);
      await runRefresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Promo o'chirilmadi.");
    } finally {
      setBusy(null);
    }
  };

  const togglePlan = async (plan: AdminSubscriptionPlan) => {
    setBusy(plan.id);
    setNotice(null);
    try {
      await updateAdminPlan(plan.id, { is_active: !plan.is_active });
      await runRefresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Plan holati yangilanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const togglePromo = async (promo: AdminPromoCode) => {
    setBusy(promo.id);
    setNotice(null);
    try {
      await updateAdminPromo(promo.id, { is_active: !promo.is_active });
      await runRefresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Promo holati yangilanmadi.");
    } finally {
      setBusy(null);
    }
  };

  if (resource.loading) {
    return <LoadingState />;
  }

  if (resource.error || !resource.data) {
    return (
      <ErrorState
        title="Billing admin sahifasi yuklanmadi"
        description="Tarif va promo ma'lumotini olib bo'lmadi."
        error={resource.error}
        onRetry={() => void resource.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tariflar va promo"
        description="Plan va promokodlarni alohida tizim sifatida boshqaring, lekin bitta SaaS billing oqimida."
        action={
          <Button onClick={() => openPlanModal()}>
            <Plus className="h-4 w-4" />
            Yangi plan
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Planlar" value={summary.totalPlans} caption={`${summary.activePlans} ta faol tarif`} icon={CreditCard} />
        <AdminStatCard label="Promo kodlar" value={summary.totalPromos} caption={`${summary.activePromos} ta faol promo`} icon={Gift} tone="warning" />
        <AdminStatCard label="Redeem qilingan" value={summary.redemptions} caption="Promo ishlatilishlar yig'indisi" icon={RefreshCcw} tone="neutral" />
        <AdminStatCard label="Faol billing obyektlari" value={summary.activePlans + summary.activePromos} caption="Plan va promo birgalikdagi faol obyektlar" icon={Plus} tone="success" />
      </div>

      <AdminToolbar
        search={
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === "plans" ? "Plan nomi yoki kodi bo'yicha qidiring" : "Promo kodi yoki nomi bo'yicha qidiring"}
          />
        }
        filters={
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-40">
            <option value="all">Barcha holatlar</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
          </Select>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => void runRefresh()}>
              <RefreshCcw className="h-4 w-4" />
              Yangilash
            </Button>
            <Button variant="outline" onClick={() => openPromoModal()}>
              <Gift className="h-4 w-4" />
              Yangi promo
            </Button>
          </>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-[var(--accent-yellow-strong)] bg-[var(--accent-yellow-soft)] px-4 py-3 text-sm text-[var(--accent-yellow)]">
          {notice}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="promos">Promo codes</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <AdminSurface
            title="Subscription planlar"
            description="Narx, muddat va status bo'yicha toza billing jadvali. To'liq sozlamalar `Manage` modalida qoladi."
          >
            <div className="p-5">
              {filteredPlans.length === 0 ? (
                <EmptyState title="Plan topilmadi" description="Qidiruv yoki filtr bo'yicha mos plan yo'q." />
              ) : (
                <AdminTableShell>
                  <Table>
                    <thead className="bg-[var(--muted)]/35">
                      <tr>
                        <TableHead>Plan</TableHead>
                        <TableHead>Narx</TableHead>
                        <TableHead>Muddat</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Yangilangan</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{plan.name}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{plan.code}</p>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(plan.price_cents, plan.currency)}</TableCell>
                          <TableCell>{plan.duration_days} kun</TableCell>
                          <TableCell>
                            <Badge variant={plan.is_active ? "success" : "muted"}>
                              {plan.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[var(--muted-foreground)]">{formatDate(plan.updated_at)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openPlanModal(plan)}>
                                Manage
                              </Button>
                              <AdminActionMenu
                                items={[
                                  { label: plan.is_active ? "Deactivate" : "Activate", disabled: busy === plan.id, onClick: () => void togglePlan(plan) },
                                  { label: "Edit", disabled: busy === plan.id, onClick: () => openPlanModal(plan) },
                                  { label: "Delete", tone: "danger", disabled: busy === plan.id, onClick: () => void removePlan(plan.id) },
                                ]}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </Table>
                </AdminTableShell>
              )}
            </div>
          </AdminSurface>
        </TabsContent>

        <TabsContent value="promos">
          <AdminSurface
            title="Promo kodlar"
            description="Usage, chegirma turi va amal qilish muddati aniq ko'rinadigan promo jadvali."
          >
            <div className="p-5">
              {filteredPromos.length === 0 ? (
                <EmptyState title="Promo topilmadi" description="Qidiruv yoki filtr bo'yicha mos promo yo'q." />
              ) : (
                <AdminTableShell>
                  <Table>
                    <thead className="bg-[var(--muted)]/35">
                      <tr>
                        <TableHead>Kod</TableHead>
                        <TableHead>Chegirma</TableHead>
                        <TableHead>Qo&apos;llanish</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amal qiladi</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPromos.map((promo) => (
                        <TableRow key={promo.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{promo.code}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{promo.name ?? "Nom berilmagan"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {promo.discount_value}
                            {promo.discount_type === "percent" ? "%" : ` ${promo.discount_type}`}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p>
                                {promo.current_uses}/{promo.max_uses ?? promo.max_redemptions ?? "cheksiz"}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)]">{promo.redeemed_count} marta redeem qilingan</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={promo.is_active ? "success" : "muted"}>
                              {promo.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[var(--muted-foreground)]">
                            {promo.expires_at ? formatDate(promo.expires_at) : "Cheklanmagan"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openPromoModal(promo)}>
                                Manage
                              </Button>
                              <AdminActionMenu
                                items={[
                                  { label: promo.is_active ? "Deactivate" : "Activate", disabled: busy === promo.id, onClick: () => void togglePromo(promo) },
                                  { label: "Edit", disabled: busy === promo.id, onClick: () => openPromoModal(promo) },
                                  { label: "Delete", tone: "danger", disabled: busy === promo.id, onClick: () => void removePromo(promo.id) },
                                ]}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </Table>
                </AdminTableShell>
              )}
            </div>
          </AdminSurface>
        </TabsContent>
      </Tabs>

      <Modal open={planModalOpen} onClose={() => setPlanModalOpen(false)} title={editingPlan ? "Plan tahrirlash" : "Yangi plan"}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Code</span>
            <Input value={planDraft.code} onChange={(event) => setPlanDraft((draft) => ({ ...draft, code: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Name</span>
            <Input value={planDraft.name} onChange={(event) => setPlanDraft((draft) => ({ ...draft, name: event.target.value }))} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Description</span>
            <Textarea value={planDraft.description} onChange={(event) => setPlanDraft((draft) => ({ ...draft, description: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Price cents</span>
            <Input value={planDraft.price_cents} onChange={(event) => setPlanDraft((draft) => ({ ...draft, price_cents: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Currency</span>
            <Input value={planDraft.currency} onChange={(event) => setPlanDraft((draft) => ({ ...draft, currency: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Duration days</span>
            <Input value={planDraft.duration_days} onChange={(event) => setPlanDraft((draft) => ({ ...draft, duration_days: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Sort order</span>
            <Input value={planDraft.sort_order} onChange={(event) => setPlanDraft((draft) => ({ ...draft, sort_order: event.target.value }))} />
          </label>
          <label className="flex items-center gap-3 text-sm font-medium md:col-span-2">
            <input
              type="checkbox"
              checked={planDraft.is_active}
              onChange={(event) => setPlanDraft((draft) => ({ ...draft, is_active: event.target.checked }))}
            />
            Active
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setPlanModalOpen(false)}>Bekor qilish</Button>
          <Button disabled={busy === "plan"} onClick={() => void savePlan()}>
            <CreditCard className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </Modal>

      <Modal open={promoModalOpen} onClose={() => setPromoModalOpen(false)} title={editingPromo ? "Promo tahrirlash" : "Yangi promo"}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">Code</span>
            <Input value={promoDraft.code} onChange={(event) => setPromoDraft((draft) => ({ ...draft, code: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Name</span>
            <Input value={promoDraft.name} onChange={(event) => setPromoDraft((draft) => ({ ...draft, name: event.target.value }))} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Description</span>
            <Textarea value={promoDraft.description} onChange={(event) => setPromoDraft((draft) => ({ ...draft, description: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Discount type</span>
            <Select value={promoDraft.discount_type} onChange={(event) => setPromoDraft((draft) => ({ ...draft, discount_type: event.target.value }))}>
              <option value="percent">percent</option>
              <option value="fixed">fixed</option>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Discount value</span>
            <Input value={promoDraft.discount_value} onChange={(event) => setPromoDraft((draft) => ({ ...draft, discount_value: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Linked school id</span>
            <Input value={promoDraft.school_id} onChange={(event) => setPromoDraft((draft) => ({ ...draft, school_id: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Linked group id</span>
            <Input value={promoDraft.group_id} onChange={(event) => setPromoDraft((draft) => ({ ...draft, group_id: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Max redemptions</span>
            <Input value={promoDraft.max_redemptions} onChange={(event) => setPromoDraft((draft) => ({ ...draft, max_redemptions: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Max uses</span>
            <Input value={promoDraft.max_uses} onChange={(event) => setPromoDraft((draft) => ({ ...draft, max_uses: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Starts at</span>
            <Input type="datetime-local" value={promoDraft.starts_at} onChange={(event) => setPromoDraft((draft) => ({ ...draft, starts_at: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">Expires at</span>
            <Input type="datetime-local" value={promoDraft.expires_at} onChange={(event) => setPromoDraft((draft) => ({ ...draft, expires_at: event.target.value }))} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">Applicable plan ids</span>
            <Input
              list="admin-plan-options"
              value={promoDraft.applicable_plan_ids_raw}
              onChange={(event) => setPromoDraft((draft) => ({ ...draft, applicable_plan_ids_raw: event.target.value }))}
              placeholder="UUID larni vergul bilan ajrating"
            />
            <datalist id="admin-plan-options">
              {planOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </datalist>
          </label>
          <label className="flex items-center gap-3 text-sm font-medium md:col-span-2">
            <input
              type="checkbox"
              checked={promoDraft.is_active}
              onChange={(event) => setPromoDraft((draft) => ({ ...draft, is_active: event.target.checked }))}
            />
            Active
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setPromoModalOpen(false)}>Bekor qilish</Button>
          <Button disabled={busy === "promo"} onClick={() => void savePromo()}>
            <Gift className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </Modal>
    </div>
  );
}
