"use client";

import Link from "next/link";
import { ArrowRight, Check, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo } from "react";

import { getCheckoutPlans } from "@/api/payments";
import {
  FREE_PLAN_FEATURES,
  PREMIUM_PLAN_FEATURES,
  formatPlanAmount,
  getPlanHeadline,
  getPlanInterval,
} from "@/features/payments/payment-catalog";
import { useExperimentVariant } from "@/components/providers/experiment-provider";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { trackEvent } from "@/lib/analytics";
import { getUpgradeButtonLabel, UPGRADE_BUTTON_EXPERIMENT } from "@/lib/experiments";
import { useUser } from "@/hooks/use-user";
import { buttonStyles } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { ErrorState } from "@/shared/ui/error-state";
import { Skeleton } from "@/shared/ui/skeleton";
import type { SubscriptionPlan } from "@/types/payment";

function PlanCard({
  actionHref,
  actionLabel,
  badge,
  current,
  description,
  features,
  highlighted = false,
  name,
  price,
  subtitle,
}: {
  actionHref: string;
  actionLabel: string;
  badge: string;
  current?: boolean;
  description: string;
  features: readonly string[];
  highlighted?: boolean;
  name: string;
  price: string;
  subtitle: string;
}) {
  return (
    <Card
      className={`relative overflow-hidden border ${
        highlighted
          ? "border-[color-mix(in_oklab,var(--primary)_30%,transparent)] shadow-xl"
          : "border-[var(--border)]"
      }`}
    >
      {highlighted ? (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-sky-500" />
      ) : null}
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              highlighted
                ? "bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] text-[var(--primary-foreground)]"
                : "bg-[var(--muted)] text-[var(--muted-foreground)]"
            }`}
          >
            {badge}
          </span>
          {current ? (
            <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Joriy tarif
            </span>
          ) : null}
        </div>

        <div className="mt-6">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {name}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">{description}</p>
        </div>

        <div className="mt-8 flex items-end gap-2">
          <span className="text-4xl font-bold tracking-tight">{price}</span>
          <span className="pb-1 text-sm text-[var(--muted-foreground)]">{subtitle}</span>
        </div>

        <Link
          href={actionHref}
          className={buttonStyles({
            size: "lg",
            variant: highlighted ? "default" : "outline",
            className: "mt-8 w-full",
          })}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="mt-8 space-y-3">
          {features.map((feature) => (
            <div key={feature} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-[var(--primary)]">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="text-[var(--foreground)]">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PricingGridSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Skeleton className="h-[28rem]" />
      <Skeleton className="h-[28rem]" />
      <Skeleton className="h-[28rem]" />
    </div>
  );
}

function premiumCtaHref(authenticated: boolean, plan?: SubscriptionPlan) {
  if (!authenticated) {
    return "/login?next=/upgrade";
  }

  return plan ? `/upgrade?plan=${encodeURIComponent(plan.id)}` : "/upgrade";
}

export function PricingPage() {
  const { authenticated, loading, user } = useUser();
  const plansResource = useAsyncResource(getCheckoutPlans, [], true);
  const upgradeVariant = useExperimentVariant(UPGRADE_BUTTON_EXPERIMENT, "A");

  const plans = useMemo(
    () => [...(plansResource.data ?? [])].sort((left, right) => left.sort_order - right.sort_order),
    [plansResource.data],
  );

  const isPremium = user?.is_premium === true;
  const upgradeLabel = getUpgradeButtonLabel(upgradeVariant);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_70%,white),var(--background))]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm shadow-sm">
              <Crown className="h-4 w-4 text-amber-500" />
              <span>Premium obuna</span>
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
              Premium tarifni tanlang
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
              Sizga mos tarifni tanlang, promokod qo&apos;llang va to&apos;lovni bir necha bosqichda yakunlang.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={authenticated ? "/upgrade" : "/login?next=/upgrade"}
                className={buttonStyles({ size: "lg" })}
                onClick={() =>
                  void trackEvent("premium_click", {
                    source: "pricing_hero",
                    cta_label: upgradeLabel,
                  })
                }
              >
                {upgradeLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={authenticated ? "/dashboard" : "/register"}
                className={buttonStyles({ size: "lg", variant: "outline" })}
              >
                {authenticated ? "Dashboard ga qaytish" : "Bepul boshlash"}
              </Link>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <Card className="border-0 bg-[color-mix(in_oklab,var(--card)_84%,transparent)]">
              <CardContent className="flex items-center gap-4 p-5">
                <Sparkles className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="font-medium">Promokod</p>
                  <p className="text-sm text-[var(--muted-foreground)]">Chegirma bo&apos;lsa shu yerning o&apos;zida qo&apos;llanadi</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-[color-mix(in_oklab,var(--card)_84%,transparent)]">
              <CardContent className="flex items-center gap-4 p-5">
                <ShieldCheck className="h-5 w-5 text-sky-600" />
                <div>
                  <p className="font-medium">Xavfsiz to&apos;lov</p>
                  <p className="text-sm text-[var(--muted-foreground)]">To&apos;lov himoyalangan oynada davom etadi</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 bg-[color-mix(in_oklab,var(--card)_84%,transparent)]">
              <CardContent className="flex items-center gap-4 p-5">
                <Crown className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium">Darhol faollashadi</p>
                  <p className="text-sm text-[var(--muted-foreground)]">To&apos;lov yakunlangach premium imkoniyatlar ochiladi</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {plansResource.loading ? <PricingGridSkeleton /> : null}

        {!plansResource.loading && plansResource.error ? (
          <ErrorState
            title="Tariflar yuklanmadi"
            description="Tariflarni hozircha yuklab bo'lmadi. Birozdan keyin qayta urinib ko'ring."
            error={plansResource.error}
            onRetry={() => void plansResource.reload()}
          />
        ) : null}

        {!plansResource.loading && !plansResource.error ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <PlanCard
              actionHref={authenticated ? "/dashboard" : "/register"}
              actionLabel={loading ? "Yuklanmoqda..." : authenticated ? "Joriy tarif" : "Bepul boshlash"}
              badge="Free"
              current={authenticated && !isPremium}
              description="Platformani real data va asosiy practice oqimi bilan ishlatish uchun kirish nuqtasi."
              features={FREE_PLAN_FEATURES}
              name="Bepul"
              price="0 so'm"
              subtitle="har doim"
            />

            {plans.length > 0
              ? plans.map((plan, index) => (
                  <PlanCard
                    key={plan.id}
                    actionHref={premiumCtaHref(authenticated, plan)}
                    actionLabel={isPremium ? "Faol premium" : authenticated ? "Shu tarifni tanlash" : "Login va davom etish"}
                    badge={plan.code.toUpperCase()}
                    current={isPremium}
                    description={plan.description ?? getPlanHeadline(plan)}
                    features={PREMIUM_PLAN_FEATURES}
                    highlighted={index === 0}
                    name={plan.name}
                    price={formatPlanAmount(plan.price_cents, plan.currency)}
                    subtitle={getPlanInterval(plan)}
                  />
                ))
              : (
                <Card className="lg:col-span-2">
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold">Premium plan topilmadi</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
                      Hozircha faol premium tarif ko&apos;rinmayapti. Keyinroq qayta tekshirib ko&apos;ring.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link href="/dashboard" className={buttonStyles({ size: "lg", variant: "outline" })}>
                        Dashboard
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
