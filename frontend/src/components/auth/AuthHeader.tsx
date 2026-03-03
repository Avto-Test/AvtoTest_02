'use client';

import Link from 'next/link';

interface AuthHeaderProps {
    title: string;
    subtitle: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
    return (
        <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <span className="text-lg font-bold text-primary-foreground">AT</span>
                </div>
                <span className="text-2xl font-bold tracking-tight">
                    AUTO<span className="text-primary">TEST</span>
                </span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
    );
}
