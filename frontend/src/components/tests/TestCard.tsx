'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestList } from '@/schemas/test.schema';

interface TestCardProps {
    test: TestList;
}

export function TestCard({ test }: TestCardProps) {
    return (
        <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
                <div className="flex justify-between items-start gap-4 mb-2">
                    <Badge variant="secondary" className="capitalize">
                        {test.difficulty}
                    </Badge>
                    {test.is_premium ? (
                        <Badge variant="outline">Premium</Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(test.created_at).toLocaleDateString()}
                    </span>
                </div>
                <CardTitle className="line-clamp-2">{test.title}</CardTitle>
                <CardDescription className="line-clamp-3">
                    {test.description || 'No description available'}
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                    </svg>
                    {test.question_count} Questions
                </div>
            </CardContent>

            <CardFooter>
                <Button asChild className="w-full">
                    <Link href="/tests?mode=adaptive">Start Adaptive</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export function TestCardSkeleton() {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow h-[250px] animate-pulse p-6 flex flex-col gap-4">
            <div className="flex justify-between">
                <div className="h-5 w-16 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
            </div>
            <div className="space-y-2">
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-2/3 bg-muted rounded" />
            </div>
            <div className="mt-auto">
                <div className="h-10 w-full bg-muted rounded" />
            </div>
        </div>
    );
}
