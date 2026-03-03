'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserTestAnalytics } from '@/schemas/analytics.schema';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TestPerformanceTableProps {
    analytics: UserTestAnalytics[];
}

export function TestPerformanceTable({ analytics }: TestPerformanceTableProps) {
    if (analytics.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Test Performance</CardTitle>
                    <CardDescription>Detailed breakdown by test.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8 text-muted-foreground text-sm">
                    No test data available.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test Performance</CardTitle>
                <CardDescription>Detailed breakdown by test.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Test Name</TableHead>
                            <TableHead className="text-center">Attempts</TableHead>
                            <TableHead className="text-center">Best Score</TableHead>
                            <TableHead className="text-center">Avg Score</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analytics.map((item) => (
                            <TableRow key={item.test_id}>
                                <TableCell className="font-medium">{item.title}</TableCell>
                                <TableCell className="text-center">{item.attempts_count}</TableCell>
                                <TableCell className="text-center text-success font-medium">
                                    {item.best_score}%
                                </TableCell>
                                <TableCell className="text-center">
                                    {item.average_score}%
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href="/tests?mode=adaptive">Start Adaptive</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
