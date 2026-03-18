"use client";

import Link from "next/link";
import { ArrowRight, Mail, MailCheck, RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { resendVerification, verifyEmail } from "@/api/auth";
import { AuthShell } from "@/features/auth/auth-shell";
import { useUser } from "@/hooks/use-user";
import { Input } from "@/shared/ui/input";

export function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, loading } = useUser();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    searchParams.get("message") ?? "Emailingizga yuborilgan 6 xonali kodni kiriting.",
  );

  const nextHref = useMemo(() => searchParams.get("next") || "/login?verified=1", [searchParams]);

  useEffect(() => {
    if (!loading && authenticated) {
      router.replace("/dashboard");
    }
  }, [authenticated, loading, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await verifyEmail({ email, code });
      setMessage(response.message);
      router.replace(nextHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tasdiqlash amalga oshmadi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);

    try {
      const response = await resendVerification(email);
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod qayta yuborilmadi.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Email tasdiqlash"
      description="Ro'yxatdan o'tishni yakunlash uchun verifikatsiya kodini kiriting."
      footer={
        <p>
          Hisobingiz tayyormi?{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)]">
            Login sahifasiga qaytish
          </Link>
        </p>
      }
    >
      {message ? (
        <div className="auth-notice auth-notice-info">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="auth-notice auth-notice-error">
          <p className="font-medium">Tasdiqlash xatosi</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{error}</p>
        </div>
      ) : null}

      <form className="auth-form-stack" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="verify-email" className="auth-label">
            Email
          </label>
          <div className="auth-field-shell">
            <Mail className="auth-field-icon" />
            <Input
              id="verify-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="sizning@email.com"
              className="auth-field-input pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="verify-code" className="auth-label">
            Tasdiqlash kodi
          </label>
          <div className="auth-field-shell">
            <MailCheck className="auth-field-icon" />
            <Input
              id="verify-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="auth-field-input pl-10 tracking-[0.35em]"
              required
            />
          </div>
        </div>

        <button type="submit" className="auth-action auth-action-primary w-full" disabled={submitting || code.length !== 6}>
          <span>{submitting ? "Tasdiqlanmoqda..." : "Tasdiqlash"}</span>
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </button>
      </form>

      <button
        type="button"
        className="auth-action auth-action-secondary w-full"
        onClick={() => void handleResend()}
        disabled={resending || !email}
      >
        <RotateCw className="h-4 w-4" />
        {resending ? "Qayta yuborilmoqda..." : "Kodni qayta yuborish"}
      </button>
    </AuthShell>
  );
}
