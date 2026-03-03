'use client';

import { UserAttemptSummary } from '@/schemas/analytics.schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AttemptsChartProps {
    attempts: UserAttemptSummary[];
}

export function AttemptsChart({ attempts }: AttemptsChartProps) {
    // Sort by date ascending for the chart
    const sortedAttempts = [...attempts].sort((a, b) => {
        if (!a.finished_at || !b.finished_at) return 0;
        return new Date(a.finished_at).getTime() - new Date(b.finished_at).getTime();
    });

    if (sortedAttempts.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Performance Trend</CardTitle>
                    <CardDescription>Your scores over the last 5 attempts.</CardDescription>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No data available yet.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
                <CardDescription>Your scores over the last 5 attempts.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full flex items-end justify-between gap-2 pt-4 pb-2">
                    {sortedAttempts.map((attempt) => {
                        const height = `${Math.max(attempt.score, 5)}%`; // Min 5% height for visibility
                        let colorClass = 'bg-primary';
                        if (attempt.score >= 90) colorClass = 'bg-success';
                        else if (attempt.score >= 70) colorClass = 'bg-primary';
                        else if (attempt.score >= 50) colorClass = 'bg-warning';
                        else colorClass = 'bg-destructive';

                        return (
                            <div key={attempt.id} className="flex flex-col items-center justify-end flex-1 h-full gap-2 group">
                                <div
                                    className={`w-full max-w-[40px] rounded-t-sm transition-all relative ${colorClass}`}
                                    style={{ height }}
                                >
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow pointer-events-none whitespace-nowrap z-10">
                                        {attempt.score}% - {attempt.test_title}
                                    </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground truncate w-full text-center px-1">
                                    {new Date(attempt.finished_at!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
