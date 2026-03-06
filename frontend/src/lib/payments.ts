/**
 * AUTOTEST Payments API
 * Functions for payment checkout session flow.
 */

import Cookies from "js-cookie";
import { useAuth } from "@/store/useAuth";

import {
  CheckoutPlan,
  CheckoutQuoteResponse,
  CheckoutResponse,
  CreateCheckoutSessionPayload,
  PaymentTransactionStatusResponse,
  RedeemPromoPayload,
  RedeemPromoResponse,
} from "@/schemas/payment.schema";

const LAST_CHECKOUT_SESSION_STORAGE_KEY = "autotest:last-checkout-session";
const PREMIUM_ACTIVATION_BANNER_STORAGE_KEY = "autotest:premium-activation-banner";
const CHECKOUT_SESSION_TTL_MS = 1000 * 60 * 60 * 24;

type SearchParamReader = {
  get: (name: string) => string | null;
};

function getAuthHeaders(): Record<string, string> {
  const token = useAuth.getState().token ?? Cookies.get("access_token");
  if (!token) {
    return {
      "Content-Type": "application/json",
    };
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function getErrorDetail(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof (payload as { detail: unknown }).detail === "string"
  ) {
    return (payload as { detail: string }).detail;
  }
  return fallback;
}

export function rememberCheckoutSession(sessionId: string): void {
  if (!canUseSessionStorage()) return;

  const normalized = sessionId.trim();
  if (!normalized) return;

  window.sessionStorage.setItem(
    LAST_CHECKOUT_SESSION_STORAGE_KEY,
    JSON.stringify({
      sessionId: normalized,
      savedAt: Date.now(),
    })
  );
}

export function getRememberedCheckoutSession(): string | null {
  if (!canUseSessionStorage()) return null;

  const raw = window.sessionStorage.getItem(LAST_CHECKOUT_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { sessionId?: unknown; savedAt?: unknown };
    const sessionId =
      typeof parsed.sessionId === "string" ? parsed.sessionId.trim() : "";
    const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : 0;

    if (!sessionId) {
      window.sessionStorage.removeItem(LAST_CHECKOUT_SESSION_STORAGE_KEY);
      return null;
    }

    if (savedAt > 0 && Date.now() - savedAt > CHECKOUT_SESSION_TTL_MS) {
      window.sessionStorage.removeItem(LAST_CHECKOUT_SESSION_STORAGE_KEY);
      return null;
    }

    return sessionId;
  } catch {
    window.sessionStorage.removeItem(LAST_CHECKOUT_SESSION_STORAGE_KEY);
    return null;
  }
}

export function clearRememberedCheckoutSession(): void {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.removeItem(LAST_CHECKOUT_SESSION_STORAGE_KEY);
}

export function resolveCheckoutSessionId(
  searchParams?: SearchParamReader | null
): string | null {
  const candidates = [
    "cheque_id",
    "session_id",
    "transaction_id",
    "payment_id",
    "id",
    "chequeId",
    "sessionId",
    "transactionId",
  ];

  for (const key of candidates) {
    const value = searchParams?.get(key)?.trim();
    if (value) return value;
  }

  return getRememberedCheckoutSession();
}

export function markPremiumActivationBanner(): void {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(PREMIUM_ACTIVATION_BANNER_STORAGE_KEY, "1");
}

export function consumePremiumActivationBanner(): boolean {
  if (!canUseSessionStorage()) return false;
  const exists =
    window.sessionStorage.getItem(PREMIUM_ACTIVATION_BANNER_STORAGE_KEY) === "1";
  if (exists) {
    window.sessionStorage.removeItem(PREMIUM_ACTIVATION_BANNER_STORAGE_KEY);
  }
  return exists;
}

export function normalizePaymentStatus(
  payStatus: string | null | undefined
): "success" | "pending" | "failed" | "unknown" {
  const normalized = (payStatus ?? "").trim().toLowerCase();

  if (["success", "paid", "succeeded", "completed"].includes(normalized)) {
    return "success";
  }
  if (
    ["failed", "error", "canceled", "cancelled", "declined"].includes(normalized)
  ) {
    return "failed";
  }
  if (
    ["created", "pending", "processing", "waiting", "in_progress", "new"].includes(
      normalized
    )
  ) {
    return "pending";
  }
  return "unknown";
}

/**
 * Create a TSPay checkout session through Next.js backend route.
 */
export async function createCheckoutSession(
  payload?: CreateCheckoutSessionPayload
): Promise<CheckoutResponse> {
  const response = await fetch("/api/payments/create-session", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload ?? {}),
    credentials: "include",
    cache: "no-store",
  });

  let responsePayload: unknown = null;
  try {
    responsePayload = await response.json();
  } catch {
    responsePayload = null;
  }

  if (!response.ok) {
    const detail =
      responsePayload &&
      typeof responsePayload === "object" &&
      "detail" in responsePayload &&
      typeof (responsePayload as { detail: unknown }).detail === "string"
        ? (responsePayload as { detail: string }).detail
        : "Unable to initialize checkout session.";
    throw new Error(detail);
  }

  const body = responsePayload as {
    checkout_url?: unknown;
    session_id?: unknown;
    provider?: unknown;
  };

  if (
    typeof body.checkout_url !== "string" ||
    typeof body.session_id !== "string" ||
    typeof body.provider !== "string"
  ) {
    throw new Error("Invalid checkout session response.");
  }

  rememberCheckoutSession(body.session_id);

  return {
    checkout_url: body.checkout_url,
    session_id: body.session_id,
    provider: body.provider,
  };
}

