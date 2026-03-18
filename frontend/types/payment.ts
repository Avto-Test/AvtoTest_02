export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  duration_days: number;
  is_active: boolean;
  sort_order: number;
}

export interface CheckoutPromoQuote {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  savings_cents: number;
}

export interface CheckoutQuote {
  plan_id: string | null;
  plan_name: string | null;
  duration_days: number;
  currency: string;
  base_amount_cents: number;
  final_amount_cents: number;
  promo: CheckoutPromoQuote | null;
}

export interface CreatePaymentSessionPayload {
  plan_id?: string;
  promo_code?: string;
}

export interface CreatePaymentSessionResponse {
  checkout_url: string;
  session_id: string;
  provider: string;
}

export interface RedeemPromoPayload {
  plan_id: string;
  promo_code: string;
}

export interface RedeemPromoResponse {
  activated: boolean;
  plan_code: string;
  plan_name: string;
  promo_code: string;
  expires_at: string | null;
}

export interface PaymentTransactionStatus {
  cheque_id: string;
  transaction_id: string | null;
  pay_status: string | null;
  amount: number | null;
  provider: string;
  raw: Record<string, unknown> | null;
}

export type NormalizedPaymentStatus = "success" | "pending" | "failed";
