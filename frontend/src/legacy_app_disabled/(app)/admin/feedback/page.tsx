'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/components/i18n-provider';
import { getErrorMessage } from '@/lib/api';
import { getAdminFeedback, updateAdminFeedback } from '@/lib/feedback';
import { FeedbackItem } from '@/schemas/feedback.schema';

const STATUS_OPTIONS = ['new', 'reviewed', 'planned', 'resolved', 'rejected'] as const;

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const normalized = status.toLowerCase();
    if (normalized === 'resolved') return 'default';
    if (normalized === 'rejected') return 'destructive';
    if (normalized === 'reviewed' || normalized === 'planned') return 'secondary';
    return 'outline';
}

export default function AdminFeedbackPage() {
    const { t } = useI18n();
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    const load = async (filter?: string) => {
        setIsLoading(true);
        try {
            const data = await getAdminFeedback(filter);
            setItems(data);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleStatusUpdate = async (item: FeedbackItem, nextStatus: string) => {
        setSavingId(item.id);
        try {
            const updated = await updateAdminFeedback(item.id, {
                status: nextStatus,
                admin_note: noteDrafts[item.id] ?? item.admin_note ?? '',
            });
            setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSavingId(null);
        }
    };

    const columns: Column<FeedbackItem>[] = [
        {
            key: 'user',
            header: 'User',
            render: (item) => (
                <div className="space-y-1">
                    <div className="font-medium">{item.user_email || item.user_id}</div>
                    <div className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</div>
                </div>
            ),
        },
        {
            key: 'content',
            header: 'Feedback',
            render: (item) => (
                <div className="space-y-1">
                    <Badge variant="secondary">{item.rating}/5</Badge>
                    <p className="text-sm">{item.comment}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (item) => (
                <div className="space-y-2 min-w-[220px]">
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        defaultValue={item.status}
                        onChange={(event) => handleStatusUpdate(item, event.target.value)}
                        disabled={savingId === item.id}
                    >
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    <textarea
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                        rows={3}
                        placeholder={t("feedback.reply")}
                        value={noteDrafts[item.id] ?? item.admin_note ?? ''}
                        onChange={(event) =>
                            setNoteDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                        }
                        disabled={savingId === item.id}
                    />
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(item, item.status)}
                        disabled={savingId === item.id}
                    >
                        {t("feedback.save_reply")}
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title={t("feedback.admin_title")}
            description={t("feedback.admin_description")}
            actions={
                <div className="flex gap-2">
                    <select
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        <option value="">All statuses</option>
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                    <Button variant="outline" onClick={() => load(statusFilter || undefined)}>
                        Apply
                    </Button>
                    <Button variant="outline" onClick={() => load()}>
                        Refresh
                    </Button>
                </div>
            }
        >
            {error ? (
                <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <DataTable
                columns={columns}
                data={items}
                isLoading={isLoading}
                rowKey={(item) => item.id}
            />
        </AdminLayout>
    );
}
