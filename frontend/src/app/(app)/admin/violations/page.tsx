'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage, api } from '@/lib/api';

interface ViolationLog {
    id: string;
    user_id: string | null;
    guest_id: string | null;
    test_id: string | null;
    attempt_id: string | null;
    event_type: string;
    details: Record<string, unknown>;
    created_at: string;
    user_email?: string | null;
    test_title?: string | null;
}

export default function AdminViolationsPage() {
    const [logs, setLogs] = useState<ViolationLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const inFlightRef = useRef(false);

    const loadLogs = async (showSkeleton: boolean = false) => {
        if (inFlightRef.current) {
            return;
        }
        inFlightRef.current = true;
        if (showSkeleton) {
            setIsLoading(true);
        }
        setError(null);
        try {
            const response = await api.get<ViolationLog[]>('/admin/violations');
            setLogs(response.data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
            inFlightRef.current = false;
        }
    };

    useEffect(() => {
        void loadLogs(true);
        const intervalId = window.setInterval(() => {
            void loadLogs();
        }, 10000);
        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    const columns: Column<ViolationLog>[] = [
        {
            key: 'event_type',
            header: 'Event',
            render: (log) => (
                <Badge variant="outline">{log.event_type}</Badge>
            ),
        },
        {
            key: 'user',
            header: 'User',
            render: (log) => (
                <div className="text-sm">
                    <div className="font-medium text-foreground">
                        {log.user_email || 'Guest'}
                    </div>
                    {log.guest_id ? (
                        <div className="text-xs text-muted-foreground">
                            {log.guest_id}
                        </div>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'test',
            header: 'Test',
            render: (log) => (
                <div className="text-sm text-muted-foreground">
                    {log.test_title || log.test_id || 'Unknown'}
                </div>
            ),
        },
        {
            key: 'created_at',
            header: 'Time',
            render: (log) => (
                <div className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                </div>
            ),
        },
        {
            key: 'details',
            header: 'Details',
            render: (log) => (
                <div className="text-xs text-muted-foreground max-w-[280px] truncate">
                    {Object.keys(log.details || {}).length
                        ? JSON.stringify(log.details)
                        : '—'}
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Qoidabuzarliklar"
            description="Copy, screenshot va fokus yo'qolishi kabi holatlar"
        >
            <div className="space-y-4">
                {error ? (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                ) : null}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Umumiy: {isLoading ? '...' : logs.length}
                    </div>
                    <Button variant="outline" onClick={() => void loadLogs(true)}>
                        Yangilash
                    </Button>
                </div>
                <DataTable
                    columns={columns}
                    data={logs}
                    isLoading={isLoading}
                    rowKey={(log) => log.id}
                />
            </div>
        </AdminLayout>
    );
}
