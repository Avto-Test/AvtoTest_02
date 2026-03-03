import { AlertOctagon, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface FunnelAnomalySignal {
    detected: boolean;
    severity: 'moderate' | 'critical' | null;
}

interface AnomalyAlertProps {
    anomaly: FunnelAnomalySignal;
}

function getAnomalyMeta(severity: FunnelAnomalySignal['severity']) {
    if (severity === 'critical') {
        return {
            label: 'Critical',
            icon: <AlertOctagon className="h-4 w-4 text-red-700" />,
            className: 'border-red-200 bg-red-50/40 text-red-800',
        };
    }

    return {
        label: 'Moderate',
        icon: <AlertTriangle className="h-4 w-4 text-amber-700" />,
        className: 'border-amber-200 bg-amber-50/40 text-amber-800',
    };
}

export function AnomalyAlert({ anomaly }: AnomalyAlertProps) {
    const meta = getAnomalyMeta(anomaly.severity);

    return (
        <Card className={meta.className}>
            <CardContent className="flex items-center gap-3 p-3">
                {meta.icon}
                <p className="text-sm font-medium">
                    <span className="mr-2 inline-block rounded-sm border border-current/20 px-1.5 py-0.5 text-xs uppercase tracking-wide">
                        {meta.label}
                    </span>
                    Unusual conversion rate movement detected.
                </p>
            </CardContent>
        </Card>
    );
}
