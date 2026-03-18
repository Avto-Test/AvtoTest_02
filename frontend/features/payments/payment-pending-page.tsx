"use client";

import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getTransactionStatus } from "@/api/payments";
import { PaymentStatusView } from "@/features/payments/payment-status-view";
import { useUser } from "@/hooks/use-user";
import { clearRememberedCheckoutSession, normalizePaymentStatus, resolveCheckoutSessionId } from "@/lib/payment-session";
import { buttonStyles } from "@/shared/ui/button";

export function PaymentPendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, loading, refreshUser, user } = useUser();
  const checkoutId = useMemo(() => resolveCheckoutSessionId(searchParams), [searchParams]);

  useEffect(() => {
    if (loading || !authenticated || !checkoutId) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const poll = async () => {
      if (user?.is_premium) {
        clearRememberedCheckoutSession();
        router.replace(`/payment/success?cheque_id=${encodeURIComponent(checkoutId)}`);
        return;
      }

      try {
        const transaction = await getTransactionStatus(checkoutId);
        if (cancelled) {
          return;
        }

        const normalized = normalizePaymentStatus(transaction.pay_status);
        const resolvedCheckoutId = transaction.cheque_id || checkoutId;

        if (normalized === "success") {
          await refreshUser().catch(() => null);
          if (cancelled) {
            return;
          }
          clearRememberedCheckoutSession();
          router.replace(`/payment/success?cheque_id=${encodeURIComponent(resolvedCheckoutId)}`);
          return;
        }

        if (normalized === "failed") {
          clearRememberedCheckoutSession();
          router.replace(`/payment/cancel?cheque_id=${encodeURIComponent(resolvedCheckoutId)}`);
          return;
        }
      } catch {
        // Continue polling while the provider settles.
      }

      timeoutId = window.setTimeout(() => {
        void poll();
      }, 3000);
    };

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [authenticated, checkoutId, loading, refreshUser, router, user?.is_premium]);

  if (loading) {
    return (
      <PaymentStatusView
        badge="Payment status"
        description="Checkout sessiyasi tayyorlanmoqda."
        icon={<Loader2 className="h-8 w-8 animate-spin" />}
        tone="pending"
        title="Holat tekshirilmoqda"
      />
    );
  }

  if (!authenticated) {
    return (
      <PaymentStatusView
        badge="Authentication required"
        description="Payment holatini tekshirish uchun hisobga kirish kerak."
        icon={<ShieldCheck className="h-8 w-8" />}
        tone="info"
        title="Login talab qilinadi"
        actions={
          <>
            <Link href="/login?next=/payment/pending" className={buttonStyles({ size: "lg" })}>
              Login
            </Link>
            <Link href="/pricing" className={buttonStyles({ size: "lg", variant: "outline" })}>
              Tariflarga qaytish
            </Link>
          </>
        }
      />
    );
  }

  if (!checkoutId) {
    return (
      <PaymentStatusView
        badge="Missing checkout id"
        description="To‘lov holatini kuzatish uchun session yoki cheque identifikatori topilmadi. Checkoutni qaytadan boshlang."
        icon={<ShieldCheck className="h-8 w-8" />}
        tone="info"
        title="Identifikator topilmadi"
        actions={
          <>
            <Link href="/pricing" className={buttonStyles({ size: "lg" })}>
              Tariflarga qaytish
            </Link>
            <Link href="/dashboard" className={buttonStyles({ size: "lg", variant: "outline" })}>
              Dashboard
            </Link>
          </>
        }
      />
    );
  }

  return (
    <PaymentStatusView
      badge="Waiting for provider"
      description="Provider status polling ishlayapti. To‘lov tasdiqlangach sahifa avtomatik success yoki cancel holatiga o‘tadi."
      icon={<Loader2 className="h-8 w-8 animate-spin" />}
      meta={
        <span className="inline-flex rounded-full bg-black/5 px-3 py-1 text-xs text-[var(--muted-foreground)]">
          Session: {checkoutId}
        </span>
      }
      tone="pending"
      title="Premium faollashuvi kutilmoqda"
      actions={
        <>
          <Link href="/dashboard" className={buttonStyles({ size: "lg", variant: "outline" })}>
            Dashboard
          </Link>
          <Link href="/pricing" className={buttonStyles({ size: "lg", variant: "ghost" })}>
            Tariflarga qaytish
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-full bg-black/5">
          <div className="h-2 w-full animate-[pulse_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[var(--primary)] via-sky-500 to-[var(--accent)]" />
        </div>
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5 text-sm leading-7 text-[var(--muted-foreground)]">
          To'lov tasdig'i biroz kechiksa ham shu sahifa ochiq qolishi mumkin. Faollashuv tugashi bilan holat avtomatik yangilanadi.
        </div>
      </div>
    </PaymentStatusView>
  );
}
