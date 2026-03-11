'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { SurfaceNav } from '@/components/intelligence/SurfaceNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminNav } from '@/config/navigation';
import {
    AdminUser,
    type AdminUserSubscriptionUpdate,
    type AdminUserUpdate,
} from '@/schemas/admin.schema';
import {
    getUsers,
    updateUser,
    updateUserSubscription,
    getErrorMessage,
} from '@/lib/admin';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const filteredUsers = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return users;
        return users.filter((user) =>
            user.email.toLowerCase().includes(q) ||
            (user.full_name ?? '').toLowerCase().includes(q)
        );
    }, [users, query]);

    const applyUserUpdate = useCallback((updated: AdminUser) => {
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    }, []);

    const handleToggle = useCallback(
        async (user: AdminUser, patch: AdminUserUpdate) => {
            try {
                const updated = await updateUser(user.id, patch);
                applyUserUpdate(updated);
            } catch (err) {
                setError(getErrorMessage(err));
            }
        },
        [applyUserUpdate]
    );

    const handleSubscription = useCallback(
        async (user: AdminUser, patch: AdminUserSubscriptionUpdate) => {
            try {
                const updated = await updateUserSubscription(user.id, patch);
                applyUserUpdate(updated);
            } catch (err) {
                setError(getErrorMessage(err));
            }
        },
        [applyUserUpdate]
    );

    const columns: Column<AdminUser>[] = [
        {
            key: 'email',
            header: 'Email',
            render: (user) => (
                <div className="space-y-1">
                    <div className="font-medium text-foreground">{user.email}</div>
                    {user.full_name ? (
                        <div className="text-xs text-muted-foreground">{user.full_name}</div>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (user) => (
                <div className="space-y-1 text-xs">
                    <div className={user.is_active ? 'text-success' : 'text-destructive'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                    </div>
                    <div className={user.is_verified ? 'text-foreground' : 'text-muted-foreground'}>
                        {user.is_verified ? 'Verified' : 'Unverified'}
                    </div>
                    <div className={user.is_admin ? 'text-primary' : 'text-muted-foreground'}>
                        {user.is_admin ? 'Admin' : 'User'}
                    </div>
                </div>
            ),
        },
        {
            key: 'plan',
            header: 'Plan',
            render: (user) => (
                <div className="space-y-1 text-xs">
                    <div className={user.is_premium ? 'text-amber-600' : 'text-muted-foreground'}>
                        {user.is_premium ? 'Premium' : 'Free'}
                    </div>
                    <div className="text-muted-foreground">
                        {user.subscription_status ?? 'inactive'}
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (user) => (
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(user, { is_admin: !user.is_admin })}
                    >
                        {user.is_admin ? 'Remove admin' : 'Make admin'}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(user, { is_active: !user.is_active })}
                    >
                        {user.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(user, { is_verified: !user.is_verified })}
                    >
                        {user.is_verified ? 'Unverify' : 'Verify'}
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                            handleSubscription(user, {
                                plan: 'premium',
                                status: 'active',
                                expires_at: expires,
                            });
                        }}
                    >
                        Grant 30d
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                            handleSubscription(user, {
                                plan: 'free',
                                status: 'inactive',
                                expires_at: null,
                            })
                        }
                    >
                        Revoke
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Foydalanuvchilar"
            description="Foydalanuvchilar ro'yxati va hisoblarini boshqarish"
        >
            <div className="space-y-4">
                <div className="intelligence-panel p-6">
                    <SurfaceNav items={adminNav} />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">
                            Umumiy: {isLoading ? '...' : users.length}
                        </div>
                        {error ? (
                            <div className="text-sm text-destructive">{error}</div>
                        ) : null}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Email yoki ism bo'yicha qidirish"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="w-full sm:w-72"
                        />
                        <Button variant="outline" onClick={loadUsers}>
                            Yangilash
                        </Button>
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={filteredUsers}
                    isLoading={isLoading}
                    rowKey={(user) => user.id}
                />
            </div>
        </AdminLayout>
    );
}
