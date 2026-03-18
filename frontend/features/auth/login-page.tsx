"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { login } from "@/api/auth";
import { AuthShell } from "@/features/auth/auth-shell";
import { useUser } from "@/hooks/use-user";
import { Input } from "@/shared/ui/input";

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, loading, refreshUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextHref = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);
  const registered = searchParams.get("registered") === "1";
  const verified = searchParams.get("verified") === "1";

  useEffect(() => {
    if (!loading && authenticated) {
      router.replace(nextHref);
    }
  }, [authenticated, loading, nextHref, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email, password });
      await refreshUser();
      router.replace(nextHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email yoki parol noto'g'ri.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Xush kelibsiz"
      description="Hisobingizga kiring va AUTOTEST paneliga o'ting."
    >
      {registered ? (
        <div className="auth-notice auth-notice-success">
          Ro&apos;yxatdan o&apos;tish yakunlandi. Login qilishdan oldin email tasdiqlash talab qilinishi mumkin.
        </div>
      ) : null}

      {verified ? (
        <div className="auth-notice auth-notice-success">
          Email tasdiqlandi. Endi hisobingizga kirishingiz mumkin.
        </div>
      ) : null}

      {error ? (
        <div className="auth-notice auth-notice-error">
          <p className="font-medium">Kirish muvaffaqiyatsiz</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{error}</p>
        </div>
      ) : null}

      <form className="auth-form-stack" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="login-email" className="auth-label">
            Email
          </label>
          <div className="auth-field-shell">
            <Mail className="auth-field-icon" />
            <Input
              id="login-email"
              type="email"
              placeholder="sizning@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-field-input pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="login-password" className="auth-label">
            Parol
          </label>
          <div className="auth-field-shell">
            <Lock className="auth-field-icon" />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Kamida 8 ta belgi"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-field-input pl-10 pr-11"
              minLength={8}
              required
            />
            <button
              type="button"
              className="auth-field-toggle"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="auth-action-row">
          <button type="submit" className="auth-action auth-action-primary" disabled={submitting}>
            <span>{submitting ? "Kirilmoqda..." : "Kirish"}</span>
            {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
          <Link href="/register" className="auth-action auth-action-secondary">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </div>

        <Link href="/verify" className="auth-action auth-action-tertiary">
          Emailni tasdiqlash
        </Link>
      </form>
    </AuthShell>
  );
}
