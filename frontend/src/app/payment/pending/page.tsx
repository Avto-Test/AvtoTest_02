"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PaymentStatusView } from "@/components/payments/PaymentStatusView";
import {
  clearRememberedCheckoutSession,
  getTransactionStatus,
  markPremiumActivationBanner,
  normalizePaymentStatus,
  resolveCheckoutSessionId,
} from "@/lib/payments";
import { useAuth } from "@/store/useAuth";

const copy = {
  badge: "TsPay Processing",
  title: "To'lov tasdiqlanishi kutilmoqda",
  description: "Premium obuna faollashuvi har 3 soniyada avtomatik tekshiriladi",
  dashboard: "Dashboard ga qaytish",
  pricing: "Tariflarga qaytish",
  metaLabel: "Kuzatilayotgan chek",
  support: "Webhook yoki reconciliation bir necha soniya kechiksa ham sahifani yopmang.",
  missingTitle: "To'lov identifikatori topilmadi",
  missingDescription: "Holatni tekshirish uchun chek identifikatori kerak. Tariflar sahifasidan qayta urinib ko'ring.",
};

export default function PaymentPendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, hydrated, fetchUser } = useAuth();
  const [pollCount, setPollCount] = useState(0);

  const chequeId = useMemo(() => resolveCheckoutSessionId(searchParams), [searchParams]);
  const isMissingChequeId = !chequeId;

  useEffect(() => {
    if (!chequeId) return undefined;

    let cancelled = false;
    let timeoutId: number | null = null;

    const scheduleNextPoll = () => {
      if (cancelled) return;
      timeoutId = window.setTimeout(() => {
        void pollPayment();
      }, 3000);
    };

    const pollPayment = async () => {
      setPollCount((count) => count + 1);

      if (hydrated && token) {
        await fetchUser().catch(() => undefined);
        if (cancelled) return;

        if (useAuth.getState().user?.plan === "premium") {
          markPremiumActivationBanner();
          clearRememberedCheckoutSession();
          router.replace(`/payment/success?cheque_id=${encodeURIComponent(chequeId)}`);
          return;
        }
      }

      try {
        const transaction = await getTransactionStatus(chequeId);
        if (cancelled) return;

        const normalizedStatus = normalizePaymentStatus(transaction.pay_status);
        const resolvedChequeId = transaction.cheque_id || chequeId;

        if (normalizedStatus === "success") {
          markPremiumActivationBanner();
          router.replace(`/payment/success?cheque_id=${encodeURIComponent(resolvedChequeId)}`);
          return;
        }

        if (normalizedStatus === "failed") {
          clearRememberedCheckoutSession();
          router.replace(`/payment/cancel?cheque_id=${encodeURIComponent(resolvedChequeId)}`);
          return;
        }
      } catch {
        // Ignore transient provider / network failures and continue polling.
      }

      scheduleNextPoll();
    };

    void pollPayment();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [chequeId, fetchUser, hydrated, router, token]);

  if (isMissingChequeId) {
    return (
      <PaymentStatusView
        tone="info"
        badge={copy.badge}
        title={copy.missingTitle}
        description={copy.missingDescription}
        icon={<ShieldCheck className="h-10 w-10" />}
        actions={
          <>
            <Button asChild size="lg" className="rounded-xl bg-white text-slate-950 hover:bg-white/90">
              <Link href="/pricing">{copy.pricing}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl border-white/15 bg-slate-900/40 text-white hover:bg-slate-900/70">
              <Link href="/dashboard">{copy.dashboard}</Link>
            </Button>
          </>
        }
      />
    );
  }

  return (
    <PaymentStatusView
      tone="pending"
      badge={copy.badge}
      title={copy.title}
      description={copy.description}
      icon={<Loader2 className="h-10 w-10 animate-spin" />}
      meta={
        <div className="inline-flex rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
          {copy.metaLabel}: {chequeId}
        </div>
      }
      actions={
        <>
          <Button asChild size="lg" variant="outline" className="rounded-xl border-white/15 bg-slate-900/40 text-white hover:bg-slate-900/70">
            <Link href="/dashboard">{copy.dashboard}</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="rounded-xl text-slate-200 hover:bg-white/5 hover:text-white">
            <Link href="/pricing">{copy.pricing}</Link>
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="overflow-hidden rounded-full bg-white/10">
          <div className="h-2 w-full origin-left animate-[pulse_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm leading-6 text-slate-300">
          {pollCount >= 4
            ? "Jarayon odatdagidan biroz uzoq davom etmoqda. Premium faollashuvi hali ham tekshirilyapti."
            : copy.support}
        </div>
      </div>
    </PaymentStatusView>
  );
}
