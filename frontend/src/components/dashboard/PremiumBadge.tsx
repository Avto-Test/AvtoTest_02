'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PremiumBadgeProps {
    isPremium: boolean;
    className?: string;
}

export function PremiumBadge({ isPremium, className }: PremiumBadgeProps) {
    if (isPremium) {
        return (
            <Badge
                variant="default"
                className={cn(
                    "bg-gradient-to-r from-primary to-brand text-primary-foreground border-none px-3 py-1",
                    className
                )}
            >
                Premium Active
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className={cn("text-muted-foreground", className)}>
            Free Plan (3 attempts/day)
        </Badge>
    );
}
