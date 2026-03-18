import type { NormalizedPaymentStatus } from "@/types/payment";

const CHECKOUT_SESSION_STORAGE_KEY = "autotest.checkout.session";

type SearchParamsLike = {
  get: (key: string) => string | null;
};

function normalizeString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function rememberCheckoutSession(sessionId: string | null | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeString(sessionId);
  if (!normalized) {
    return;
  }

  window.localStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, normalized);
}

export function getRememberedCheckoutSession() {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeString(window.localStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY));
}

export function clearRememberedCheckoutSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
}

export function resolveCheckoutSessionId(searchParams: SearchParamsLike | null | undefined) {
  return (
    normalizeString(searchParams?.get("cheque_id")) ??
    normalizeString(searchParams?.get("session_id")) ??
    normalizeString(searchParams?.get("transaction_id")) ??
    getRememberedCheckoutSession()
  );
}

export function normalizePaymentStatus(status: string | null | undefined): NormalizedPaymentStatus {
  switch ((status ?? "").trim().toLowerCase()) {
    case "success":
    case "paid":
    case "succeeded":
      return "success";
    case "failed":
    case "error":
    case "canceled":
    case "cancelled":
    case "declined":
      return "failed";
    default:
      return "pending";
  }
}
