import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DeltaTone = 'positive' | 'negative' | 'neutral';

interface SummaryCardProps {
    label: string;
    value: string | number;
    hint?: string;
    deltaText?: string;
    deltaTone?: DeltaTone;
}

function getDeltaClassName(deltaTone: DeltaTone | undefined): string {
    if (deltaTone === 'positive') {
        return 'text-emerald-600';
    }

    if (deltaTone === 'negative') {
        return 'text-red-600';
    }

    return 'text-muted-foreground';
}

export function SummaryCard({ label, value, hint, deltaText, deltaTone }: SummaryCardProps) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
                {deltaText ? (
                    <p className={`mt-1 text-xs font-medium ${getDeltaClassName(deltaTone)}`}>{deltaText}</p>
                ) : null}
                {hint ? (
                    <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                ) : null}
            </CardContent>
        </Card>
    );
}
