"use client";

import { Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { getAdminViolations } from "@/api/admin";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
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

  const filtered = useMemo(() => {
    const items = resource.data ?? [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.event_type.toLowerCase().includes(normalized) ||
        (item.user_email ?? "").toLowerCase().includes(normalized) ||
        (item.test_title ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [query, resource.data]);

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
        description="Rate-limit, exam abuse va boshqa audit yozuvlarini shu yerda kuzating."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Jurnal yozuvlari</CardTitle>
            <CardDescription>{resource.data.length} event topildi</CardDescription>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Event type, email yoki test nomi"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState title="Violation yozuvlari topilmadi" description="Qidiruv bo'yicha mos log qaytmadi." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Vaqt</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-[color-mix(in_oklab,#f59e0b_14%,transparent)] p-2 text-amber-600">
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
                          <p className="text-xs text-[var(--muted-foreground)]">{item.user_id ?? "no-user-id"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{item.test_title ?? "Noma'lum test"}</p>
                          {item.attempt_id ? <p className="text-xs text-[var(--muted-foreground)]">{item.attempt_id}</p> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Badge variant="outline">{formatDate(item.created_at)}</Badge>
                          <pre className="max-w-[20rem] overflow-x-auto rounded-xl bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
                            {JSON.stringify(item.details, null, 2)}
                          </pre>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
