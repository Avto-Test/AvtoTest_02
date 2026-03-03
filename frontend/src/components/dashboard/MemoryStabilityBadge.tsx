'use client';

import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface MemoryStabilityBadgeProps {
    stability: 'High' | 'Medium' | 'Low' | string;
}

export function MemoryStabilityBadge({ stability }: MemoryStabilityBadgeProps) {
    let colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
    let icon = <Shield className="w-3 h-3 mr-1" />;
    let label = stability;

    if (stability === 'High') {
        colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
        icon = <ShieldCheck className="w-3 h-3 mr-1" />;
        label = 'Consolidated';
    } else if (stability === 'Medium') {
        colorClass = 'bg-blue-100 text-blue-700 border-blue-200';
        icon = <Shield className="w-3 h-3 mr-1" />;
        label = 'Stabilizing';
    } else if (stability === 'Low') {
        colorClass = 'bg-amber-100 text-amber-700 border-amber-200';
        icon = <ShieldAlert className="w-3 h-3 mr-1" />;
        label = 'Volatile';
    }

    return (
        <Badge variant="outline" className={`${colorClass} font-bold text-[10px] uppercase tracking-wider py-0.5 px-2`}>
            {icon}
            Memory Stability: {label}
        </Badge>
    );
}
