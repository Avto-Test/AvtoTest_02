"use client";

import type { AdminGrowthSummary } from "@/types/admin";

export type AdminGrowthInsight = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  variant: "danger" | "warning" | "success" | "neutral";
};

const LOW_ACTIVATION_RATE = 40;
const LOW_ENGAGEMENT_RATE = 50;
const LOW_PAYMENT_RATE = 15;

export function buildAdminGrowthInsights(summary: AdminGrowthSummary | null): AdminGrowthInsight[] {
  if (!summary) {
    return [
      {
        id: "growth-unavailable",
        title: "Growth ma'lumoti tayyor emas",
        description: "Funnel signalini ko'rish uchun backend growth summary yuklanishi kerak.",
        actionLabel: "Qayta tekshirish",
        href: "/admin",
        variant: "neutral",
      },
    ];
  }

  const hasAnySignal =
    summary.registered_users > 0 ||
    summary.active_users > 0 ||
    summary.engaged_users > 0 ||
    summary.premium_clicks > 0 ||
    summary.successful_payments > 0;

  if (!hasAnySignal) {
    return [
      {
        id: "growth-no-signal",
        title: "Growth signali hali shakllanmagan",
        description: "Ro'yxatdan o'tish, sessiya va premium oqimi paydo bo'lgach tavsiyalar shu yerda chiqadi.",
        actionLabel: "Kuzatib borish",
        href: "/admin/users",
        variant: "neutral",
      },
    ];
  }

  const insights: AdminGrowthInsight[] = [];

  if (summary.active_users > 0 && summary.conversion_rates.engagement_rate < LOW_ENGAGEMENT_RATE) {
    insights.push({
      id: "post-first-session-drop",
      title: "Foydalanuvchilar birinchi sessiyadan keyin tushib qolmoqda",
      description: `${summary.drop_offs.activity_to_engagement} ta foydalanuvchi birinchi faollikdan keyin davom etmadi. Ikkinchi sessiyaga olib kiruvchi oqimni tekshirish kerak.`,
      actionLabel: "Kontentni ko'rish",
      href: "/admin/content",
      variant: "danger",
    });
  }

  if (summary.registered_users > 0 && summary.conversion_rates.activation_rate < LOW_ACTIVATION_RATE) {
    insights.push({
      id: "low-activation",
      title: "Ro'yxatdan o'tganlar tez faollashmayapti",
      description: `Aktivlashuv ${summary.conversion_rates.activation_rate.toFixed(1)}% da qoldi. Onboarding va birinchi sessiya yo'lini soddalashtirish foyda beradi.`,
      actionLabel: "Foydalanuvchilarni ko'rish",
      href: "/admin/users",
      variant: "warning",
    });
  }

  if (summary.engaged_users > 0 && summary.conversion_rates.payment_rate < LOW_PAYMENT_RATE) {
    insights.push({
      id: "low-payment-conversion",
      title: "To'lov konversiyasi past",
      description: `${summary.engaged_users} ta engaged foydalanuvchidan faqat ${summary.successful_payments} tasi to'lov qilgan. Tarif va checkout oqimini tekshirish kerak.`,
      actionLabel: "Billing bo'limi",
      href: "/admin/billing",
      variant: "warning",
    });
  }

  if (summary.engaged_users > 0 && summary.premium_clicks === 0) {
    insights.push({
      id: "no-premium-interest",
      title: "Premium taklifga qiziqish ko'rinmadi",
      description: "Engaged foydalanuvchilar bor, lekin premium tugmasi bosilmagan. Upgrade triggerlarini ko'rinadigan joyga olib chiqish kerak.",
      actionLabel: "To'lovlarni ko'rish",
      href: "/admin/billing",
      variant: "warning",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "healthy-growth",
      title: "Growth oqimi barqaror",
      description: "Hozircha aktivlashuv, engagement va to'lov bo'yicha keskin muammo ko'rinmadi.",
      actionLabel: "Statistikani ochish",
      href: "/admin/analytics",
      variant: "success",
    });
  }

  return insights.slice(0, 2);
}
