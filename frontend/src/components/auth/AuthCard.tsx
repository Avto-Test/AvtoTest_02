'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardFooter } from '../ui/card';
import { AuthHeader } from './AuthHeader';

interface AuthCardProps {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer?: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-12">
            {/* Background decoration */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-1/2 -right-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-brand/5 blur-3xl" />
            </div>

            <Card className="w-full max-w-md border-border/50 shadow-xl">
                <CardContent className="pt-8 pb-4 space-y-6">
                    <AuthHeader title={title} subtitle={subtitle} />
                    {children}
                </CardContent>
                {footer && (
                    <CardFooter className="flex justify-center pb-8 pt-2">
                        {footer}
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
