"use client";

import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { login } from "@/api/auth";
import { ApiError } from "@/api/client";
import { AuthShell } from "@/features/auth/auth-shell";
import { GoogleAuthButton } from "@/features/auth/google-auth-button";
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
      if (err instanceof ApiError && err.status >= 500) {
        setError("Server bilan bog'lanishda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.");
      } else {
        setError("Email yoki parol noto'g'ri");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuthenticated = async () => {
    setError(null);
    await refreshUser();
    router.replace(nextHref);
    router.refresh();
  };

  return (
    <AuthShell
      mode="login"
      title="Xush kelibsiz"
      description="Hisobingizga kiring va yo'lda davom eting."
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

      <form className="lovable-auth-form" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="login-email" className="lovable-auth-label">
            Email
          </label>
          <div className="lovable-field-shell group">
            <Mail className="lovable-field-icon" />
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="lovable-field-input"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="login-password" className="lovable-auth-label">
            Parol
          </label>
          <div className="lovable-field-shell group">
            <Lock className="lovable-field-icon" />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="lovable-field-input lovable-field-input-password"
              minLength={8}
              required
            />
            <button
              type="button"
              className="lovable-field-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">
            Parolni unutdingizmi?
          </Link>
        </div>

        <button type="submit" className="lovable-primary-button group" disabled={submitting}>
          <span>{submitting ? "Kirilmoqda..." : "Kirish"}</span>
          {!submitting ? <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
        </button>
      </form>

      <div className="lovable-auth-divider">
        <span className="h-px flex-1 bg-[var(--border)]" />
        YOKI
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <GoogleAuthButton
        mode="login"
        onAuthenticated={handleGoogleAuthenticated}
        onError={(message) => setError(message || null)}
      />
    </AuthShell>
  );
}
