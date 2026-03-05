'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/common/LoadingButton';
import {
    getErrorMessage,
    getSubscriptionPlans,
    updateSubscriptionPlan,
} from '@/lib/admin';
import {
    subscriptionPlanFormSchema,
    SubscriptionPlanFormData,
} from '@/schemas/admin.schema';
import { toast } from 'sonner';

export default function EditPlanPage() {
    const router = useRouter();
    const params = useParams();
    const planId = params?.id as string;
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SubscriptionPlanFormData>({
        resolver: zodResolver(subscriptionPlanFormSchema),
        defaultValues: {
            code: '',
            name: '',
            description: '',
            price_cents: 10000,
            currency: 'UZS',
            duration_days: 30,
            is_active: true,
            sort_order: 10,
        },
    });

    useEffect(() => {
        async function loadPlan() {
            setIsLoading(true);
            setError(null);
            try {
                const plans = await getSubscriptionPlans();
                const plan = plans.find((item) => item.id === planId);
                if (!plan) {
                    setError('Plan not found');
                    return;
                }
                reset({
                    code: plan.code,
                    name: plan.name,
                    description: plan.description ?? '',
                    price_cents: Math.max(1, Math.round(plan.price_cents / 100)),
                    currency: 'UZS',
                    duration_days: plan.duration_days,
                    is_active: plan.is_active,
                    sort_order: plan.sort_order,
                });
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setIsLoading(false);
            }
        }
        if (planId) {
            loadPlan();
        }
    }, [planId, reset]);

    const onSubmit = async (data: SubscriptionPlanFormData) => {
        setIsSubmitting(true);
        setError(null);
        try {
            await updateSubscriptionPlan(planId, {
                ...data,
                code: data.code.trim().toLowerCase(),
                name: data.name.trim(),
                price_cents: Math.max(1, Math.round(data.price_cents * 100)),
                currency: 'UZS',
            });
            toast.success('Tarif yangilandi');
            router.push('/admin/plans');
        } catch (err) {
            setError(getErrorMessage(err));
            setIsSubmitting(false);
        }
    };

    return (
        <AdminLayout title="Tarifni tahrirlash" description="Tarif sozlamalarini yangilash">
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Tarif tafsilotlari</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-sm text-muted-foreground">Yuklanmoqda...</div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {error && (
                                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                                    {error}
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Kod *</Label>
                                    <Input id="code" placeholder="premium_monthly" {...register('code')} />
                                    {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nomi *</Label>
                                    <Input id="name" placeholder="Premium oylik" {...register('name')} />
                                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Tavsif</Label>
                                <textarea
                                    id="description"
                                    className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...register('description')}
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="price_cents">Narx (so&apos;m) *</Label>
                                    <Input
                                        id="price_cents"
                                        type="number"
                                        min={1}
                                        step={1}
                                        {...register('price_cents', { valueAsNumber: true })}
                                    />
                                    {errors.price_cents && (
                                        <p className="text-sm text-destructive">{errors.price_cents.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency">Valyuta *</Label>
                                    <Input id="currency" value="UZS" readOnly disabled />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="duration_days">Davomiyligi (kun) *</Label>
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
                                    <Label htmlFor="sort_order">Saralash tartibi</Label>
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
                                    Faol
                                </Label>
                            </div>

                            <div className="flex gap-3 border-t border-border pt-4">
                                <LoadingButton
                                    type="submit"
                                    isLoading={isSubmitting}
                                    loadingText="Saqlanmoqda..."
                                >
                                    Saqlash
                                </LoadingButton>
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/admin/plans">Bekor qilish</Link>
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
