"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Crown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getCheckoutPlans, getCheckoutQuote, redeemPromo, redirectToCheckout } from "@/api/payments";
import { formatPlanAmount, getPlanHeadline } from "@/features/payments/payment-catalog";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useUser } from "@/hooks/use-user";
import { Button, buttonStyles } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import type { CheckoutQuote } from "@/types/payment";

export function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, loading, refreshUser, user } = useUser();
  const plansResource = useAsyncResource(getCheckoutPlans, [], true);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const plans = useMemo(
    () => [...(plansResource.data ?? [])].sort((left, right) => left.sort_order - right.sort_order),
    [plansResource.data],
  );

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace("/login?next=/upgrade");
    }
  }, [authenticated, loading, router]);

  useEffect(() => {
    if (plans.length === 0) {
      return;
    }

    const preselectedPlan = searchParams.get("plan");
    if (preselectedPlan && plans.some((plan) => plan.id === preselectedPlan)) {
      setSelectedPlanId(preselectedPlan);
      return;
    }

    setSelectedPlanId((current) => (current && plans.some((plan) => plan.id === current) ? current : plans[0].id));
  }, [plans, searchParams]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const finalAmount = quote?.final_amount_cents ?? selectedPlan?.price_cents ?? 0;
  const baseAmount = quote?.base_amount_cents ?? selectedPlan?.price_cents ?? 0;
  const currency = quote?.currency ?? selectedPlan?.currency ?? "UZS";
  const promoApplied = quote?.promo?.code === promoCode.trim().toUpperCase();

  const resetQuoteState = (nextPromoCode?: string) => {
    setQuote(null);
    setError(null);
    setSuccess(null);
    if (typeof nextPromoCode === "string") {
      setPromoCode(nextPromoCode);
    }
  };

  const handleApplyPromo = async () => {
    const normalizedPromo = promoCode.trim().toUpperCase();

    setError(null);
    setSuccess(null);

    if (!selectedPlan) {
      setError("Avval tarifni tanlang.");
      return;
    }

    if (!normalizedPromo) {
      setError("Promokodni kiriting.");
      return;
    }

    setApplyingPromo(true);

    try {
      const nextQuote = await getCheckoutQuote({
        plan_id: selectedPlan.id,
        promo_code: normalizedPromo,
      });

      if (!nextQuote.promo) {
        setQuote(null);
        setError("Promokod qo'llanmadi.");
        return;
      }

      setQuote(nextQuote);
      setPromoCode(nextQuote.promo.code);
      setSuccess(`Promokod qo'llandi: ${nextQuote.promo.code}`);

      if (nextQuote.final_amount_cents === 0) {
        const redemption = await redeemPromo({
          plan_id: selectedPlan.id,
          promo_code: nextQuote.promo.code,
        });
        await refreshUser();
        setSuccess(`${redemption.plan_name} aktivlashtirildi.`);
        window.setTimeout(() => {
          router.replace("/payment/success?gift=1");
        }, 900);
      }
    } catch (nextError) {
      setQuote(null);
      setError(nextError instanceof Error ? nextError.message : "Promokodni tekshirib bo'lmadi.");
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleCheckout = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedPlan) {
      setError("Aktiv tarif topilmadi.");
      return;
    }

    const normalizedPromo = promoCode.trim().toUpperCase();
    if (normalizedPromo && !promoApplied) {
      setError("Promokodni avval qo'llang.");
      return;
    }

    setStartingCheckout(true);

    try {
      await redirectToCheckout({
        plan_id: selectedPlan.id,
        promo_code: quote?.promo?.code ?? undefined,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Checkout yaratilmadi.");
      setStartingCheckout(false);
    }
  };

  if (loading || (!authenticated && !loading)) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-[30rem]" />
        </div>
      </div>
    );
  }

  if (user?.is_premium) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6">
        <div className="mx-auto max-w-xl">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="mt-6 text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Premium faol
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                Premium imkoniyatlari ochiq.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/dashboard" className={buttonStyles({ size: "lg" })}>
                  Dashboard
                </Link>
                <Link href="/analytics" className={buttonStyles({ size: "lg", variant: "outline" })}>
                  Analytics
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              Premium
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Premiumni yoqing
            </h1>
          </div>
          <Link href="/pricing" className={buttonStyles({ variant: "outline" })}>
            Tariflar
          </Link>
        </div>

        {plansResource.error ? (
          <ErrorState
            title="Tariflar yuklanmadi"
            description="Tariflarni olishda xatolik yuz berdi."
            error={plansResource.error}
            onRetry={() => void plansResource.reload()}
          />
        ) : null}

        {!plansResource.loading && !plansResource.error && plans.length === 0 ? (
          <EmptyState
            title="Aktiv tarif topilmadi"
            description="Hozircha tanlash uchun premium tarif yo'q."
          />
        ) : null}

        {plans.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Tarifni tanlang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <Select
                  value={selectedPlanId}
                  onChange={(event) => {
                    resetQuoteState();
                    setSelectedPlanId(event.target.value);
                  }}
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {formatPlanAmount(plan.price_cents, plan.currency)} / {plan.duration_days} kun
                    </option>
                  ))}
                </Select>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--muted)]/40 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedPlan?.name}</h2>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {selectedPlan ? selectedPlan.description ?? getPlanHeadline(selectedPlan) : "Tarif tanlanmagan"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-bold">{formatPlanAmount(finalAmount, currency)}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {selectedPlan?.duration_days} kun
                    </p>
                  </div>
                </div>

                {quote?.promo ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {quote.promo.code}: -{formatPlanAmount(quote.promo.savings_cents, currency)}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Promokod</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    placeholder="Masalan: GIFT100"
                    value={promoCode}
                    onChange={(event) => resetQuoteState(event.target.value.toUpperCase())}
                  />
                  <Button
                    className="sm:min-w-36"
                    disabled={applyingPromo || !selectedPlan}
                    onClick={() => void handleApplyPromo()}
                  >
                    {applyingPromo ? "Tekshirilmoqda..." : "Qo'llash"}
                  </Button>
                </div>
              </div>

              {error ? (
                <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              ) : null}

              <Button className="w-full" size="lg" disabled={startingCheckout || !selectedPlan} onClick={() => void handleCheckout()}>
                {startingCheckout
                  ? "Checkout ochilmoqda..."
                  : `${formatPlanAmount(finalAmount || baseAmount, currency)} bilan davom etish`}
                {!startingCheckout ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
