import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type WorstStage = 'block_to_click' | 'click_to_success' | null;

export interface FunnelLeakInsight {
    block_to_click_drop_rate: number;
    click_to_success_drop_rate: number;
    worst_stage: WorstStage;
}

interface LeakInsightCardProps {
    leak: FunnelLeakInsight;
}

function formatLeakPercent(value: number): string {
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
    return `${(safeValue * 100).toFixed(2)}%`;
}

function getLeakTone(worstStage: WorstStage): 'warning' | 'neutral' {
    return worstStage === null ? 'neutral' : 'warning';
}

export function LeakInsightCard({ leak }: LeakInsightCardProps) {
    const tone = getLeakTone(leak.worst_stage);
    const isWarning = tone === 'warning';

    return (
        <Card className={isWarning ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    {isWarning ? (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                    ) : (
                        <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    )}
                    Funnel Leak Insight
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-border/60 bg-background p-3">
                        <p className="text-xs text-muted-foreground">Block → Click Drop</p>
                        <p className="mt-1 text-lg font-semibold">
                            {formatLeakPercent(leak.block_to_click_drop_rate)}
                        </p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-background p-3">
                        <p className="text-xs text-muted-foreground">Click → Success Drop</p>
                        <p className="mt-1 text-lg font-semibold">
                            {formatLeakPercent(leak.click_to_success_drop_rate)}
                        </p>
                    </div>
                </div>
                <p className={`text-xs ${isWarning ? 'text-amber-700' : 'text-muted-foreground'}`}>
                    {leak.worst_stage === 'block_to_click'
                        ? 'Highest leakage is between premium exposure and upgrade clicks.'
                        : leak.worst_stage === 'click_to_success'
                        ? 'Highest leakage is between upgrade clicks and successful upgrades.'
                        : 'No significant leak detected across funnel stages.'}
                </p>
            </CardContent>
        </Card>
    );
}
