"use client";

import { CreditCard, Gift, Plus, Trash2 } from "lucide-react";
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
import type { AdminPromoCode, AdminPromoCodePayload, AdminSubscriptionPlan, AdminSubscriptionPlanPayload } from "@/types/admin";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/shared/ui/modal";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableCell, TableHead, TableRow } from "@/shared/ui/table";
import { Textarea } from "@/shared/ui/textarea";
import { toIsoOrNull, toNullableString, toRequiredNumber } from "@/features/admin/utils";

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
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[32rem] rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-[32rem] rounded-[1.75rem] bg-[var(--muted)]" />
      </div>
    </div>
  );
}

export function AdminBillingPage() {
  const resource = useAsyncResource(getAdminBillingData, [], true);
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
        description="Tariflar va promokodlarni bir joydan boshqaring."
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openPlanModal()}>
              <Plus className="h-4 w-4" />
              Yangi plan
            </Button>
            <Button variant="outline" onClick={() => openPromoModal()}>
              <Gift className="h-4 w-4" />
              Yangi promo
            </Button>
          </div>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Subscription planlar</CardTitle>
            <CardDescription>{resource.data.plans.length} ta active/inactive tarif</CardDescription>
          </CardHeader>
          <CardContent>
            {resource.data.plans.length === 0 ? (
              <EmptyState title="Planlar yo'q" description="Yangi plan qo'shish uchun yuqoridagi tugmadan foydalaning." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <TableHead>Kod</TableHead>
                      <TableHead>Narx</TableHead>
                      <TableHead>Muddat</TableHead>
                      <TableHead>Holat</TableHead>
                      <TableHead>Amallar</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.plans.map((plan) => (
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
                          <Badge variant={plan.is_active ? "success" : "outline"}>
                            {plan.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => openPlanModal(plan)}>
                              Tahrirlash
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === plan.id} onClick={() => void removePlan(plan.id)}>
                              <Trash2 className="h-4 w-4" />
                              O'chirish
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Promo kodlar</CardTitle>
            <CardDescription>{resource.data.promos.length} ta promo mavjud</CardDescription>
          </CardHeader>
          <CardContent>
            {resource.data.promos.length === 0 ? (
              <EmptyState title="Promo yo'q" description="Yangi promo yaratish uchun yuqoridagi tugmadan foydalaning." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <TableHead>Kod</TableHead>
                      <TableHead>Chegirma</TableHead>
                      <TableHead>Qo'llanish</TableHead>
                      <TableHead>Holat</TableHead>
                      <TableHead>Amallar</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.promos.map((promo) => (
                      <TableRow key={promo.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{promo.code}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{promo.name ?? "No name"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {promo.discount_value}
                          {promo.discount_type === "percent" ? "%" : ` ${promo.school_id ? "school-linked" : promo.discount_type}`}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{promo.current_uses}/{promo.max_uses ?? promo.max_redemptions ?? "∞"}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {promo.expires_at ? `Expire: ${formatDate(promo.expires_at)}` : "Cheklanmagan"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={promo.is_active ? "success" : "outline"}>
                            {promo.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => openPromoModal(promo)}>
                              Tahrirlash
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === promo.id} onClick={() => void removePromo(promo.id)}>
                              <Trash2 className="h-4 w-4" />
                              O'chirish
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
