import { apiRequest } from "@/api/client";
import { rememberCheckoutSession } from "@/lib/payment-session";
import type {
  CheckoutQuote,
  CreatePaymentSessionPayload,
  CreatePaymentSessionResponse,
  PaymentTransactionStatus,
  RedeemPromoPayload,
  RedeemPromoResponse,
  SubscriptionPlan,
} from "@/types/payment";

const SAME_ORIGIN_API_BASE = "/";

export function getCheckoutPlans() {
  return apiRequest<SubscriptionPlan[]>("/api/payments/plans", {
    method: "GET",
    baseUrl: SAME_ORIGIN_API_BASE,
    retryOnAuth: false,
  });
}

export function getCheckoutQuote(payload: CreatePaymentSessionPayload) {
  return apiRequest<CheckoutQuote>("/api/payments/quote", {
    method: "POST",
    body: payload,
    baseUrl: SAME_ORIGIN_API_BASE,
  });
}

export function createCheckoutSession(payload: CreatePaymentSessionPayload) {
  return apiRequest<CreatePaymentSessionResponse>("/api/payments/create-session", {
    method: "POST",
    body: payload,
    baseUrl: SAME_ORIGIN_API_BASE,
  });
}

export function redeemPromo(payload: RedeemPromoPayload) {
  return apiRequest<RedeemPromoResponse>("/api/payments/redeem-promo", {
    method: "POST",
    body: payload,
    baseUrl: SAME_ORIGIN_API_BASE,
  });
}

export function getTransactionStatus(chequeId: string) {
  return apiRequest<PaymentTransactionStatus>(`/api/payments/transactions/${encodeURIComponent(chequeId)}`, {
    method: "GET",
    baseUrl: SAME_ORIGIN_API_BASE,
  });
}

export async function redirectToCheckout(payload: CreatePaymentSessionPayload) {
  const session = await createCheckoutSession(payload);
  rememberCheckoutSession(session.session_id);
  if (typeof window !== "undefined") {
    window.location.assign(session.checkout_url);
  }
  return session;
}
