import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface FunnelTrendSignal {
    direction: 'improving' | 'declining' | 'stable';
    strength: number;
}

interface TrendIndicatorProps {
    trend: FunnelTrendSignal;
}

function getStrengthPercent(strength: number): string {
    const safeStrength = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
    return `${(safeStrength * 100).toFixed(1)}%`;
}

function getTrendMeta(direction: FunnelTrendSignal['direction']) {
    if (direction === 'improving') {
        return {
            label: 'Improving',
            icon: <ArrowUpRight className="h-3.5 w-3.5" />,
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        };
    }

    if (direction === 'declining') {
        return {
            label: 'Declining',
            icon: <ArrowDownRight className="h-3.5 w-3.5" />,
            className: 'border-red-200 bg-red-50 text-red-700',
        };
    }

    return {
        label: 'Stable',
        icon: <ArrowRight className="h-3.5 w-3.5" />,
        className: 'border-slate-200 bg-slate-100 text-slate-700',
    };
}

export function TrendIndicator({ trend }: TrendIndicatorProps) {
    const meta = getTrendMeta(trend.direction);
    const strengthText = getStrengthPercent(trend.strength);

    return (
        <Badge variant="outline" className={`gap-1.5 px-2.5 py-1 ${meta.className}`}>
            {meta.icon}
            <span className="font-medium">{meta.label}</span>
            <span className="opacity-80">({strengthText})</span>
        </Badge>
    );
}
