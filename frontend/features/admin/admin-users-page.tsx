"use client";

import { Search, Shield, UserCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { getAdminUsers, updateAdminUser, updateAdminUserSubscription } from "@/api/admin";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useUser } from "@/hooks/use-user";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableCell, TableHead, TableRow } from "@/shared/ui/table";
import { formatDate } from "@/lib/utils";
import type { AdminUserListItem } from "@/types/admin";

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-[1.75rem] bg-[var(--muted)]" />
      <Skeleton className="h-[34rem] rounded-[1.75rem] bg-[var(--muted)]" />
    </div>
  );
}

export function AdminUsersPage() {
  const usersResource = useAsyncResource(getAdminUsers, [], true);
  const { user: currentUser, refreshUser } = useUser();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const users = usersResource.data ?? [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.email.toLowerCase().includes(normalized) ||
        (user.full_name ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [query, usersResource.data]);

  const applyUser = useCallback((nextUser: AdminUserListItem) => {
    usersResource.setData((current) => current?.map((user) => (user.id === nextUser.id ? nextUser : user)) ?? []);
  }, [usersResource]);

  const syncCurrentSessionUser = useCallback(
    async (updatedUserId: string) => {
      if (currentUser?.id !== updatedUserId) {
        return;
      }

      await refreshUser().catch(() => null);
    },
    [currentUser?.id, refreshUser],
  );

  const runAction = useCallback(
    async (userId: string, callback: () => Promise<AdminUserListItem>) => {
      setBusyId(userId);
      setNotice(null);
      try {
        const nextUser = await callback();
        applyUser(nextUser);
        await syncCurrentSessionUser(nextUser.id);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Admin action bajarilmadi.");
      } finally {
        setBusyId(null);
      }
    },
    [applyUser, syncCurrentSessionUser],
  );

  if (usersResource.loading) {
    return <LoadingState />;
  }

  if (usersResource.error || !usersResource.data) {
    return (
      <ErrorState
        title="Foydalanuvchilar yuklanmadi"
        description="Admin foydalanuvchilar jadvalini olishda xatolik yuz berdi."
        error={usersResource.error}
        onRetry={() => void usersResource.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Foydalanuvchilar"
        description="Admin, verification, activation va subscription oqimini shu yerda boshqaring."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>User directory</CardTitle>
            <CardDescription>{usersResource.data.length} foydalanuvchi topildi</CardDescription>
          </div>
          <div className="flex w-full max-w-md items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Email yoki ism bo'yicha qidiring"
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => void usersResource.reload()}>
              Yangilash
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {notice}
            </div>
          ) : null}

          {filteredUsers.length === 0 ? (
            <EmptyState title="Mos foydalanuvchi topilmadi" description="Qidiruv filtri bo'yicha natija qaytmadi." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <TableHead>Profil</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Yaratilgan</TableHead>
                    <TableHead>Amallar</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isBusy = busyId === user.id;
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || user.email}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={user.is_admin ? "success" : "outline"}>
                              {user.is_admin ? "Admin" : "User"}
                            </Badge>
                            <Badge variant={user.is_active ? "success" : "outline"}>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant={user.is_verified ? "success" : "warning"}>
                              {user.is_verified ? "Verified" : "Pending"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={user.is_premium ? "warning" : "outline"}>
                                {user.is_premium ? "Premium" : "Free"}
                              </Badge>
                              <Badge variant="outline">{user.subscription_status ?? "inactive"}</Badge>
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {user.subscription_expires_at ? formatDate(user.subscription_expires_at) : "Muddatsiz emas"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() =>
                                void runAction(user.id, () =>
                                  updateAdminUser(user.id, { is_admin: !user.is_admin }),
                                )
                              }
                            >
                              <Shield className="h-4 w-4" />
                              {user.is_admin ? "Adminni olish" : "Admin qilish"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() =>
                                void runAction(user.id, () =>
                                  updateAdminUser(user.id, { is_verified: !user.is_verified }),
                                )
                              }
                            >
                              <UserCheck className="h-4 w-4" />
                              {user.is_verified ? "Unverify" : "Verify"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() =>
                                void runAction(user.id, () =>
                                  updateAdminUser(user.id, { is_active: !user.is_active }),
                                )
                              }
                            >
                              {user.is_active ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => {
                                const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                                void runAction(user.id, () =>
                                  updateAdminUserSubscription(user.id, {
                                    plan: "premium",
                                    status: "active",
                                    expires_at: expiresAt,
                                  }),
                                );
                              }}
                            >
                              30 kun premium
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isBusy}
                              onClick={() =>
                                void runAction(user.id, () =>
                                  updateAdminUserSubscription(user.id, {
                                    plan: "free",
                                    status: "inactive",
                                    expires_at: null,
                                  }),
                                )
                              }
                            >
                              Revoke
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
