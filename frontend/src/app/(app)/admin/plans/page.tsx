'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { AdminSubscriptionPlan } from '@/schemas/admin.schema';
import {
    deleteSubscriptionPlan,
    getErrorMessage,
    getSubscriptionPlans,
} from '@/lib/admin';

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminSubscriptionPlan | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadPlans = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getSubscriptionPlans();
            setPlans(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPlans();
    }, []);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteSubscriptionPlan(deleteTarget.id);
            setPlans((prev) => prev.filter((plan) => plan.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsDeleting(false);
        }
    };

    const columns: Column<AdminSubscriptionPlan>[] = [
        {
            key: 'name',
            header: 'Plan',
            render: (plan) => (
                <div className="space-y-1">
                    <div className="font-semibold text-foreground">{plan.name}</div>
                    <div className="text-xs text-muted-foreground">{plan.code}</div>
                </div>
            ),
        },
        {
            key: 'price',
            header: 'Price',
            render: (plan) => (
                <div className="text-sm text-foreground">
                    {(plan.price_cents / 100).toFixed(2)} {plan.currency}
                </div>
            ),
        },
        {
            key: 'duration_days',
            header: 'Duration',
            render: (plan) => (
                <div className="text-sm text-muted-foreground">
                    {plan.duration_days} days
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (plan) => (
                <div className={plan.is_active ? 'text-success' : 'text-muted-foreground'}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (plan) => (
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/plans/${plan.id}/edit`}>Edit</Link>
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(plan)}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Premium Plans"
            description="Tariflar, narxlar va muddatlarni boshqarish"
        >
            <div className="space-y-4">
                {error ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        Umumiy: {isLoading ? '...' : plans.length}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={loadPlans}>
                            Yangilash
                        </Button>
                        <Button asChild>
                            <Link href="/admin/plans/create">Yangi tarif</Link>
                        </Button>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={plans}
                    isLoading={isLoading}
                    rowKey={(plan) => plan.id}
                />
            </div>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Tarifni o'chirish"
                description="Tarif butunlay o'chiriladi. Davom etasizmi?"
                confirmText="Delete"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={handleDelete}
            />
        </AdminLayout>
    );
}

