'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface Column<T> {
    key: string;
    header: string;
    className?: string;
    render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    emptyState?: React.ReactNode;
    rowKey: (item: T) => string;
    onRowClick?: (item: T) => void;
}

export function DataTable<T>({
    columns,
    data,
    isLoading = false,
    emptyState,
    rowKey,
    onRowClick,
}: DataTableProps<T>) {
    if (isLoading) {
        return (
            <div className="rounded-lg border border-border">
                <div className="w-full overflow-x-auto">
                    <Table className="min-w-[720px]">
                        <TableHeader>
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col.key} className={col.className}>
                                        {col.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                    {columns.map((col) => (
                                        <TableCell key={col.key} className={col.className}>
                                            <Skeleton className="h-5 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card">
                <div className="p-12 text-center">
                    {emptyState || (
                        <div className="text-muted-foreground">
                            <svg
                                className="mx-auto h-12 w-12 mb-4 opacity-50"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                />
                            </svg>
                            <p className="text-sm">No data available</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-border">
            <div className="w-full overflow-x-auto">
                <Table className="min-w-[720px]">
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            {columns.map((col) => (
                                <TableHead key={col.key} className={cn("font-semibold", col.className)}>
                                    {col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow
                                key={rowKey(item)}
                                className={cn(
                                    "transition-colors",
                                    onRowClick && "cursor-pointer hover:bg-muted/50"
                                )}
                                onClick={() => onRowClick?.(item)}
                            >
                                {columns.map((col) => (
                                    <TableCell key={col.key} className={col.className}>
                                        {col.render
                                            ? col.render(item)
                                            : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
