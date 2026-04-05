"use client";

import { RefreshCcw, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { getAdminViolations } from "@/api/admin";
import { AdminActionMenu, AdminJsonPreview, AdminSurface, AdminTableShell, AdminToolbar } from "@/features/admin/admin-ui";
import { useAsyncResource } from "@/hooks/use-async-resource";
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

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-[1.75rem] bg-[var(--muted)]" />
      <Skeleton className="h-[34rem] rounded-[1.75rem] bg-[var(--muted)]" />
    </div>
  );
}

export function AdminViolationsPage() {
  const resource = useAsyncResource(getAdminViolations, [], true);
  const [query, setQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [selectedViolationId, setSelectedViolationId] = useState<string | null>(null);

  const eventOptions = useMemo(() => {
    const events = new Set((resource.data ?? []).map((item) => item.event_type));
    return Array.from(events).sort();
  }, [resource.data]);

  const filtered = useMemo(() => {
    const items = resource.data ?? [];
    const normalized = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.event_type.toLowerCase().includes(normalized) ||
        (item.user_email ?? "").toLowerCase().includes(normalized) ||
        (item.test_title ?? "").toLowerCase().includes(normalized) ||
        item.id.toLowerCase().includes(normalized);

      const matchesEvent = eventFilter === "all" || item.event_type === eventFilter;
      const matchesActor =
        actorFilter === "all" ||
        (actorFilter === "user" && Boolean(item.user_id)) ||
        (actorFilter === "guest" && !item.user_id);

      return matchesQuery && matchesEvent && matchesActor;
    });
  }, [actorFilter, eventFilter, query, resource.data]);

  const selectedViolation = useMemo(
    () => resource.data?.find((item) => item.id === selectedViolationId) ?? null,
    [resource.data, selectedViolationId],
  );

  if (resource.loading) {
    return <LoadingState />;
  }

  if (resource.error || !resource.data) {
    return (
      <ErrorState
        title="Violation log yuklanmadi"
        description="Admin buzilishlar jurnalini yuklashda xatolik bo'ldi."
        error={resource.error}
        onRetry={() => void resource.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Violation log"
        description="Audit yozuvlarini jadval formatida tez skan qiling, JSON tafsilotlarini esa kerak bo'lganda oching."
        action={
          <Button onClick={() => void resource.reload()}>
            <RefreshCcw className="h-4 w-4" />
            Yangilash
          </Button>
        }
      />

      <AdminToolbar
        search={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Event, user, test yoki log id bo'yicha qidiring"
              className="pl-9"
            />
          </div>
        }
        filters={
          <>
            <Select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="min-w-44">
              <option value="all">Barcha eventlar</option>
              {eventOptions.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </Select>
            <Select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)} className="min-w-36">
              <option value="all">Barcha aktorlar</option>
              <option value="user">Faqat user</option>
              <option value="guest">Faqat guest</option>
            </Select>
          </>
        }
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setEventFilter("all");
              setActorFilter("all");
            }}
          >
            Filtrlarni tozalash
          </Button>
        }
      />

      <AdminSurface
        title="Jurnal yozuvlari"
        description={`${filtered.length} ta yozuv ko'rinmoqda. Jadval minimal, JSON esa collapsible preview va detail modalda.`}
      >
        <div className="p-5">
          {filtered.length === 0 ? (
            <EmptyState title="Violation yozuvlari topilmadi" description="Qidiruv va filtr bo'yicha natija qaytmadi." />
          ) : (
            <AdminTableShell>
              <Table>
                <thead className="bg-[var(--muted)]/35">
                  <tr>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Vaqt</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="align-top">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl bg-[var(--accent-yellow-soft)] p-2 text-[var(--accent-yellow)]">
                            <ShieldAlert className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{item.event_type}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{item.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{item.user_email ?? item.guest_id ?? "Guest"}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{item.user_id ?? "guest-actor"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{item.test_title ?? "Noma'lum test"}</p>
                          {item.attempt_id ? <p className="text-xs text-[var(--muted-foreground)]">{item.attempt_id}</p> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="muted">{formatDate(item.created_at)}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[16rem]">
                        <AdminJsonPreview value={item.details} label="View JSON" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedViolationId(item.id)}>
                            View details
                          </Button>
                          <AdminActionMenu
                            items={[
                              {
                                label: "Shu event bo'yicha filtrlash",
                                onClick: () => setEventFilter(item.event_type),
                              },
                              {
                                label: "Shu foydalanuvchini qidirish",
                                onClick: () => setQuery(item.user_email ?? item.guest_id ?? item.id),
                              },
                            ]}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </AdminTableShell>
          )}
        </div>
      </AdminSurface>

      <Modal open={Boolean(selectedViolation)} onClose={() => setSelectedViolationId(null)} title={selectedViolation ? `${selectedViolation.event_type} details` : "Violation details"}>
        {selectedViolation ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--muted-foreground)]">Actor</p>
                <p className="mt-2 font-medium">{selectedViolation.user_email ?? selectedViolation.guest_id ?? "Guest"}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{selectedViolation.user_id ?? "guest-actor"}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--muted-foreground)]">Test / Attempt</p>
                <p className="mt-2 font-medium">{selectedViolation.test_title ?? "Noma'lum test"}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{selectedViolation.attempt_id ?? "attempt-id yo'q"}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/35 p-4">
              <p className="text-sm text-[var(--muted-foreground)]">Yaratilgan vaqt</p>
              <p className="mt-2 font-medium">{formatDate(selectedViolation.created_at)}</p>
            </div>
            <AdminJsonPreview value={selectedViolation.details} label="To'liq JSON" />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
