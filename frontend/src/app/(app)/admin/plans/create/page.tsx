'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/common/LoadingButton';
import { createSubscriptionPlan, getErrorMessage } from '@/lib/admin';
import {
    subscriptionPlanFormSchema,
    SubscriptionPlanFormData,
} from '@/schemas/admin.schema';
import { toast } from 'sonner';

export default function CreatePlanPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SubscriptionPlanFormData>({
        resolver: zodResolver(subscriptionPlanFormSchema),
        defaultValues: {
            code: '',
            name: '',
            description: '',
            price_cents: 1000,
            currency: 'USD',
            duration_days: 30,
            is_active: true,
            sort_order: 10,
        },
    });

    const onSubmit = async (data: SubscriptionPlanFormData) => {
        setIsSubmitting(true);
        setError(null);
        try {
            await createSubscriptionPlan({
                ...data,
                code: data.code.trim().toLowerCase(),
                name: data.name.trim(),
                currency: data.currency.trim().toUpperCase(),
            });
            toast.success('Tarif yaratildi');
            router.push('/admin/plans');
        } catch (err) {
            setError(getErrorMessage(err));
            setIsSubmitting(false);
        }
    };

    return (
        <AdminLayout title="Tarif yaratish" description="Yangi premium tarif qo'shish">
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Tarif tafsilotlari</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {error && (
                            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="code">Code *</Label>
                                <Input id="code" placeholder="premium_monthly" {...register('code')} />
                                {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input id="name" placeholder="Premium Monthly" {...register('name')} />
                                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...register('description')}
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="price_cents">Price (cents) *</Label>
                                <Input
                                    id="price_cents"
                                    type="number"
                                    min={1}
                                    {...register('price_cents', { valueAsNumber: true })}
                                />
                                {errors.price_cents && (
                                    <p className="text-sm text-destructive">{errors.price_cents.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency *</Label>
                                <Input id="currency" placeholder="USD" {...register('currency')} />
                                {errors.currency && (
                                    <p className="text-sm text-destructive">{errors.currency.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="duration_days">Duration (days) *</Label>
                                <Input
                                    id="duration_days"
                                    type="number"
                                    min={1}
                                    {...register('duration_days', { valueAsNumber: true })}
                                />
                                {errors.duration_days && (
                                    <p className="text-sm text-destructive">{errors.duration_days.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sort_order">Sort order</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    {...register('sort_order', { valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                id="is_active"
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                {...register('is_active')}
                            />
                            <Label htmlFor="is_active" className="font-normal">
                                Active
                            </Label>
                        </div>

                        <div className="flex gap-3 border-t border-border pt-4">
                            <LoadingButton
                                type="submit"
                                isLoading={isSubmitting}
                                loadingText="Creating..."
                            >
                                Create plan
                            </LoadingButton>
                            <Button type="button" variant="outline" asChild>
                                <Link href="/admin/plans">Cancel</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </AdminLayout>
    );
}

