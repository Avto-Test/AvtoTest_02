'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthCard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifyEmailSchema, VerifyEmailFormData } from '@/schemas/auth.schema';
import { resendVerification, verifyEmail } from '@/lib/auth';
import { getErrorMessage } from '@/lib/api';
import { useAuth } from '@/store/useAuth';

export default function VerifyPage() {
    const router = useRouter();
    const { setToken, fetchUser } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [email, setEmail] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<VerifyEmailFormData>({
        resolver: zodResolver(verifyEmailSchema),
        defaultValues: { email: '', code: '' },
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const storedEmail = sessionStorage.getItem('verify_email');
        if (storedEmail) {
            setEmail(storedEmail);
            setValue('email', storedEmail);
        }
    }, [setValue]);

    const onSubmit = async (data: VerifyEmailFormData) => {
        setError(null);
        setIsLoading(true);

        try {
            const response = await verifyEmail(data);
            setToken(response.access_token);
            const authenticated = await fetchUser();
            if (!authenticated) {
                setError("Sessiya ochilmadi. Qayta urinib ko'ring.");
                return;
            }
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('verify_email');
            }
            toast.success('Email tasdiqlandi');
            router.push('/dashboard');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        const targetEmail = getValues('email') || email;
        if (!targetEmail) {
            setError('Avval email manzilini kiriting.');
            return;
        }

        setError(null);
        setIsResending(true);

        try {
            await resendVerification({ email: targetEmail });
            toast.success('Tasdiqlash kodi qayta yuborildi');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsResending(false);
        }
    };

    return (
        <AuthCard
            title="Emailni tasdiqlash"
            subtitle="Emailga yuborilgan 6 xonali kodni kiriting"
            footer={
                <p className="text-sm text-muted-foreground">
                    Kod kelmadimi?{' '}
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending}
                        className="text-primary font-medium hover:underline disabled:opacity-60"
                    >
                        {isResending ? 'Yuborilmoqda...' : 'Qayta yuborish'}
                    </button>
                </p>
            }
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                    <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="rounded-md border border-success/20 bg-success/10 p-4 text-center text-sm">
                    <p className="font-medium text-foreground">Tasdiqlash kodi emailga yuborilgan</p>
                    <p className="mt-1 text-muted-foreground">
                        {email
                            ? <>Kod yuborilgan manzil: <span className="font-medium text-foreground">{email}</span></>
                            : 'Email manzilingizni kiriting va kodni tasdiqlang.'}
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        disabled={isLoading}
                        {...register('email')}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="code">Tasdiqlash kodi</Label>
                    <Input
                        id="code"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        disabled={isLoading}
                        className="text-center font-mono text-2xl tracking-[0.5em]"
                        {...register('code')}
                    />
                    {errors.code && (
                        <p className="text-sm text-destructive">{errors.code.message}</p>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Tasdiqlanmoqda...
                        </span>
                    ) : (
                        'Emailni tasdiqlash'
                    )}
                </Button>

                <div className="text-center">
                    <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
                        ← Kirish sahifasiga qaytish
                    </Link>
                </div>
            </form>
        </AuthCard>
    );
}
