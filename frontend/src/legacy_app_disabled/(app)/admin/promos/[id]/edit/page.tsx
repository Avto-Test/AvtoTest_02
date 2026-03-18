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
import { getErrorMessage, getPromoCodes, getSubscriptionPlans, updatePromoCode } from '@/lib/admin';
import { promoCodeFormSchema, PromoCodeFormData, AdminSubscriptionPlan } from '@/schemas/admin.schema';
import { toast } from 'sonner';

function toIsoOrUndefined(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
}

function toLocalInput(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function EditPromoPage() {
    const router = useRouter();
    const params = useParams();
    const promoId = params?.id as string;
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<PromoCodeFormData>({
        resolver: zodResolver(promoCodeFormSchema),
        defaultValues: {
            code: '',
            name: '',
            description: '',
            discount_type: 'percent',
            discount_value: 10,
            max_redemptions: undefined,
            starts_at: '',
            expires_at: '',
            is_active: true,
            applicable_plan_ids: [],
        },
    });
    const selectedPlanIds = watch('applicable_plan_ids');

    useEffect(() => {
        async function loadPromoAndPlans() {
            setIsLoading(true);
            setError(null);
            try {
                const [promos, plansList] = await Promise.all([
                    getPromoCodes(),
                    getSubscriptionPlans(),
                ]);
                setPlans(plansList.filter((plan) => plan.is_active));
                const promo = promos.find((item) => item.id === promoId);
                if (!promo) {
                    setError('Promo code not found');
                    return;
                }
                reset({
                    code: promo.code,
                    name: promo.name ?? '',
                    description: promo.description ?? '',
                    discount_type: promo.discount_type,
                    discount_value: promo.discount_value,
                    max_redemptions: promo.max_redemptions ?? undefined,
                    starts_at: toLocalInput(promo.starts_at),
                    expires_at: toLocalInput(promo.expires_at),
                    is_active: promo.is_active,
                    applicable_plan_ids: promo.applicable_plan_ids ?? [],
                });
            } catch (err) {
                setError(getErrorMessage(err));
            } finally {
                setIsLoading(false);
            }
        }
        if (promoId) {
            loadPromoAndPlans();
        }
    }, [promoId, reset]);

    const togglePlan = (planId: string, checked: boolean) => {
        const current = selectedPlanIds ?? [];
        if (checked) {
            const next = Array.from(new Set([...current, planId]));
            setValue('applicable_plan_ids', next, { shouldValidate: true });
            return;
        }
        setValue(
            'applicable_plan_ids',
            current.filter((id) => id !== planId),
            { shouldValidate: true },
        );
    };

    const onSubmit = async (data: PromoCodeFormData) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const payload = {
                ...data,
                code: data.code.trim().toUpperCase(),
                max_redemptions: data.max_redemptions || undefined,
                starts_at: toIsoOrUndefined(data.starts_at),
                expires_at: toIsoOrUndefined(data.expires_at),
            };
            await updatePromoCode(promoId, payload);
            toast.success('Promokod yangilandi');
            router.push('/admin/promos');
        } catch (err) {
            setError(getErrorMessage(err));
            setIsSubmitting(false);
        }
    };

    return (
        <AdminLayout title="Promokodni tahrirlash" description="Promokod sozlamalarini yangilash">
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Promokod tafsilotlari</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {error && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="code">Code *</Label>
                                <Input id="code" placeholder="PROMO2026" {...register('code')} />
                                {errors.code && (
                                    <p className="text-sm text-destructive">{errors.code.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" {...register('name')} />
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
                                    <Label htmlFor="discount_type">Discount type</Label>
                                    <select
                                        id="discount_type"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        {...register('discount_type')}
                                    >
                                        <option value="percent">Percent</option>
                                        <option value="fixed">Fixed amount</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="discount_value">Discount value *</Label>
                                    <Input
                                        id="discount_value"
                                        type="number"
                                        min={1}
                                        {...register('discount_value', { valueAsNumber: true })}
                                    />
                                    {errors.discount_value && (
                                        <p className="text-sm text-destructive">{errors.discount_value.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="max_redemptions">Max redemptions</Label>
                                    <Input
                                        id="max_redemptions"
                                        type="number"
                                        min={1}
                                        placeholder="Unlimited"
                                        {...register('max_redemptions', {
                                            setValueAs: (value) => (value === '' ? undefined : Number(value)),
                                        })}
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-8">
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
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="starts_at">Starts at</Label>
                                    <Input id="starts_at" type="datetime-local" {...register('starts_at')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="expires_at">Expires at</Label>
                                    <Input id="expires_at" type="datetime-local" {...register('expires_at')} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Applicable plans</Label>
                                <p className="text-xs text-muted-foreground">
                                    Hech biri tanlanmasa, promokod barcha tariflarda ishlaydi.
                                </p>
                                <div className="space-y-2 rounded-lg border border-border p-3">
                                    {plans.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">
                                            Faol tariflar topilmadi
                                        </div>
                                    ) : (
                                        plans.map((plan) => (
                                            <label key={plan.id} className="flex items-center gap-3 text-sm">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300"
                                                    checked={(selectedPlanIds ?? []).includes(plan.id)}
                                                    onChange={(event) => togglePlan(plan.id, event.target.checked)}
                                                />
                                                <span>
                                                    {plan.name} ({(plan.price_cents / 100).toFixed(2)} {plan.currency})
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-border">
                                <LoadingButton
                                    type="submit"
                                    isLoading={isSubmitting}
                                    loadingText="Saving..."
                                >
                                    Save changes
                                </LoadingButton>
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/admin/promos">Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </AdminLayout>
    );
}
