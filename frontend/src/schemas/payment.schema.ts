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
    { text: '3 test attempts per day', included: true },
    { text: 'Basic score tracking', included: true },
    { text: 'Access to all tests', included: true },
    { text: 'Unlimited attempts', included: false },
    { text: 'Detailed analytics dashboard', included: false },
    { text: 'Priority support', included: false },
];

// Premium plan features
export const PREMIUM_PLAN_FEATURES: PlanFeature[] = [
    { text: 'Unlimited test attempts', included: true },
    { text: 'Advanced score tracking', included: true },
    { text: 'Access to all tests', included: true },
    { text: 'Detailed analytics dashboard', included: true },
    { text: 'Priority support', included: true },
    { text: 'Premium badge on profile', included: true },
];

// Pricing configuration
export const PREMIUM_PRICE = 9.99;
export const PREMIUM_CURRENCY = 'USD';
