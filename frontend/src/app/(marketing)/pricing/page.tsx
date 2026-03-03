'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PricingCard } from '@/components/pricing/PricingCard';
import { useAuthStore } from '@/store/auth';
import { getAvailableCheckoutPlans } from '@/lib/payments';
import { CheckoutPlan } from '@/schemas/payment.schema';
import {
    FREE_PLAN_FEATURES,
    PREMIUM_PLAN_FEATURES,
} from '@/schemas/payment.schema';

export default function PricingPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuthStore();
    const [plans, setPlans] = useState<CheckoutPlan[]>([]);

    const isPremium = user?.is_premium ?? false;

    useEffect(() => {
        async function loadPlans() {
            try {
                const list = await getAvailableCheckoutPlans();
                setPlans(list);
            } catch {
                setPlans([]);
            }
        }
        loadPlans();
    }, []);

    const handleFreePlanClick = () => {
        if (!isAuthenticated) {
            router.push('/register');
        }
    };

    const handlePremiumPlanClick = (planId?: string) => {
        if (!isAuthenticated) {
            router.push('/login?redirect=/upgrade');
        } else {
            router.push(planId ? `/upgrade?plan=${planId}` : '/upgrade');
        }
    };

    const getFreePlanCta = () => {
        if (isLoading) {
            return { text: "Bepul ro'yxatdan o'tish", disabled: false };
        }
        if (!isAuthenticated) {
            return { text: "Bepul ro'yxatdan o'tish", disabled: false };
        }
        if (isPremium) {
            return { text: 'Bepul tarif', disabled: true };
        }
        return { text: 'Joriy tarif', disabled: true, isCurrent: true };
    };

    const getPremiumPlanCta = () => {
        if (isLoading) {
            return { text: 'Hozir upgrade qilish', disabled: false };
        }
        if (!isAuthenticated) {
            return { text: 'Hozir upgrade qilish', disabled: false };
        }
        if (isPremium) {
            return { text: 'Faol tarif', disabled: true, isCurrent: true };
        }
        return { text: 'Hozir upgrade qilish', disabled: false };
    };

    const freeCta = getFreePlanCta();
    const premiumCta = getPremiumPlanCta();

    return (
        <div className="min-h-screen bg-background">
            <section className="py-16 lg:py-24">
                <div className="container-app text-center">
                    <h1 className="mb-4 text-4xl font-bold tracking-tight lg:text-5xl">
                        <span className="gradient-text">Tayyorgarligingizni keyingi darajaga olib chiqing</span>
                    </h1>
                    <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
                        Ozingizga mos tarifni tanlang. Avval bepul boshlang, keyin cheksiz amaliyot uchun
                        kerak bolganda upgrade qiling.
                    </p>

                    <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <PricingCard
                            planName="Bepul"
                            price={0}
                            features={FREE_PLAN_FEATURES}
                            ctaText={freeCta.text}
                            ctaVariant="outline"
                            ctaDisabled={freeCta.disabled}
                            isCurrentPlan={freeCta.isCurrent}
                            onCtaClick={handleFreePlanClick}
                        />

                        {(plans.length > 0 ? plans : [null]).map((plan, index) => (
                            <PricingCard
                                key={plan?.id ?? 'premium-fallback'}
                                planName={plan?.name ?? 'Premium'}
                                price={plan ? Number((plan.price_cents / 100).toFixed(2)) : 9.99}
                                currency={plan ? `${plan.currency} ` : '$'}
                                interval={plan ? `/${plan.duration_days}d` : '/month'}
                                features={PREMIUM_PLAN_FEATURES}
                                isPopular={index === 0}
                                ctaText={premiumCta.text}
                                ctaDisabled={premiumCta.disabled}
                                isCurrentPlan={premiumCta.isCurrent}
                                onCtaClick={() => handlePremiumPlanClick(plan?.id)}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-t border-border bg-muted/30 py-12">
                <div className="container-app">
                    <div className="flex flex-col items-center justify-center gap-8 text-sm text-muted-foreground sm:flex-row">
                        <div className="flex items-center gap-2">
                            <svg
                                className="h-5 w-5 text-success"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                            <span>Stripe orqali xavfsiz tolov</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg
                                className="h-5 w-5 text-brand"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            <span>Istalgan payt bekor qilish mumkin</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg
                                className="h-5 w-5 text-primary"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                />
                            </svg>
                            <span>Bepul tarif uchun karta talab qilinmaydi</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-16">
                <div className="container-app text-center">
                    <h2 className="mb-4 text-2xl font-semibold">Savollaringiz bormi?</h2>
                    <p className="mb-4 text-muted-foreground">
                        Tariflar boyicha savollar bolsa, jamoamiz yordam beradi.
                    </p>
                    <Link
                        href="mailto:support@autotest.com"
                        className="font-medium text-primary hover:underline"
                    >
                        Support bilan boglanish -&gt;
                    </Link>
                </div>
            </section>
        </div>
    );
}
