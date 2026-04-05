import Link from "next/link";

import { buttonStyles } from "@/shared/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-lg rounded-[1.75rem] border border-[var(--border)] bg-white p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted-foreground)]">404</p>
        <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Sahifa topilmadi
        </h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          Qidirilgan route frontend App Router ichida mavjud emas.
        </p>
        <div className="mt-6">
          <Link href="/dashboard" className={buttonStyles()}>
            Dashboard ga qaytish
          </Link>
        </div>
      </div>
    </div>
  );
}
