'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SidebarNav } from './SidebarNav';
import { useAuth } from '@/store/useAuth';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';
import { SurfaceNav } from '@/components/intelligence/SurfaceNav';
import { adminNav } from '@/config/navigation';
import { NavigationShellProvider } from '@/components/shell/navigation-shell-context';

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
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20"></div>
                    <div className="h-4 w-32 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <NavigationShellProvider>
            <div className="flex min-h-screen bg-background">
                <aside className="hidden w-72 shrink-0 border-r border-white/8 bg-[linear-gradient(180deg,rgba(7,11,24,0.94),rgba(10,17,30,0.98))] lg:flex lg:flex-col">
                    <div className="border-b border-white/8 px-6 py-5">
                        <Link href="/admin" className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(56,189,248,0.95),rgba(99,102,241,0.95))] text-sm font-bold text-white">
                                AT
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">AUTOTEST</p>
                                <p className="text-xs text-white/55">Admin</p>
                            </div>
                        </Link>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-5">
                        <SidebarNav />
                    </div>

                    <div className="border-t border-white/8 px-4 py-4">
                        <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                            <p className="truncate text-sm font-medium text-white">{user.email}</p>
                            <p className="mt-1 text-xs text-white/50">Admin</p>
                            <Button variant="ghost" size="sm" className="mt-3 w-full justify-start rounded-xl text-white hover:bg-white/10" asChild>
                                <Link href="/dashboard">{`<- ${t("admin.exit")}`}</Link>
                            </Button>
                        </div>
                    </div>
                </aside>

                <main className="min-w-0 flex-1 overflow-x-hidden">
                    <header className="sticky top-0 z-30 border-b border-white/8 bg-background/85 backdrop-blur-xl">
                        <div className="container-app py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    {title ? <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1> : null}
                                    {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">{description}</p> : null}
                                </div>
                                {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
                            </div>
                            <div className="mt-4 lg:hidden">
                                <SurfaceNav items={adminNav} scope="shell" />
                            </div>
                        </div>
                    </header>

                    <div className="container-app py-6">
                        {children}
                    </div>
                </main>
            </div>
        </NavigationShellProvider>
    );
}

