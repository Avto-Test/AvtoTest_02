'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { InstructorAdminSubmenu } from '@/components/admin/driving-instructors/InstructorAdminSubmenu';
import { formatDate, leadStatusView } from '@/components/admin/driving-instructors/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import { adminGetDrivingInstructorLeads, adminGetDrivingInstructors, adminUpdateDrivingInstructorLeadStatus } from '@/lib/drivingInstructors';
import { DrivingInstructorLeadItem } from '@/schemas/drivingInstructor.schema';
import { cn } from '@/lib/utils';

const statuses = ['new', 'contacted', 'qualified', 'closed'];

export default function AdminDrivingInstructorLeadsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DrivingInstructorLeadItem[]>([]);
  const [instructorFilter, setInstructorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [instructorOptions, setInstructorOptions] = useState<Array<{ id: string; name: string }>>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [leadRows, instructors] = await Promise.all([
        adminGetDrivingInstructorLeads(),
        adminGetDrivingInstructors(),
      ]);
      setRows(leadRows);
      setInstructorOptions(instructors.map((item) => ({ id: item.id, name: item.full_name })));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return rows.filter((row) => {
      if (instructorFilter !== 'all' && row.instructor_id !== instructorFilter) return false;
      if (statusFilter !== 'all' && row.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      const createdAt = new Date(row.created_at).getTime();
      if (fromMs !== null && createdAt < fromMs) return false;
      if (toMs !== null && createdAt > toMs) return false;
      if (query) {
        const haystack = `${row.full_name} ${row.phone} ${row.instructor_name || ''} ${row.comment || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [rows, instructorFilter, statusFilter, dateFrom, dateTo, search]);

  async function updateStatus(row: DrivingInstructorLeadItem, statusValue: string) {
    try {
      await adminUpdateDrivingInstructorLeadStatus(row.id, statusValue);
      toast.success('Lead status yangilandi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Leadlar">
        <div>Yuklanmoqda...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Leadlar"
      description="Instruktor bo‘yicha leadlar oqimini nazorat qilish va statuslarni tez o‘zgartirish"
      actions={<Button onClick={() => void loadData()}>Yangilash</Button>}
    >
      <InstructorAdminSubmenu />
      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Filtrlar</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={instructorFilter} onChange={(e) => setInstructorFilter(e.target.value)}>
              <option value="all">Barcha instruktorlar</option>
              {instructorOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Barcha statuslar</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Input className="xl:col-span-2" placeholder="Ism, telefon, izoh..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Leadlar jadvali ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instruktor</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const badge = leadStatusView(row.status);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.instructor_name || '-'}</TableCell>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell><Badge className={cn('border', badge.className)}>{badge.label}</Badge></TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell>
                      <select className="h-8 rounded border border-input bg-background px-2 text-xs" value={row.status} onChange={(e) => void updateStatus(row, e.target.value)}>
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
