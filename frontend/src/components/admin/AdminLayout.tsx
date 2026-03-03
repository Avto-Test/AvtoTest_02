'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SidebarNav } from './SidebarNav';
import { useAuth } from '@/store/useAuth';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';

interface AdminLayoutProps {
    children: ReactNode;
    title?: string;
    description?: string;
    actions?: ReactNode;
}

export function AdminLayout({ children, title, description, actions }: AdminLayoutProps) {
    const router = useRouter();
    const { user, token, loading, hydrated } = useAuth();
    const { t } = useI18n();
    const isAuthenticated = Boolean(token);
    const isLoading = !hydrated || loading;

    // Redirect non-admin users
    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (!user?.is_admin) {
                router.push('/dashboard');
            }
        }
    }, [isLoading, isAuthenticated, user, router]);

    // Loading state
    if (isLoading || !isAuthenticated || !user?.is_admin) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20"></div>
                    <div className="h-4 w-32 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-r border-border bg-card">
                {/* Logo */}
                <div className="flex h-16 items-center gap-2 border-b border-border px-4 sm:px-6">
                    <Link href="/admin" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                            <span className="text-sm font-bold text-primary-foreground">AT</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight">
                            Admin
                        </span>
                    </Link>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 px-4">
                    <SidebarNav />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.email}</p>
                            <p className="text-xs text-muted-foreground">Admin</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
                        <Link href="/dashboard">{`<- ${t("admin.exit")}`}</Link>
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-x-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background px-4">
                    <Link href="/admin" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                            <span className="text-sm font-bold text-primary-foreground">AT</span>
                        </div>
                        <span className="font-bold">Admin</span>
                    </Link>
                </header>

                {/* Page Header */}
                {(title || actions) && (
                    <div className="border-b border-border bg-card">
                        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
                            <div>
                                {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
                                {description && <p className="text-muted-foreground mt-1">{description}</p>}
                            </div>
                            {actions && <div className="flex gap-2">{actions}</div>}
                        </div>
                    </div>
                )}

                {/* Page Content */}
                <div className="p-4 sm:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}

