'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '@/store/auth';

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const initialize = useAuthStore(state => state.initialize);
    const isLoading = useAuthStore(state => state.isLoading);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        initialize();
    }, [initialize]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-sm font-medium text-muted-foreground">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex">
                <Sidebar />
            </aside>

            {/* Sidebar - Mobile */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="absolute inset-y-0 left-0 w-64 shadow-2xl animate-in slide-in-from-left duration-300">
                        <Sidebar onMobileItemClick={() => setIsMobileMenuOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
