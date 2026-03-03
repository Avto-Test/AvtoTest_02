'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthCard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifyEmailSchema, VerifyEmailFormData } from '@/schemas/auth.schema';
import { verifyEmail } from '@/lib/auth';
import { getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function VerifyPage() {
    const router = useRouter();
    const { setToken, fetchUser } = useAuthStore();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');

    useEffect(() => {
        // Get email from sessionStorage
        if (typeof window !== 'undefined') {
            const storedEmail = sessionStorage.getItem('verify_email');
            if (storedEmail) {
                setEmail(storedEmail);
            }
        }
    }, []);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<VerifyEmailFormData>({
        resolver: zodResolver(verifyEmailSchema),
    });

    useEffect(() => {
        if (email) {
            setValue('email', email);
        }
    }, [email, setValue]);

    const onSubmit = async (data: VerifyEmailFormData) => {
        setError(null);
        setIsLoading(true);

        try {
            const response = await verifyEmail(data);
            setToken(response.access_token);
            await fetchUser();
            // Clear session storage
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('verify_email');
            }
            router.push('/dashboard');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthCard
            title="Verify your email"
            subtitle="Enter the 6-digit code sent to your email"
            footer={
                <p className="text-sm text-muted-foreground">
                    Didn&apos;t receive the code?{' '}
                    <button className="text-primary font-medium hover:underline">
                        Resend
                    </button>
                </p>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                        {error}
                    </div>
                )}

                <div className="p-4 rounded-md bg-success/10 border border-success/20 text-sm text-center">
                    <p className="text-foreground font-medium">Check your email for the verification code</p>
                    <p className="text-muted-foreground mt-1">
                        Check your email at <span className="font-medium text-foreground">{email || 'your inbox'}</span>
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        disabled={isLoading || !!email}
                        {...register('email')}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                        id="code"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        disabled={isLoading}
                        className="text-center text-2xl tracking-[0.5em] font-mono"
                        {...register('code')}
                    />
                    {errors.code && (
                        <p className="text-sm text-destructive">{errors.code.message}</p>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Verifying...
                        </span>
                    ) : (
                        'Verify Email'
                    )}
                </Button>

                <div className="text-center">
                    <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
                        ← Back to login
                    </Link>
                </div>
            </form>
        </AuthCard>
    );
}
