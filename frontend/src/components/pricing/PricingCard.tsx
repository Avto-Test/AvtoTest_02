'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlanBadge } from './PlanBadge';
import { FeatureList } from './FeatureList';
import { cn } from '@/lib/utils';
import { PlanFeature } from '@/schemas/payment.schema';

interface PricingCardProps {
    planName: string;
    price: number;
    currency?: string;
    interval?: string;
    features: PlanFeature[];
    isPopular?: boolean;
    ctaText: string;
    ctaVariant?: 'default' | 'outline' | 'secondary';
    ctaDisabled?: boolean;
    onCtaClick?: () => void;
    isCurrentPlan?: boolean;
    className?: string;
}

export function PricingCard({
    planName,
    price,
    currency = '$',
    interval = '/month',
    features,
    isPopular = false,
    ctaText,
    ctaVariant = 'default',
    ctaDisabled = false,
    onCtaClick,
    isCurrentPlan = false,
    className,
}: PricingCardProps) {
    return (
        <Card
            className={cn(
                "relative flex flex-col overflow-hidden transition-all duration-300",
                isPopular && [
                    "border-2 border-primary shadow-xl shadow-primary/10",
                    "scale-[1.02] lg:scale-105",
                ],
                !isPopular && "border-border hover:border-muted-foreground/30",
                className
            )}
        >
            {/* Popular Badge */}
            {isPopular && (
                <div className="absolute -top-0 right-4 transform -translate-y-1/2">
                    <PlanBadge />
                </div>
            )}

            <CardHeader className={cn("pb-4", isPopular && "pt-8")}>
                <CardTitle className="text-xl font-semibold">{planName}</CardTitle>

                {/* Price */}
                <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">
                        {currency}{price}
                    </span>
                    {price > 0 && (
                        <span className="text-muted-foreground text-sm">
                            {interval}
                        </span>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1">
                <FeatureList features={features} />
            </CardContent>

            <CardFooter className="pt-4">
                <Button
                    variant={isPopular ? 'default' : ctaVariant}
                    size="lg"
                    className={cn(
                        "w-full font-semibold",
                        isPopular && "bg-gradient-to-r from-primary to-brand hover:opacity-90"
                    )}
                    disabled={ctaDisabled}
                    onClick={onCtaClick}
                >
                    {isCurrentPlan && (
                        <svg
                            className="w-4 h-4 mr-2"
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
                    )}
                    {ctaText}
                </Button>
            </CardFooter>
        </Card>
    );
}
