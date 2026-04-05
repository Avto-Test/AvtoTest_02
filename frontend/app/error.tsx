"use client";

import Link from "next/link";

import { Button, buttonStyles } from "@/shared/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-lg rounded-[1.75rem] border border-rose-200 bg-white p-8 shadow-[var(--shadow-soft)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">Application error</p>
        <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Sahifa kutilmagan xatoga uchradi
        </h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          {error.message || "Xatolik tafsiloti mavjud emas."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset}>Qayta urinish</Button>
          <Link href="/dashboard" className={buttonStyles({ variant: "outline" })}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
