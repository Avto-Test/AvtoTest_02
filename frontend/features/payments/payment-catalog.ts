import type { SubscriptionPlan } from "@/types/payment";

export const FREE_PLAN_FEATURES = [
  "Asosiy practice testlar",
  "Kunlik limit bilan real attempt oqimi",
  "Bazaviy dashboard va analytics preview",
  "Driving school va instructor katalogiga kirish",
] as const;

export const PREMIUM_PLAN_FEATURES = [
  "Cheksiz practice va simulation attemptlar",
  "Batafsil answer breakdown va review unlock",
  "Kengaytirilgan analitika va tayyorgarlik ko'rsatkichlari",
  "Premium lesson va adaptive learning oqimlari",
] as const;

export function formatPlanAmount(amountCents: number, currency: string) {
  const normalizedCurrency = (currency || "UZS").toUpperCase();
  const amount = amountCents / 100;

  if (normalizedCurrency === "UZS") {
    return `${Math.round(amount).toLocaleString("uz-UZ")} so'm`;
  }

  return new Intl.NumberFormat("uz-UZ", {
    style: "currency",
    currency: normalizedCurrency,
  }).format(amount);
}

export function getPlanInterval(plan: SubscriptionPlan) {
  return `${plan.duration_days} kun`;
}

export function getPlanHeadline(plan: SubscriptionPlan) {
  const normalizedCode = plan.code.trim().toLowerCase();

  if (normalizedCode === "premium") {
    return "To'liq premium imkoniyatlari";
  }

  return `${plan.name} paketi`;
}
