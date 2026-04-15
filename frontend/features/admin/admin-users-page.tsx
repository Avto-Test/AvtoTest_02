"use client";

import { Crown, RefreshCcw, Search, Shield, UserCheck, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { getAdminUsers, updateAdminUser, updateAdminUserSubscription } from "@/api/admin";
import { AdminActionMenu, AdminStatCard, AdminSurface, AdminTableShell, AdminToolbar } from "@/features/admin/admin-ui";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { useUser } from "@/hooks/use-user";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableCell, TableHead, TableRow } from "@/shared/ui/table";
import type { AdminUserListItem } from "@/types/admin";

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-[1.75rem] bg-[var(--muted)]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-28 rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-28 rounded-[1.75rem] bg-[var(--muted)]" />
        <Skeleton className="h-28 rounded-[1.75rem] bg-[var(--muted)]" />
      </div>
      <Skeleton className="h-[34rem] rounded-[1.75rem] bg-[var(--muted)]" />
    </div>
  );
}

function getNextActionHint(user: AdminUserListItem) {
  if (!user.is_verified) {
    return "Keyingi amaliy qadam: foydalanuvchini verifikatsiyadan o'tkazing.";
  }

  if (!user.is_active) {
    return "Keyingi amaliy qadam: akkauntni qayta faollashtiring.";
  }

  if (!user.is_premium) {
    return "Keyingi amaliy qadam: kerak bo'lsa premium kirishni vaqtinchalik yoqing.";
  }

  return "Keyingi amaliy qadam: rol va subscription muddatini tekshirib turing.";
}

