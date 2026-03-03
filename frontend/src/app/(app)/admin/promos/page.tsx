'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { AdminPromoCode } from '@/schemas/admin.schema';
import { deletePromoCode, getErrorMessage, getPromoCodes } from '@/lib/admin';

export default function AdminPromosPage() {
    const [promos, setPromos] = useState<AdminPromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminPromoCode | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadPromos = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getPromoCodes();
            setPromos(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPromos();
    }, []);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deletePromoCode(deleteTarget.id);
            setPromos((prev) => prev.filter((promo) => promo.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsDeleting(false);
        }
    };

    const columns: Column<AdminPromoCode>[] = [
        {
            key: 'code',
            header: 'Code',
            render: (promo) => (
                <div className="space-y-1">
                    <div className="font-semibold text-foreground">{promo.code}</div>
                    {promo.name ? (
                        <div className="text-xs text-muted-foreground">{promo.name}</div>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'discount',
            header: 'Discount',
            render: (promo) => (
                <div className="text-sm text-foreground">
                    {promo.discount_type === 'percent'
                        ? `${promo.discount_value}%`
                        : `${promo.discount_value} so'm`}
                </div>
            ),
        },
        {
            key: 'usage',
            header: 'Usage',
            render: (promo) => (
                <div className="text-xs text-muted-foreground">
                    {promo.redeemed_count} /
                    {promo.max_redemptions ? ` ${promo.max_redemptions}` : ' ∞'}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (promo) => (
                <div className={promo.is_active ? 'text-success' : 'text-muted-foreground'}>
                    {promo.is_active ? 'Active' : 'Inactive'}
                </div>
            ),
        },
        {
            key: 'plans',
            header: 'Plans',
            render: (promo) => (
                <div className="text-xs text-muted-foreground">
                    {promo.applicable_plan_ids.length === 0
                        ? 'All plans'
                        : `${promo.applicable_plan_ids.length} selected`}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (promo) => (
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/promos/${promo.id}/edit`}>Edit</Link>
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(promo)}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Promokodlar"
            description="Promokodlarni yaratish, faollashtirish va tahrirlash"
        >
            <div className="space-y-4">
                {error ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        Umumiy: {isLoading ? '...' : promos.length}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={loadPromos}>
                            Yangilash
                        </Button>
                        <Button asChild>
                            <Link href="/admin/promos/create">Yangi promokod</Link>
                        </Button>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={promos}
                    isLoading={isLoading}
                    rowKey={(promo) => promo.id}
                />
            </div>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Promokodni o'chirish"
                description="Promokod butunlay o'chiriladi. Davom etasizmi?"
                confirmText="Delete"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={handleDelete}
            />
        </AdminLayout>
    );
}
