/**
 * AUTOTEST Payment Schemas
 * TypeScript interfaces for payment-related data
 */

export interface CheckoutResponse {
    checkout_url: string;
    session_id: string;
    provider: string;
}

export interface CheckoutPromoQuote {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    savings_cents: number;
}

export interface CheckoutQuoteResponse {
    plan_id: string | null;
    plan_name: string | null;
    duration_days: number;
    currency: string;
    base_amount_cents: number;
    final_amount_cents: number;
    promo: CheckoutPromoQuote | null;
}

export interface CreateCheckoutSessionPayload {
    plan_id?: string;
    promo_code?: string;
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

export interface CheckoutError {
    detail: string;
}

export interface CheckoutPlan {
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

export interface PaymentTransactionStatusResponse {
    cheque_id: string;
    transaction_id: string | null;
    pay_status: string | null;
    amount: number | null;
    provider: string;
    raw: Record<string, unknown> | null;
}

// Pricing configuration
export interface PricingPlan {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: PlanFeature[];
    isPopular?: boolean;
}

export interface PlanFeature {
    text: string;
    included: boolean;
}

// Free plan features
export const FREE_PLAN_FEATURES: PlanFeature[] = [
    { text: "Kuniga 3 ta test urinish", included: true },
    { text: "Asosiy natija kuzatuvi", included: true },
    { text: "Barcha testlarga kirish", included: true },
    { text: "Cheksiz urinishlar", included: false },
    { text: "Kengaytirilgan analitika", included: false },
    { text: "Ustuvor yordam", included: false },
];

// Premium plan features
export const PREMIUM_PLAN_FEATURES: PlanFeature[] = [
    { text: "Cheksiz test urinishlari", included: true },
    { text: "Kuchli natija tahlili", included: true },
    { text: "Barcha testlarga kirish", included: true },
    { text: "To'liq analitika paneli", included: true },
    { text: "Ustuvor qo'llab-quvvatlash", included: true },
    { text: "Profil uchun premium belgi", included: true },
];

// Pricing configuration
export const PREMIUM_PRICE = 100000;
export const PREMIUM_CURRENCY = "UZS";
