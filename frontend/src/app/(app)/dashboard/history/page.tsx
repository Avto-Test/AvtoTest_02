'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { getUserTestAnalytics } from '@/lib/analytics';
import { UserTestAnalytics } from '@/schemas/analytics.schema';
import { TestPerformanceTable } from '@/components/dashboard';
import { getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HistoryPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: isAuthLoading, initialize } = useAuthStore();
    const [analytics, setAnalytics] = useState<UserTestAnalytics[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthLoading, isAuthenticated, router]);

    useEffect(() => {
        async function loadData() {
            if (!isAuthenticated) return;
            try {
                const data = await getUserTestAnalytics();
                setAnalytics(data);
            } catch (err) {
                console.error('Failed to load history:', err);
            } finally {
                setIsLoading(false);
            }
        }
        if (isAuthenticated) {
            loadData();
        }
    }, [isAuthenticated]);

    if (isAuthLoading || isLoading) {
        return <div className="container-app py-8">Loading...</div>;
    }

    return (
        <div className="container-app py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">History & Performance</h1>
                    <p className="text-muted-foreground">Detailed breakdown of your test results.</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
            </div>

            <TestPerformanceTable analytics={analytics || []} />
        </div>
    );
}