/**
 * Redirect user to hosted checkout.
 */
export async function redirectToCheckout(
  payload?: CreateCheckoutSessionPayload
): Promise<void> {
  const { checkout_url } = await createCheckoutSession(payload);

  if (typeof window !== "undefined" && checkout_url) {
    window.location.href = checkout_url;
  }
}

export async function getAvailableCheckoutPlans(): Promise<CheckoutPlan[]> {
  const response = await fetch("/api/payments/plans", {
    method: "GET",
    cache: "no-store",
  });

  let payload: unknown = [];
  try {
    payload = await response.json();
  } catch {
    payload = [];
  }

  if (!response.ok) {
    const detail =
      payload &&
      typeof payload === "object" &&
      "detail" in payload &&
      typeof (payload as { detail: unknown }).detail === "string"
        ? (payload as { detail: string }).detail
        : "Unable to load subscription plans.";
    throw new Error(detail);
  }

  if (!Array.isArray(payload)) {
    throw new Error("Invalid plans response.");
  }

  return payload as CheckoutPlan[];
}

export async function getCheckoutQuote(
  payload?: CreateCheckoutSessionPayload
): Promise<CheckoutQuoteResponse> {
  const response = await fetch("/api/payments/quote", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload ?? {}),
    credentials: "include",
    cache: "no-store",
  });

  let responsePayload: unknown = null;
  try {
    responsePayload = await response.json();
  } catch {
    responsePayload = null;
  }

  if (!response.ok) {
    const detail =
      responsePayload &&
      typeof responsePayload === "object" &&
      "detail" in responsePayload &&
      typeof (responsePayload as { detail: unknown }).detail === "string"
        ? (responsePayload as { detail: string }).detail
        : "Promokod tekshirish muvaffaqiyatsiz tugadi.";
    throw new Error(detail);
  }

  const body = responsePayload as CheckoutQuoteResponse | null;
  if (
    !body ||
    typeof body.base_amount_cents !== "number" ||
    typeof body.final_amount_cents !== "number" ||
    typeof body.currency !== "string"
  ) {
    throw new Error("Invalid quote response.");
  }

  return body;
}

export async function redeemPromoGift(
  payload: RedeemPromoPayload
): Promise<RedeemPromoResponse> {
  const response = await fetch("/api/payments/redeem-promo", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
    credentials: "include",
    cache: "no-store",
  });

  let responsePayload: unknown = null;
  try {
    responsePayload = await response.json();
  } catch {
    responsePayload = null;
  }

  if (!response.ok) {
    const detail =
      responsePayload &&
      typeof responsePayload === "object" &&
      "detail" in responsePayload &&
      typeof (responsePayload as { detail: unknown }).detail === "string"
        ? (responsePayload as { detail: string }).detail
        : "Promokodni sovg'a sifatida qo'llashda xatolik yuz berdi.";
    throw new Error(detail);
  }

  const body = responsePayload as RedeemPromoResponse | null;
  if (!body || body.activated !== true || typeof body.plan_name !== "string") {
    throw new Error("Invalid redeem promo response.");
  }

  return body;
}

export async function getTransactionStatus(
  chequeId: string
): Promise<PaymentTransactionStatusResponse> {
  const normalizedChequeId = chequeId.trim();
  if (!normalizedChequeId) {
    throw new Error("Transaction identifier is required.");
  }

  const response = await fetch(
    `/api/payments/transactions/${encodeURIComponent(normalizedChequeId)}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      credentials: "include",
      cache: "no-store",
    }
  );

  let responsePayload: unknown = null;
  try {
    responsePayload = await response.json();
  } catch {
    responsePayload = null;
  }

  if (!response.ok) {
    throw new Error(
      getErrorDetail(responsePayload, "To'lov holatini tekshirib bo'lmadi.")
    );
  }

  const body = responsePayload as PaymentTransactionStatusResponse | null;
  if (
    !body ||
    typeof body.cheque_id !== "string" ||
    typeof body.provider !== "string"
  ) {
    throw new Error("Invalid transaction status response.");
  }

  return {
    cheque_id: body.cheque_id,
    transaction_id:
      typeof body.transaction_id === "string" ? body.transaction_id : null,
    pay_status: typeof body.pay_status === "string" ? body.pay_status : null,
    amount: typeof body.amount === "number" ? body.amount : null,
    provider: body.provider,
    raw:
      body.raw && typeof body.raw === "object"
        ? (body.raw as Record<string, unknown>)
        : null,
  };
}
