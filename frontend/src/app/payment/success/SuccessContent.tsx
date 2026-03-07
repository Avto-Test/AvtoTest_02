"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
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

type SuccessStage = "checking" | "success" | "fallback";

const copy = {
  badge: "TsPay Success",
  checkingTitle: "To'lov muvaffaqiyatli amalga oshirildi",
  checkingDescription: "Premium obuna faollashtirilmoqda",
  successTitle: "Premium obuna faollashtirildi",
  successDescription: "Barcha premium funksiyalar endi siz uchun ochiq. Dashboard orqali yangi imkoniyatlarni ko'rishingiz mumkin.",
  fallbackTitle: "To'lov holati aniqlanmoqda",
  fallbackDescription: "Qaytgan javob hali yakuniy emas. Holatni qayta tekshirish yoki dashboardga o'tish mumkin.",
  dashboard: "Dashboard ga o'tish",
  tests: "Testlarni boshlash",
  pending: "Holatni qayta tekshirish",
  metaLabel: "Chek identifikatori",
  successNote: "Premium analytics, cheksiz testlar va qo'shimcha imkoniyatlar faollashdi.",
};

export default function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, hydrated, fetchUser } = useAuth();
  const [stage, setStage] = useState<SuccessStage>("checking");
  const [chequeId, setChequeId] = useState<string | null>(null);

  const fallbackRoute = useMemo(() => {
    if (!chequeId) return "/payment/pending";
    return `/payment/pending?cheque_id=${encodeURIComponent(chequeId)}`;
  }, [chequeId]);

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      const resolvedChequeId = resolveCheckoutSessionId(searchParams);
      if (!cancelled) {
        setChequeId(resolvedChequeId);
      }

      if (hydrated && token) {
        await fetchUser().catch(() => undefined);
        if (cancelled) return;

        if (useAuth.getState().user?.plan === "premium") {
          markPremiumActivationBanner();
          clearRememberedCheckoutSession();
          setStage("success");
          return;
        }
      }

      if (!resolvedChequeId) {
        if (!cancelled) {
          setStage("fallback");
        }
        return;
      }

      try {
        const transaction = await getTransactionStatus(resolvedChequeId);
        if (cancelled) return;

        const normalizedStatus = normalizePaymentStatus(transaction.pay_status);
        const normalizedChequeId = transaction.cheque_id || resolvedChequeId;
        setChequeId(normalizedChequeId);

        if (normalizedStatus === "success") {
          if (hydrated && token) {
            await fetchUser().catch(() => undefined);
            if (cancelled) return;

            if (useAuth.getState().user?.plan !== "premium") {
              router.replace(`/payment/pending?cheque_id=${encodeURIComponent(normalizedChequeId)}`);
              return;
            }
          }

          markPremiumActivationBanner();
          clearRememberedCheckoutSession();
          setStage("success");
          return;
        }

        if (normalizedStatus === "failed") {
          clearRememberedCheckoutSession();
          router.replace(`/payment/cancel?cheque_id=${encodeURIComponent(normalizedChequeId)}`);
          return;
        }

        router.replace(`/payment/pending?cheque_id=${encodeURIComponent(normalizedChequeId)}`);
      } catch {
        if (!cancelled) {
          setStage("fallback");
        }
      }
    };

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [fetchUser, hydrated, router, searchParams, token]);

  if (stage === "checking") {
    return (
      <PaymentStatusView
        tone="pending"
        badge={copy.badge}
        title={copy.checkingTitle}
        description={copy.checkingDescription}
        icon={<Loader2 className="h-10 w-10 animate-spin" />}
        meta={
          chequeId ? (
            <div className="inline-flex rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
              {copy.metaLabel}: {chequeId}
            </div>
          ) : null
        }
      />
    );
  }

  if (stage === "fallback") {
    return (
      <PaymentStatusView
        tone="info"
        badge={copy.badge}
        title={copy.fallbackTitle}
        description={copy.fallbackDescription}
        icon={<Sparkles className="h-10 w-10" />}
        meta={
          chequeId ? (
            <div className="inline-flex rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
              {copy.metaLabel}: {chequeId}
            </div>
          ) : null
        }
        actions={
          <>
            <Button asChild size="lg" className="rounded-xl bg-white text-slate-950 hover:bg-white/90">
              <Link href={fallbackRoute}>{copy.pending}</Link>
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
      tone="success"
      badge={copy.badge}
      title={copy.successTitle}
      description={copy.successDescription}
      icon={<CheckCircle2 className="h-10 w-10" />}
      meta={
        chequeId ? (
          <div className="inline-flex rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
            {copy.metaLabel}: {chequeId}
          </div>
        ) : null
      }
      actions={
        <>
          <Button asChild size="lg" className="rounded-xl bg-white text-slate-950 hover:bg-white/90">
            <Link href="/dashboard">{copy.dashboard}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl border-white/15 bg-slate-900/40 text-white hover:bg-slate-900/70">
            <Link href="/tests">{copy.tests}</Link>
          </Button>
        </>
      }
    >
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-center text-sm leading-6 text-emerald-100">
        {copy.successNote}
      </div>
    </PaymentStatusView>
  );
}
