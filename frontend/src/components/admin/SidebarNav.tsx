'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

interface NavItem {
    href: string;
    labelKey: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    {
        href: '/admin',
        labelKey: 'admin.nav.dashboard',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        href: '/admin/questions',
        labelKey: 'admin.nav.questions',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        href: '/admin/lessons',
        labelKey: 'admin.nav.lessons',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.483 9.246 5 7.5 5S4.168 5.483 3 6.253v13C4.168 18.483 5.754 18 7.5 18s3.332.483 4.5 1.253m0-13C13.168 5.483 14.754 5 16.5 5s3.332.483 4.5 1.253v13C19.832 18.483 18.246 18 16.5 18s-3.332.483-4.5 1.253" />
            </svg>
        ),
    },
    {
        href: '/admin/schools',
        labelKey: 'admin.nav.driving_schools',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l2-5a2 2 0 011.9-1.37h10.2A2 2 0 0119 8l2 5m-1 0v5a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H7v1a1 1 0 01-1 1H5a1 1 0 01-1-1v-5m1 0h14M7 13h.01M17 13h.01" />
            </svg>
        ),
    },
    {
        href: '/admin/driving-instructors',
        labelKey: 'admin.nav.driving_instructors',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-4m-5 6H7a4 4 0 01-4-4v-2a4 4 0 014-4h5a4 4 0 014 4v2a4 4 0 01-4 4zm5-12a3 3 0 100-6 3 3 0 000 6zM8.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
            </svg>
        ),
    },
    {
        href: '/admin/feedback',
        labelKey: 'admin.nav.feedback',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 8l-4-4V6a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H7z" />
            </svg>
        ),
    },
    {
        href: '/admin/plans',
        labelKey: 'admin.nav.plans',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 .895-4 2s1.79 2 4 2 4 .895 4 2-1.79 2-4 2m0-10V6m0 12v-2m8-6a8 8 0 11-16 0 8 8 0 0116 0z" />
            </svg>
        ),
    },
    {
        href: '/admin/analytics',
        labelKey: 'admin.nav.analytics',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 20V10m5 10V4m5 16v-6" />
            </svg>
        ),
    },
    {
        href: '/admin/ml',
        labelKey: 'admin.nav.ml',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.75h4.5v3h3v4.5h3v4.5h-3v4.5h-4.5v-3h-3v-4.5h-3v-4.5h3v-4.5h4.5z" />
            </svg>
        ),
    },
    {
        href: '/admin/promos',
        labelKey: 'admin.nav.promos',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m0 0l-6-6m6 6H3m16 0a4 4 0 110 8 4 4 0 010-8z" />
            </svg>
        ),
    },
    {
        href: '/admin/violations',
        labelKey: 'admin.nav.violations',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
    },
    {
        href: '/admin/users',
        labelKey: 'admin.nav.users',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-4m-4 6H7a4 4 0 01-4-4v-2a4 4 0 014-4h6a4 4 0 014 4v2a4 4 0 01-4 4zm3-12a4 4 0 10-8 0 4 4 0 008 0zm6 4a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
        ),
    },
];

export function SidebarNav() {
    const pathname = usePathname();
    const { t } = useI18n();

    return (
        <nav className="space-y-1">
            {navItems.map((item) => {
                const isActive = pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                            isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        {item.icon}
                        {t(item.labelKey)}
                    </Link>
                );
            })}
        </nav>
    );
}
