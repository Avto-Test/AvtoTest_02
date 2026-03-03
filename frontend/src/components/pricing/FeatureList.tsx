'use client';

import { cn } from '@/lib/utils';
import { PlanFeature } from '@/schemas/payment.schema';

interface FeatureListProps {
    features: PlanFeature[];
    className?: string;
}

export function FeatureList({ features, className }: FeatureListProps) {
    return (
        <ul className={cn("space-y-3", className)}>
            {features.map((feature, index) => (
                <li
                    key={index}
                    className={cn(
                        "flex items-start gap-3 text-sm",
                        feature.included
                            ? "text-foreground"
                            : "text-muted-foreground line-through"
                    )}
                >
                    <span
                        className={cn(
                            "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5",
                            feature.included
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        {feature.included ? (
                            <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        )}
                    </span>
                    <span>{feature.text}</span>
                </li>
            ))}
        </ul>
    );
}
