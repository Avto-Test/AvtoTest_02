'use client';

import { UserAttemptSummary } from '@/schemas/analytics.schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface RecentAttemptsProps {
    attempts: UserAttemptSummary[];
}

export function RecentAttempts({ attempts }: RecentAttemptsProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest test sessions.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {attempts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No recent activity. Start a test to see your progress!
                        </p>
                    ) : (
                        attempts.map((attempt) => (
                            <div key={attempt.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none truncate max-w-[200px]">
                                        {attempt.test_title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(attempt.finished_at!).toLocaleDateString()} • {new Date(attempt.finished_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className={
                                            attempt.score >= 90 ? 'text-success font-bold' :
                                                attempt.score >= 70 ? 'text-primary font-bold' :
                                                    attempt.score >= 50 ? 'text-warning font-bold' :
                                                        'text-destructive font-bold'
                                        }>
                                            {attempt.score}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {attempts.length > 0 && (
                    <div className="mt-4 pt-4 border-t flex justify-center">
                        <Button variant="outline" size="sm" asChild className="w-full">
                            <Link href="/dashboard/history">View All History</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
