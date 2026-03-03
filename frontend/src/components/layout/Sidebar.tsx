'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ClipboardList,
    CreditCard,
    Settings,
    PieChart,
    ChevronRight,
    LogOut,
    Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Lessons', href: '/lessons', icon: ClipboardList },
    { name: 'Tests', href: '/tests?mode=adaptive', icon: ClipboardList },
    { name: 'Feedback', href: '/feedback', icon: Settings },
    { name: 'Analytics', href: '/analytics', icon: PieChart },
    { name: 'Billing', href: '/billing', icon: CreditCard },
    { name: 'Profile', href: '/profile', icon: Settings },
];

export function Sidebar({ className, onMobileItemClick }: { className?: string, onMobileItemClick?: () => void }) {
    const pathname = usePathname();
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);

    const navigation = [...baseNavigation];
    if (user?.is_admin) {
        navigation.push({ name: 'Admin Panel', href: '/admin', icon: Shield });
    }

    return (
        <div className={cn("flex h-full w-64 flex-col border-r border-border bg-card", className)}>
            <div className="flex h-16 items-center px-6 border-b border-border">
                <Link href="/dashboard" className="flex items-center gap-2" onClick={onMobileItemClick}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <span className="text-sm font-bold text-primary-foreground">AT</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">
                        AUTO<span className="text-primary">TEST</span>
                    </span>
                </Link>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
                {navigation.map((item) => {
                    const itemPath = item.href.split('?')[0];
                    const isActive = pathname === itemPath || pathname.startsWith(itemPath + '/');
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onMobileItemClick}
                            className={cn(
                                "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                                {item.name}
                            </div>
                            {isActive && <ChevronRight className="h-4 w-4" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-border p-4">
                <button
                    onClick={() => logout()}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
