"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { CircleX, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PaymentStatusView } from "@/components/payments/PaymentStatusView";
import { clearRememberedCheckoutSession, resolveCheckoutSessionId } from "@/lib/payments";

const copy = {
  badge: "TsPay Checkout",
  title: "To'lov bekor qilindi",
  description: "Premium olish uchun yana urinib ko'rishingiz mumkin",
  retry: "Tariflarga qaytish",
  dashboard: "Dashboard ga qaytish",
  metaLabel: "Oxirgi chek",
  hint: "Agar to'lov oynasi tasodifan yopilgan bo'lsa, checkout jarayonini tariflar sahifasidan qayta boshlashingiz mumkin.",
};

export default function CancelContent() {
  const searchParams = useSearchParams();
  const chequeId = useMemo(() => resolveCheckoutSessionId(searchParams), [searchParams]);

  useEffect(() => {
    clearRememberedCheckoutSession();
  }, []);

  return (
    <PaymentStatusView
      tone="cancel"
      badge={copy.badge}
      title={copy.title}
      description={copy.description}
      icon={<CircleX className="h-10 w-10" />}
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
            <Link href="/pricing">
              <RotateCcw className="h-4 w-4" />
              {copy.retry}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl border-white/15 bg-slate-900/40 text-white hover:bg-slate-900/70">
            <Link href="/dashboard">{copy.dashboard}</Link>
          </Button>
        </>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm leading-6 text-slate-300">
        {copy.hint}
      </div>
    </PaymentStatusView>
  );
}
