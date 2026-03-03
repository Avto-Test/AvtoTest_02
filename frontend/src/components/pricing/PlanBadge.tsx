'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlanBadgeProps {
    className?: string;
}

export function PlanBadge({ className }: PlanBadgeProps) {
    return (
        <Badge
            className={cn(
                "bg-gradient-to-r from-brand to-primary text-white border-0 shadow-md",
                "px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                className
            )}
        >
            Most Popular
        </Badge>
    );
}
