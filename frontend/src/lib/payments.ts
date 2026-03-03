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
  RedeemPromoPayload,
  RedeemPromoResponse,
} from "@/schemas/payment.schema";

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
