'use client';

import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScoreResult } from '@/schemas/test.schema';

interface FinishModalProps {
    open: boolean;
    result: ScoreResult | null;
}

export function FinishModal({ open, result }: FinishModalProps) {
    const router = useRouter();

    if (!result) return null;

    const percentage = Math.round((result.score / result.total_questions) * 100);
    let message = '';
    let colorClass = '';

    if (percentage >= 90) {
        message = 'Excellent!';
        colorClass = 'text-success';
    } else if (percentage >= 70) {
        message = 'Good Job!';
        colorClass = 'text-primary';
    } else if (percentage >= 50) {
        message = 'Passed';
        colorClass = 'text-warning';
    } else {
        message = 'Keep Practicing';
        colorClass = 'text-destructive';
    }

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl">Test Completed</DialogTitle>
                    <DialogDescription className="text-center">
                        Here are your results
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    <div className="text-6xl font-bold tracking-tighter">
                        {percentage}%
                    </div>
                    <div className={`text-xl font-semibold ${colorClass}`}>
                        {message}
                    </div>
                    <div className="text-muted-foreground">
                        You scored {result.score} out of {result.total_questions} questions
                    </div>
                </div>

                <DialogFooter className="sm:justify-center">
                    <Button
                        className="w-full sm:w-auto"
                        onClick={() => router.push('/dashboard')}
                    >
                        Go to Dashboard
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full sm:w-auto mt-2 sm:mt-0"
                        onClick={() => router.push('/tests?mode=adaptive')}
                    >
                        Browse Tests
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