export function AdminUsersPage() {
  const usersResource = useAsyncResource(getAdminUsers, [], true);
  const { user: currentUser, refreshUser } = useUser();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const users = usersResource.data ?? [];
    const normalized = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesQuery =
        !normalized ||
        user.email.toLowerCase().includes(normalized) ||
        (user.full_name ?? "").toLowerCase().includes(normalized);

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && user.is_admin) ||
        (roleFilter === "user" && !user.is_admin);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active) ||
        (statusFilter === "verified" && user.is_verified) ||
        (statusFilter === "pending" && !user.is_verified);

      const matchesSubscription =
        subscriptionFilter === "all" ||
        (subscriptionFilter === "premium" && user.is_premium) ||
        (subscriptionFilter === "free" && !user.is_premium) ||
        (subscriptionFilter === "active" && user.subscription_status === "active") ||
        (subscriptionFilter === "inactive" && user.subscription_status !== "active");

      return matchesQuery && matchesRole && matchesStatus && matchesSubscription;
    });
  }, [query, roleFilter, statusFilter, subscriptionFilter, usersResource.data]);

  const selectedUser = useMemo(
    () => usersResource.data?.find((entry) => entry.id === selectedUserId) ?? null,
    [selectedUserId, usersResource.data],
  );

  const counts = useMemo(() => {
    const users = usersResource.data ?? [];
    return {
      total: users.length,
      active: users.filter((user) => user.is_active).length,
      pending: users.filter((user) => !user.is_verified).length,
      premium: users.filter((user) => user.is_premium).length,
      admins: users.filter((user) => user.is_admin).length,
    };
  }, [usersResource.data]);

  const applyUser = useCallback(
    (nextUser: AdminUserListItem) => {
      usersResource.setData((current) => current?.map((user) => (user.id === nextUser.id ? nextUser : user)) ?? []);
    },
    [usersResource],
  );

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

  const clearFilters = () => {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setSubscriptionFilter("all");
  };

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
        description="Rol, status va subscription boshqaruvini toza jadval oqimida yuriting."
        action={
          <Button onClick={() => void usersResource.reload()}>
            <RefreshCcw className="h-4 w-4" />
            Yangilash
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Jami foydalanuvchi" value={counts.total} caption={`${filteredUsers.length} ta natija ko'rinmoqda`} icon={Users} />
        <AdminStatCard label="Faol akkauntlar" value={counts.active} caption={`${counts.admins} admin rol mavjud`} icon={Shield} tone="success" />
        <AdminStatCard label="Verifikatsiya kutmoqda" value={counts.pending} caption="Tasdiqlanmagan foydalanuvchilar navbati" icon={UserCheck} tone="warning" />
        <AdminStatCard label="Premium subscription" value={counts.premium} caption="Faol va vaqtinchalik premiumlar" icon={Crown} tone="primary" />
      </div>

      <AdminToolbar
        search={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ism yoki email bo'yicha qidiring"
              className="pl-9"
            />
          </div>
        }
        filters={
          <>
            <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="min-w-36">
              <option value="all">Barcha rollar</option>
              <option value="admin">Faqat admin</option>
              <option value="user">Faqat user</option>
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-40">
              <option value="all">Barcha status</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </Select>
            <Select value={subscriptionFilter} onChange={(event) => setSubscriptionFilter(event.target.value)} className="min-w-44">
              <option value="all">Barcha subscription</option>
              <option value="premium">Premium</option>
              <option value="free">Free</option>
              <option value="active">Subscription active</option>
              <option value="inactive">Subscription inactive</option>
            </Select>
          </>
        }
        actions={
          <Button variant="outline" onClick={clearFilters}>
            Filtrlarni tozalash
          </Button>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-[var(--accent-yellow-strong)] bg-[var(--accent-yellow-soft)] px-4 py-3 text-sm text-[var(--accent-yellow)]">
          {notice}
        </div>
      ) : null}

      <AdminSurface
        title="User directory"
        description="Minimal jadvalda faqat eng muhim maydonlar ko'rsatiladi, qolgan amallar `Manage` ichiga jamlandi."
      >
        <div className="p-5">
          {filteredUsers.length === 0 ? (
            <EmptyState title="Mos foydalanuvchi topilmadi" description="Qidiruv va filtr bo'yicha natija qaytmadi." />
          ) : (
            <AdminTableShell>
              <Table>
                <thead className="bg-[var(--muted)]/35">
                  <tr>
                    <TableHead>Foydalanuvchi</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Yaratilgan</TableHead>
                    <TableHead className="w-[132px] text-right">Amallar</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isBusy = busyId === user.id;
                    return (
                      <TableRow key={user.id} className="align-top">
                        <TableCell>
                          <p className="font-medium">{user.full_name || user.email}</p>
                        </TableCell>
                        <TableCell className="text-[var(--muted-foreground)]">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.is_admin ? "success" : "muted"}>
                            {user.is_admin ? "Admin" : "User"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={user.is_active ? "success" : "muted"}>
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
                              <Badge variant={user.is_premium ? "success" : "muted"}>
                                {user.is_premium ? "Premium" : "Free"}
                              </Badge>
                              <Badge variant={user.subscription_status === "active" ? "success" : "muted"}>
                                {user.subscription_status ?? "inactive"}
                              </Badge>
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {user.subscription_expires_at ? formatDate(user.subscription_expires_at) : "Muddat belgilanmagan"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-[var(--muted-foreground)]">{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" disabled={isBusy} onClick={() => setSelectedUserId(user.id)}>
                              Manage
                            </Button>
                            <AdminActionMenu
                              items={[
                                {
                                  label: user.is_admin ? "Adminni bekor qilish" : "Admin qilish",
                                  disabled: isBusy,
                                  onClick: () => void runAction(user.id, () => updateAdminUser(user.id, { is_admin: !user.is_admin })),
                                },
                                {
                                  label: user.is_verified ? "Verifikatsiyani bekor qilish" : "Verify qilish",
                                  disabled: isBusy,
                                  onClick: () => void runAction(user.id, () => updateAdminUser(user.id, { is_verified: !user.is_verified })),
                                },
                                {
                                  label: user.is_active ? "Disable qilish" : "Enable qilish",
                                  disabled: isBusy,
                                  onClick: () => void runAction(user.id, () => updateAdminUser(user.id, { is_active: !user.is_active })),
                                },
                                {
                                  label: user.is_premium ? "Premiumni 30 kunga uzaytirish" : "30 kun premium berish",
                                  disabled: isBusy,
                                  onClick: () => {
                                    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                                    void runAction(user.id, () =>
                                      updateAdminUserSubscription(user.id, {
                                        plan: "premium",
                                        status: "active",
                                        expires_at: expiresAt,
                                      }),
                                    );
                                  },
                                },
                                {
                                  label: "Premiumni bekor qilish",
                                  disabled: isBusy || !user.is_premium,
                                  tone: "danger",
                                  onClick: () =>
                                    void runAction(user.id, () =>
                                      updateAdminUserSubscription(user.id, {
                                        plan: "free",
                                        status: "inactive",
                                        expires_at: null,
                                      }),
                                    ),
                                },
                              ]}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </tbody>
              </Table>
            </AdminTableShell>
          )}
        </div>
      </AdminSurface>

      <Modal open={Boolean(selectedUser)} onClose={() => setSelectedUserId(null)} title={selectedUser ? `${selectedUser.full_name || selectedUser.email} boshqaruvi` : "Foydalanuvchi boshqaruvi"}>
        {selectedUser ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/35 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{selectedUser.full_name || selectedUser.email}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{selectedUser.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selectedUser.is_admin ? "success" : "muted"}>{selectedUser.is_admin ? "Admin" : "User"}</Badge>
                  <Badge variant={selectedUser.is_active ? "success" : "muted"}>{selectedUser.is_active ? "Active" : "Inactive"}</Badge>
                  <Badge variant={selectedUser.is_verified ? "success" : "warning"}>{selectedUser.is_verified ? "Verified" : "Pending"}</Badge>
                  <Badge variant={selectedUser.is_premium ? "success" : "muted"}>{selectedUser.is_premium ? "Premium" : "Free"}</Badge>
                </div>
              </div>
              <p className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--muted-foreground)]">
                {getNextActionHint(selectedUser)}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Button
                variant="outline"
                disabled={busyId === selectedUser.id}
                onClick={() =>
                  void runAction(selectedUser.id, () =>
                    updateAdminUser(selectedUser.id, { is_admin: !selectedUser.is_admin }),
                  )
                }
              >
                <Shield className="h-4 w-4" />
                {selectedUser.is_admin ? "Adminni bekor qilish" : "Admin qilish"}
              </Button>
              <Button
                variant="outline"
                disabled={busyId === selectedUser.id}
                onClick={() =>
                  void runAction(selectedUser.id, () =>
                    updateAdminUser(selectedUser.id, { is_verified: !selectedUser.is_verified }),
                  )
                }
              >
                <UserCheck className="h-4 w-4" />
                {selectedUser.is_verified ? "Verifikatsiyani bekor qilish" : "Verify qilish"}
              </Button>
              <Button
                variant="outline"
                disabled={busyId === selectedUser.id}
                onClick={() =>
                  void runAction(selectedUser.id, () =>
                    updateAdminUser(selectedUser.id, { is_active: !selectedUser.is_active }),
                  )
                }
              >
                {selectedUser.is_active ? "Disable qilish" : "Enable qilish"}
              </Button>
              <Button
                disabled={busyId === selectedUser.id}
                onClick={() => {
                  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                  void runAction(selectedUser.id, () =>
                    updateAdminUserSubscription(selectedUser.id, {
                      plan: "premium",
                      status: "active",
                      expires_at: expiresAt,
                    }),
                  );
                }}
              >
                <Crown className="h-4 w-4" />
                {selectedUser.is_premium ? "Premiumni 30 kunga uzaytirish" : "30 kun premium berish"}
              </Button>
              <Button
                variant="destructive"
                disabled={busyId === selectedUser.id || !selectedUser.is_premium}
                onClick={() =>
                  void runAction(selectedUser.id, () =>
                    updateAdminUserSubscription(selectedUser.id, {
                      plan: "free",
                      status: "inactive",
                      expires_at: null,
                    }),
                  )
                }
              >
                Premiumni bekor qilish
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
