"use client";

import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { register } from "@/api/auth";
import { AuthShell } from "@/features/auth/auth-shell";
import { useUser } from "@/hooks/use-user";
import { Input } from "@/shared/ui/input";
import { Progress } from "@/shared/ui/progress";

function getPasswordStrength(password: string) {
  let strength = 0;
  if (password.length >= 8) strength += 35;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[0-9]/.test(password)) strength += 20;
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  return Math.min(strength, 100);
}

export function RegisterPage() {
  const router = useRouter();
  const { authenticated, loading } = useUser();
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

  const passwordStrength = getPasswordStrength(password);
  const strengthMeta = useMemo(() => {
    if (passwordStrength < 40) {
      return { label: "Zaif", className: "bg-rose-500" };
    }
    if (passwordStrength < 75) {
      return { label: "O'rtacha", className: "bg-amber-500" };
    }
    return { label: "Kuchli", className: "bg-emerald-500" };
  }, [passwordStrength]);

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

  return (
    <AuthShell
      title="Ro'yxatdan o'tish"
      description="Yangi hisob yarating va dashboard, practice va simulation modullariga kiring."
      footer={
        <p>
          Allaqachon hisobingiz bormi?{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)]">
            Kirish
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="auth-notice auth-notice-error">
          <p className="font-medium">Ro&apos;yxatdan o&apos;tish xatosi</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{error}</p>
        </div>
      ) : null}

      <form className="auth-form-stack" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="register-email" className="auth-label">
            Email
          </label>
          <div className="auth-field-shell">
            <Mail className="auth-field-icon" />
            <Input
              id="register-email"
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
          <label htmlFor="register-password" className="auth-label">
            Parol
          </label>
          <div className="auth-field-shell">
            <Lock className="auth-field-icon" />
            <Input
              id="register-password"
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
          {password ? (
            <div className="auth-progress-panel space-y-2">
              <Progress value={passwordStrength} indicatorClassName={strengthMeta.className} />
              <p className="text-xs text-[var(--muted-foreground)]">Parol kuchi: {strengthMeta.label}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="register-confirm-password" className="auth-label">
            Parolni tasdiqlash
          </label>
          <div className="auth-field-shell">
            <Lock className="auth-field-icon" />
            <Input
              id="register-confirm-password"
              type="password"
              placeholder="Parolni qayta kiriting"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="auth-field-input pl-10 pr-10"
              minLength={8}
              required
            />
            {confirmPassword && confirmPassword === password ? (
              <Check className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
            ) : null}
          </div>
        </div>

        <label className="auth-consent-row">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(event) => setAgreeTerms(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[var(--border)] bg-transparent"
          />
          <span className="text-[var(--muted-foreground)]">
            Foydalanish shartlari va maxfiylik siyosatiga roziman.
          </span>
        </label>

        <button type="submit" className="auth-action auth-action-primary w-full" disabled={submitting || !agreeTerms}>
          <span>{submitting ? "Yuborilmoqda..." : "Ro'yxatdan o'tish"}</span>
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </button>
      </form>
    </AuthShell>
  );
}
