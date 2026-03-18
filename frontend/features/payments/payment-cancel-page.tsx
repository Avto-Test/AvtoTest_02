"use client";

import Link from "next/link";
import { CircleX, RotateCcw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { PaymentStatusView } from "@/features/payments/payment-status-view";
import { clearRememberedCheckoutSession, resolveCheckoutSessionId } from "@/lib/payment-session";
import { buttonStyles } from "@/shared/ui/button";

export function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const checkoutId = useMemo(() => resolveCheckoutSessionId(searchParams), [searchParams]);

  useEffect(() => {
    clearRememberedCheckoutSession();
  }, []);

  return (
    <PaymentStatusView
      badge="Checkout canceled"
      description="To‘lov oqimi yakunlanmadi. Premium olish uchun checkoutni xohlagan payt qayta boshlashingiz mumkin."
      icon={<CircleX className="h-8 w-8" />}
      meta={
        checkoutId ? (
          <span className="inline-flex rounded-full bg-black/5 px-3 py-1 text-xs text-[var(--muted-foreground)]">
            Session: {checkoutId}
          </span>
        ) : null
      }
      tone="cancel"
      title="To‘lov bekor qilindi"
      actions={
        <>
          <Link href="/pricing" className={buttonStyles({ size: "lg" })}>
            <RotateCcw className="h-4 w-4" />
            Tariflarga qaytish
          </Link>
          <Link href="/dashboard" className={buttonStyles({ size: "lg", variant: "outline" })}>
            Dashboard
          </Link>
        </>
      }
    >
      <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5 text-sm leading-7 text-[var(--muted-foreground)]">
        Agar checkout oynasi tasodifan yopilgan bo‘lsa, premium tugmasi yoki pricing sahifasi orqali yangi session yaratib davom etishingiz mumkin.
      </div>
    </PaymentStatusView>
  );
}
