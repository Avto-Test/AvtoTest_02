'use client';

import { Progress } from '@/components/ui/progress';

interface TestProgressProps {
    current: number;
    total: number;
}

export function TestProgress({ current, total }: TestProgressProps) {
    const progress = Math.round(((current + 1) / total) * 100);

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
                <span>Question {current + 1} of {total}</span>
                <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
        </div>
    );
}
