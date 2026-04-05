"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { forgotPassword, resetPassword } from "@/lib/auth";
import { getErrorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await forgotPassword({ email: email.trim() });
      setStep("reset");
      setSuccess("Agar hisob mavjud bo'lsa, emailga tiklash kodi yuborildi.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("Yangi parol kamida 8 belgidan iborat bo'lishi kerak.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Parollar mos emas.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        email: email.trim(),
        code: code.trim(),
        new_password: newPassword,
      });
      setSuccess("Parol yangilandi. Endi yangi parol bilan kirishingiz mumkin.");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-8">
      <div className="w-full rounded-2xl border border-[#1F2A44] bg-[#0B1324] p-6 shadow-[0_12px_36px_rgba(2,8,23,0.45)]">
        <h1 className="text-2xl font-semibold text-white">Parolni tiklash</h1>
        <p className="mt-2 text-sm text-slate-300">
          {step === "request"
            ? "Elektron pochtangizni kiriting. Tiklash kodi emailga yuboriladi."
            : "Emailga kelgan 6 xonali kodni kiriting va yangi parol o'rnating."}
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        {step === "request" ? (
          <form className="mt-6 space-y-4" onSubmit={handleRequest}>
            <label className="block text-sm font-medium text-slate-200" htmlFor="forgot-email">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#243556] bg-[#101b31] pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
                placeholder="email@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Yuborilmoqda..." : "Tiklash kodini yuborish"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleReset}>
            <label className="block text-sm font-medium text-slate-200" htmlFor="reset-email">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#243556] bg-[#101b31] pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
                placeholder="email@example.com"
              />
            </div>

            <label className="block text-sm font-medium text-slate-200" htmlFor="reset-code">
              Tasdiqlash kodi
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="reset-code"
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#243556] bg-[#101b31] pl-9 pr-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
                placeholder="123456"
              />
            </div>

            <label className="block text-sm font-medium text-slate-200" htmlFor="new-password">
              Yangi parol
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#243556] bg-[#101b31] pl-3 pr-11 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
                placeholder="Kamida 8 belgi"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <label className="block text-sm font-medium text-slate-200" htmlFor="confirm-password">
              Parolni tasdiqlang
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#243556] bg-[#101b31] pl-3 pr-11 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
                placeholder="Parolni qayta kiriting"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => setShowConfirm((prev) => !prev)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-sky-400 to-emerald-400 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Saqlanmoqda..." : "Yangi parolni saqlash"}
            </button>

            <button
              type="button"
              className="h-11 w-full rounded-xl border border-[#243556] bg-[#101b31] text-sm font-medium text-slate-200 transition hover:bg-[#14223c]"
              onClick={() => {
                setStep("request");
                setCode("");
                setNewPassword("");
                setConfirmPassword("");
                setError(null);
                setSuccess(null);
              }}
            >
              Kodni qayta yuborish
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kirish sahifasiga qaytish
        </Link>
      </div>
    </div>
  );
}
