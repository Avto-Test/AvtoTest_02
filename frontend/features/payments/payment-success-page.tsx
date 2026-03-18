"use client";

import Link from "next/link";
import { CheckCircle2, Crown, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getTransactionStatus } from "@/api/payments";
import { PaymentStatusView } from "@/features/payments/payment-status-view";
import { useUser } from "@/hooks/use-user";
import { clearRememberedCheckoutSession, normalizePaymentStatus, resolveCheckoutSessionId } from "@/lib/payment-session";
import { buttonStyles } from "@/shared/ui/button";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

export function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, loading, refreshUser, user } = useUser();
  const checkoutId = useMemo(() => resolveCheckoutSessionId(searchParams), [searchParams]);
  const isGift = searchParams.get("gift") === "1";
  const [stage, setStage] = useState<"checking" | "success" | "pending" | "auth">(
    isGift || checkoutId ? "checking" : "pending",
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!authenticated) {
      setStage("auth");
      return;
    }

    if (user?.is_premium) {
      clearRememberedCheckoutSession();
      setStage("success");
      return;
    }

    if (isGift) {
      void refreshUser()
        .then(() => {
          clearRememberedCheckoutSession();
          setStage("success");
        })
        .catch(() => {
          setStage("pending");
        });
      return;
    }

    if (!checkoutId) {
      setStage("pending");
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const scheduleNextPoll = (attempt: number) => {
      timeoutId = window.setTimeout(() => {
        void verify(attempt + 1);
      }, POLL_INTERVAL_MS);
    };

    const verify = async (attempt: number) => {
      try {
        const transaction = await getTransactionStatus(checkoutId);
        if (cancelled) {
          return;
        }

        const normalized = normalizePaymentStatus(transaction.pay_status);
        const resolvedCheckoutId = transaction.cheque_id || checkoutId;

        if (normalized === "failed") {
          clearRememberedCheckoutSession();
          router.replace(`/payment/cancel?cheque_id=${encodeURIComponent(resolvedCheckoutId)}`);
          return;
        }

        if (normalized === "success") {
          await refreshUser().catch(() => null);
          if (cancelled) {
            return;
          }
          clearRememberedCheckoutSession();
          setStage("success");
          return;
        }
      } catch {
        // Continue polling on transient provider errors.
      }

      if (attempt >= MAX_POLLS - 1) {
        setStage("pending");
        return;
      }

      scheduleNextPoll(attempt);
    };

    void verify(0);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [authenticated, checkoutId, isGift, loading, refreshUser, router, user?.is_premium]);

  if (stage === "auth") {
    return (
      <PaymentStatusView
        badge="Authentication required"
        description="Checkout holatini tekshirish uchun hisobga qayta kiring."
        icon={<Crown className="h-8 w-8" />}
        tone="info"
        title="Sessiya topilmadi"
        actions={
          <>
            <Link href="/login?next=/payment/success" className={buttonStyles({ size: "lg" })}>
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

  if (stage === "checking") {
    return (
      <PaymentStatusView
        badge="Premium activation"
        description="To‘lov provayderidan qaytgan natija va subscription status tekshirilyapti."
        icon={<Loader2 className="h-8 w-8 animate-spin" />}
        meta={
          checkoutId ? (
            <span className="inline-flex rounded-full bg-black/5 px-3 py-1 text-xs text-[var(--muted-foreground)]">
              Session: {checkoutId}
            </span>
          ) : null
        }
        tone="pending"
        title="Premium faollashmoqda"
      />
    );
  }

  if (stage === "pending") {
    return (
      <PaymentStatusView
        badge="Premium pending"
        description="To‘lov muvaffaqiyatli bo‘lgan bo‘lishi mumkin, lekin webhook yoki status reconciliation hali yakunlanmagan."
        icon={<RefreshCw className="h-8 w-8" />}
        meta={
          checkoutId ? (
            <span className="inline-flex rounded-full bg-black/5 px-3 py-1 text-xs text-[var(--muted-foreground)]">
              Session: {checkoutId}
            </span>
          ) : null
        }
        tone="info"
        title="Holat hali tasdiqlanmadi"
        actions={
          <>
            <Link
              href={checkoutId ? `/payment/pending?cheque_id=${encodeURIComponent(checkoutId)}` : "/payment/pending"}
              className={buttonStyles({ size: "lg" })}
            >
              Qayta tekshirish
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
      badge="Premium activated"
      description={
        isGift
          ? "Promo code plan narxini to‘liq yopdi va premium darhol aktivlashtirildi."
          : "Subscription tasdiqlandi. Endi premium analytics, simulation va extended review oqimlari ochiq."
      }
      icon={<CheckCircle2 className="h-8 w-8" />}
      tone="success"
      title="Premium faol"
      actions={
        <>
          <Link href="/dashboard" className={buttonStyles({ size: "lg" })}>
            Dashboard
          </Link>
          <Link href="/analytics" className={buttonStyles({ size: "lg", variant: "outline" })}>
            Analytics
          </Link>
        </>
      }
    >
      <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-700">
        Premium rejim faollashgach javob tahlili, kengaytirilgan analytics va yuqori limitli practice oqimlari shu hisobda ishlaydi.
      </div>
    </PaymentStatusView>
  );
}
