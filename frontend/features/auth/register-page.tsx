"use client";

import { ArrowRight, Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { register } from "@/api/auth";
import { AuthShell } from "@/features/auth/auth-shell";
import { GoogleAuthButton } from "@/features/auth/google-auth-button";
import { useUser } from "@/hooks/use-user";
import { Input } from "@/shared/ui/input";

export function RegisterPage() {
  const router = useRouter();
  const { authenticated, loading, refreshUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && authenticated) {
      router.replace("/dashboard");
    }
  }, [authenticated, loading, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Parollar mos kelmadi.");
      return;
    }

    if (!agreeTerms) {
      setError("Ro'yxatdan o'tish uchun foydalanish shartlariga rozilik kerak.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await register({ email, password });
      if (response.message.toLowerCase().includes("tasdiqlash")) {
        router.replace(`/verify?email=${encodeURIComponent(email)}`);
      } else {
        router.replace("/login?registered=1");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuthenticated = async () => {
    setError(null);
    await refreshUser();
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <AuthShell
      mode="register"
      title="Ro'yxatdan o'tish"
      description="Yangi hisob yarating va tayyorgarlikni boshlang."
    >
      {error ? (
        <div className="auth-notice auth-notice-error">
          <p className="font-medium">Ro&apos;yxatdan o&apos;tish xatosi</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{error}</p>
        </div>
      ) : null}

      <form className="lovable-auth-form" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="register-email" className="lovable-auth-label">
            Email
          </label>
          <div className="lovable-field-shell group">
            <Mail className="lovable-field-icon" />
            <Input
              id="register-email"
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
          <label htmlFor="register-password" className="lovable-auth-label">
            Parol
          </label>
          <div className="lovable-field-shell group">
            <Lock className="lovable-field-icon" />
            <Input
              id="register-password"
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

        <div className="space-y-2">
          <label htmlFor="register-confirm-password" className="lovable-auth-label">
            Parolni tasdiqlang
          </label>
          <div className="lovable-field-shell group">
            <Lock className="lovable-field-icon" />
            <Input
              id="register-confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="lovable-field-input lovable-field-input-password"
              minLength={8}
              required
            />
            {confirmPassword && confirmPassword === password ? (
              <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
            ) : null}
          </div>
        </div>

        <label className="lovable-consent-row">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(event) => setAgreeTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[var(--border)] bg-[var(--input)] accent-[oklch(0.72_0.17_235)]"
          />
          <span className="text-[var(--muted-foreground)]">
            Foydalanish shartlari bilan{" "}
            <span className="text-[var(--foreground)] underline-offset-2 hover:underline">
              roziman
            </span>
          </span>
        </label>

        <button type="submit" className="lovable-primary-button group" disabled={submitting || !agreeTerms}>
          <span>{submitting ? "Yuborilmoqda..." : "Ro'yxatdan o'tish"}</span>
          {!submitting ? <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
        </button>
      </form>

      <div className="lovable-auth-divider">
        <span className="h-px flex-1 bg-[var(--border)]" />
        YOKI
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <GoogleAuthButton
        mode="register"
        onAuthenticated={handleGoogleAuthenticated}
        onError={(message) => setError(message || null)}
      />
    </AuthShell>
  );
}
