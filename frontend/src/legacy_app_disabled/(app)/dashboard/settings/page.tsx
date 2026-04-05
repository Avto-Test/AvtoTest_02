'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { PremiumBadge } from '@/components/dashboard';

export default function SettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, initialize, logout } = useAuthStore();
    const createdAtLabel = user?.created_at
        ? new Date(user.created_at).toLocaleDateString()
        : "Unknown";
    const isPremium = user?.is_premium === true;

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading || !user) {
        return <div className="container-app py-8">Loading...</div>;
    }

    return (
        <div className="container-app py-8 max-w-2xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                    <p className="text-muted-foreground">Manage your profile and subscription.</p>
                </div>
                <div className="space-x-4">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard">Back to Dashboard</Link>
                    </Button>
                    <Button variant="destructive" onClick={() => { logout(); router.push('/login'); }}>
                        Sign Out
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Your personal details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={user.email} disabled />
                        </div>
                        <div className="grid gap-2">
                            <Label>Account Created</Label>
                            <div className="text-sm text-muted-foreground">
                                {createdAtLabel}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Subscription Plan</CardTitle>
                                <CardDescription>Manage your plan.</CardDescription>
                            </div>
                            <PremiumBadge isPremium={isPremium} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isPremium ? (
                            <p className="text-sm text-muted-foreground">
                                You have unlimited access to all tests. Thank you for supporting AUTOTEST!
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                You are on the Free plan. Upgrade to Premium for unlimited test attempts and priority support.
                            </p>
                        )}
                    </CardContent>
                    <CardFooter>
                        {!isPremium ? (
                            <Button asChild className="w-full sm:w-auto">
                                <Link href="/pricing">Upgrade to Premium</Link>
                            </Button>
                        ) : (
                            <Button variant="outline" disabled>Manage Subscription</Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
