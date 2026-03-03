import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type FunnelRecommendationSeverity = 'low' | 'medium' | 'high';

export interface FunnelRecommendationInsight {
    severity: FunnelRecommendationSeverity;
    message: string;
}

interface FunnelRecommendationCardProps {
    recommendation: FunnelRecommendationInsight;
}

function getSeverityStyles(severity: FunnelRecommendationSeverity): {
    cardClassName: string;
    textClassName: string;
    label: string;
    icon: React.ReactNode;
} {
    if (severity === 'high') {
        return {
            cardClassName: 'border-red-200 bg-red-50/30',
            textClassName: 'text-red-700',
            label: 'High Priority',
            icon: <AlertOctagon className="h-4 w-4 text-red-600" />,
        };
    }

    if (severity === 'medium') {
        return {
            cardClassName: 'border-amber-200 bg-amber-50/30',
            textClassName: 'text-amber-700',
            label: 'Medium Priority',
            icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
        };
    }

    return {
        cardClassName: 'border-emerald-200 bg-emerald-50/30',
        textClassName: 'text-emerald-700',
        label: 'Low Priority',
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    };
}

export function FunnelRecommendationCard({ recommendation }: FunnelRecommendationCardProps) {
    const styles = getSeverityStyles(recommendation.severity);

    return (
        <Card className={styles.cardClassName}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    {styles.icon}
                    Automated Recommendation
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wide ${styles.textClassName}`}>
                    {styles.label}
                </p>
                <p className="text-sm text-foreground">{recommendation.message}</p>
            </CardContent>
        </Card>
    );
}
