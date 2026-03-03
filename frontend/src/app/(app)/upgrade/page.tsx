'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/common/LoadingButton';
import { useAuth } from '@/store/useAuth';
import { getAvailableCheckoutPlans, getCheckoutQuote, redeemPromoGift, redirectToCheckout } from '@/lib/payments';
import { CheckoutPlan, CheckoutQuoteResponse, RedeemPromoResponse } from '@/schemas/payment.schema';

export default function UpgradePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, token, loading: authLoading, hydrated, fetchUser } = useAuth();
    const isAuthenticated = Boolean(token);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
    const [isPlansLoading, setIsPlansLoading] = useState(true);
    const [plans, setPlans] = useState<CheckoutPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [promoCode, setPromoCode] = useState('');
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [isRedeemingGift, setIsRedeemingGift] = useState(false);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
    const [pricingQuote, setPricingQuote] = useState<CheckoutQuoteResponse | null>(null);
    const [giftRedemption, setGiftRedemption] = useState<RedeemPromoResponse | null>(null);
    const [showGiftCelebration, setShowGiftCelebration] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hydrated && !authLoading && !isAuthenticated) {
            router.push('/login?redirect=/upgrade');
        }
    }, [hydrated, authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (hydrated && isAuthenticated && !user) {
            void fetchUser();
        }
    }, [hydrated, isAuthenticated, user, fetchUser]);

    useEffect(() => {
        async function loadPlans() {
            setIsPlansLoading(true);
            try {
                const list = await getAvailableCheckoutPlans();
                setPlans(list);
                if (list.length > 0) {
                    const preselected = searchParams.get('plan');
                    const exists = preselected ? list.some((plan) => plan.id === preselected) : false;
                    setSelectedPlanId(exists ? (preselected as string) : list[0].id);
                }
            } catch {
                setPlans([]);
            } finally {
                setIsPlansLoading(false);
            }
        }
        if (hydrated && isAuthenticated) {
            void loadPlans();
        }
    }, [hydrated, isAuthenticated, searchParams]);

    const isPremium = user?.plan === 'premium';
    const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
    const displayCurrency = pricingQuote?.currency ?? selectedPlan?.currency ?? 'USD';
    const baseAmountCents = pricingQuote?.base_amount_cents ?? selectedPlan?.price_cents ?? 0;
    const finalAmountCents = pricingQuote?.final_amount_cents ?? selectedPlan?.price_cents ?? 0;
    const hasAppliedPromo = Boolean(pricingQuote?.promo);
    const isFullGiftPromoApplied = hasAppliedPromo && finalAmountCents === 0;

    const confettiPieces = useMemo(
        () =>
            Array.from({ length: 64 }, (_, index) => {
                const colors = ['#22c55e', '#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];
                const color = colors[index % colors.length];
                return {
                    id: index,
                    left: Math.random() * 100,
                    delay: Math.random() * 0.4,
                    duration: 1.8 + Math.random() * 1.4,
                    rotate: Math.random() * 360,
                    size: 6 + Math.random() * 8,
                    color,
                };
            }),
        []
    );

    const formatMoney = (amountCents: number, currency: string) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amountCents / 100);

    useEffect(() => {
        setPricingQuote(null);
        setPromoError(null);
        setPromoSuccess(null);
        setGiftRedemption(null);
        setShowGiftCelebration(false);
    }, [selectedPlanId]);

    const handleApplyPromo = async () => {
        setPromoError(null);
        setPromoSuccess(null);
        setError(null);
        setGiftRedemption(null);
        setShowGiftCelebration(false);

        const normalized = promoCode.trim().toUpperCase();
        if (!selectedPlanId) {
            setPromoError("Avval tarifni tanlang.");
            return;
        }
        if (!normalized) {
            setPromoError("Promokodni kiriting.");
            return;
        }

        setIsApplyingPromo(true);
        try {
            const quote = await getCheckoutQuote({
                plan_id: selectedPlanId,
                promo_code: normalized,
            });
            if (!quote.promo) {
                setPricingQuote(null);
                setPromoError("Promokod qo'llanmadi. Qayta tekshirib ko'ring.");
                return;
            }
            setPricingQuote(quote);
            setPromoCode(quote.promo.code);
            setPromoSuccess(`Promokod qo'llandi: ${quote.promo.code}`);

            if (quote.final_amount_cents === 0) {
                setIsRedeemingGift(true);
                const redemption = await redeemPromoGift({
                    plan_id: selectedPlanId,
                    promo_code: quote.promo.code,
                });

                setGiftRedemption(redemption);
                setPromoSuccess(`Tabriklaymiz! ${redemption.plan_name} tarifi sizga sovg'a sifatida aktivlandi.`);
                setShowGiftCelebration(true);

                try {
                    await fetchUser();
                } catch {
                    // Subscription may already be activated server-side; proceed with redirect anyway.
                }
                window.setTimeout(() => {
                    router.push('/dashboard?upgraded=true&gift=true');
                }, 2600);
            }
        } catch (err) {
            setPricingQuote(null);
            setGiftRedemption(null);
            setShowGiftCelebration(false);
            setPromoError(
                err instanceof Error
                    ? err.message
                    : "Promokodni tekshirib bo'lmadi. Qayta urinib ko'ring."
            );
        } finally {
            setIsApplyingPromo(false);
            setIsRedeemingGift(false);
        }
    };

    const handleProceedToPayment = async () => {
        setError(null);
        setPromoError(null);
        setPromoSuccess(null);
        setIsCheckoutLoading(true);

        try {
            if (!selectedPlanId) {
                throw new Error("Tarif tanlanmagan.");
            }
            if (isFullGiftPromoApplied) {
                throw new Error("Bu promokod tarifni 100% yopadi. 'Qo'llash' tugmasi orqali sovg'a aktivatsiyasini yakunlang.");
            }

            const normalizedPromo = promoCode.trim().toUpperCase();
            if (normalizedPromo && (!pricingQuote?.promo || pricingQuote.promo.code !== normalizedPromo)) {
                setPromoError("Promokodni avval 'Qo'llash' tugmasi bilan tasdiqlang.");
                setIsCheckoutLoading(false);
                return;
            }

            await redirectToCheckout({
                plan_id: selectedPlanId,
                promo_code: pricingQuote?.promo?.code || undefined,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "To'lovni boshlab bo'lmadi. Qayta urinib ko'ring.");
            setIsCheckoutLoading(false);
        }
    };

    if (!hydrated || authLoading || !isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex animate-pulse flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20" />
                    <div className="h-4 w-32 rounded bg-muted" />
                </div>
            </div>
        );
    }

    if (isPremium) {
        return (
            <div className="min-h-screen bg-background py-16">
                <div className="container-app max-w-lg">
                    <Card className="text-center">
                        <CardHeader className="pb-4">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                                <svg
                                    className="h-8 w-8 text-success"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <CardTitle className="text-2xl">
                                Sizda Premium allaqachon faol
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <p className="text-muted-foreground">
                                Sizda premium funksiyalar ochiq: cheksiz test urinishlari va kengaytirilgan analitika.
                            </p>
                            <div className="flex flex-col gap-3">
                                <Button size="lg" asChild>
                                    <Link href="/dashboard">Panelga otish</Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href="/tests">Testlarni korish</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-background py-16">
                <div className="container-app max-w-lg">
                    <Card>
                    <CardHeader className="pb-4 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-primary to-brand">
                            <svg
                                className="h-8 w-8 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                                />
                            </svg>
                        </div>
                        <CardTitle className="text-2xl">
                            Premium tarifga otish
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isPlansLoading ? (
                            <div className="rounded-lg bg-muted/50 py-4 text-center text-sm text-muted-foreground">
                                Tariflar yuklanmoqda...
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                                Faol tariflar topilmadi. Admin paneldan kamida bitta tarif yarating.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Label htmlFor="plan_id">Tarifni tanlang</Label>
                                <select
                                    id="plan_id"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={selectedPlanId}
                                    onChange={(event) => setSelectedPlanId(event.target.value)}
                                >
                                    {plans.map((plan) => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.name} - {(plan.price_cents / 100).toFixed(2)} {plan.currency} / {plan.duration_days} kun
                                        </option>
                                    ))}
                                </select>
                                {selectedPlan ? (
                                    <div className="rounded-lg bg-muted/50 px-4 py-4 text-center">
                                        {hasAppliedPromo ? (
                                            <div className="space-y-2">
                                                <div className="text-sm text-muted-foreground line-through">
                                                    {formatMoney(baseAmountCents, displayCurrency)}
                                                </div>
                                                <div className="text-4xl font-bold text-emerald-600">
                                                    {formatMoney(finalAmountCents, displayCurrency)}
                                                    <span className="text-base font-normal text-muted-foreground">
                                                        /{selectedPlan.duration_days} kun
                                                    </span>
                                                </div>
                                                <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                    Tejadingiz: {formatMoney((baseAmountCents - finalAmountCents), displayCurrency)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-4xl font-bold">
                                                {formatMoney(baseAmountCents, displayCurrency)}
                                                <span className="text-base font-normal text-muted-foreground">
                                                    /{selectedPlan.duration_days} kun
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-sm">
                                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success/10">
                                    <svg className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                Cheksiz test urinishlari
                            </li>
                            <li className="flex items-center gap-3 text-sm">
                                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success/10">
                                    <svg className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                Kengaytirilgan analytics paneli
                            </li>
                            <li className="flex items-center gap-3 text-sm">
                                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success/10">
                                    <svg className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                Ustuvor support
                            </li>
                        </ul>

                        <div className="space-y-2">
                            <Label htmlFor="promo_code">Promokod (ixtiyoriy)</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="promo_code"
                                    placeholder="MASALAN: SPRING2026"
                                    value={promoCode}
                                    className={promoError ? 'border-destructive focus-visible:ring-destructive' : ''}
                                    onChange={(event) => {
                                        const next = event.target.value.toUpperCase();
                                        setPromoCode(next);
                                        setPromoError(null);
                                        setPromoSuccess(null);
                                        if (pricingQuote?.promo && pricingQuote.promo.code !== next.trim()) {
                                            setPricingQuote(null);
                                        }
                                    }}
                                />
                                <LoadingButton
                                    type="button"
                                    variant="secondary"
                                    isLoading={isApplyingPromo || isRedeemingGift}
                                    loadingText={isRedeemingGift ? "Sovg'a aktivlanmoqda..." : "Tekshirilmoqda..."}
                                    onClick={handleApplyPromo}
                                    disabled={isPlansLoading || plans.length === 0 || isCheckoutLoading || isRedeemingGift}
                                >
                                    Qo&apos;llash
                                </LoadingButton>
                            </div>
                            {promoError ? (
                                <p className="text-sm text-destructive">{promoError}</p>
                            ) : null}
                            {!promoError && promoSuccess ? (
                                <p className="text-sm text-emerald-600">{promoSuccess}</p>
                            ) : null}
                        </div>

                        {error && (
                            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <LoadingButton
                                size="lg"
                                className="w-full bg-gradient-to-r from-primary to-brand hover:opacity-90"
                                isLoading={isCheckoutLoading}
                                loadingText="Tolov sahifasiga yonaltirilmoqda..."
                                onClick={handleProceedToPayment}
                                disabled={isPlansLoading || plans.length === 0 || isRedeemingGift || isFullGiftPromoApplied || !!giftRedemption}
                            >
                                {isFullGiftPromoApplied || giftRedemption ? "Sovg'a tarif aktivlandi" : "Tolovga otish"}
                            </LoadingButton>
                            <Button variant="ghost" asChild>
                                <Link href="/pricing">&lt;- Tariflarga qaytish</Link>
                            </Button>
                        </div>

                        <div className="border-t border-border pt-4">
                            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                                <span>Xavfsiz</span>
                                <span>|</span>
                                <span>TsPay bilan ishlaydi</span>
                                <span>|</span>
                                <span>Istalgan payt bekor qilish mumkin</span>
                            </div>
                        </div>
                    </CardContent>
                    </Card>
                </div>
            </div>

            {showGiftCelebration && giftRedemption ? (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        {confettiPieces.map((piece) => (
                            <span
                                key={piece.id}
                                className="absolute top-[-10%] block rounded-[2px]"
                                style={{
                                    left: `${piece.left}%`,
                                    width: `${piece.size}px`,
                                    height: `${piece.size * 0.4}px`,
                                    backgroundColor: piece.color,
                                    transform: `rotate(${piece.rotate}deg)`,
                                    animation: `gift-confetti-fall ${piece.duration}s linear ${piece.delay}s forwards`,
                                }}
                            />
                        ))}
                    </div>

                    <Card className="relative mx-4 w-full max-w-lg border-emerald-500/40 shadow-2xl">
                        <CardContent className="space-y-4 py-8 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-emerald-700">Tabriklaymiz!</h3>
                            <p className="text-base text-foreground">
                                Siz ushbu tarifni <span className="font-semibold">1 so&apos;mga sovg&apos;a sifatida oldingiz.</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Aktiv tarif: <span className="font-semibold text-foreground">{giftRedemption.plan_name}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">Siz dashboard sahifasiga yonaltirilmoqdasiz...</p>
                        </CardContent>
                    </Card>

                    <style jsx>{`
                        @keyframes gift-confetti-fall {
                            0% {
                                transform: translate3d(0, 0, 0) rotate(0deg);
                                opacity: 0;
                            }
                            10% {
                                opacity: 1;
                            }
                            100% {
                                transform: translate3d(0, 110vh, 0) rotate(720deg);
                                opacity: 0.1;
                            }
                        }
                    `}</style>
                </div>
            ) : null}
        </>
    );
}
