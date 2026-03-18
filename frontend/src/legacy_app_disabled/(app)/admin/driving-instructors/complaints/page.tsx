'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { InstructorAdminSubmenu } from '@/components/admin/driving-instructors/InstructorAdminSubmenu';
import { complaintStatusView, formatDate } from '@/components/admin/driving-instructors/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import { adminGetDrivingInstructorComplaints, adminGetDrivingInstructors, adminUpdateDrivingInstructorComplaint } from '@/lib/drivingInstructors';
import { DrivingInstructorComplaintItem } from '@/schemas/drivingInstructor.schema';
import { cn } from '@/lib/utils';

const statuses = ['new', 'reviewing', 'resolved', 'rejected'];

export default function AdminDrivingInstructorComplaintsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DrivingInstructorComplaintItem[]>([]);
  const [tab, setTab] = useState('new');
  const [search, setSearch] = useState('');
  const [instructorFilter, setInstructorFilter] = useState('all');
  const [instructorOptions, setInstructorOptions] = useState<Array<{ id: string; name: string }>>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [complaintRows, instructors] = await Promise.all([
        adminGetDrivingInstructorComplaints(instructorFilter === 'all' ? undefined : instructorFilter),
        adminGetDrivingInstructors(),
      ]);
      setRows(complaintRows);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructorFilter]);

  const counts = useMemo(() => {
    return {
      new: rows.filter((row) => row.status === 'new').length,
      reviewing: rows.filter((row) => row.status === 'reviewing').length,
      resolved: rows.filter((row) => row.status === 'resolved').length,
      rejected: rows.filter((row) => row.status === 'rejected').length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.status !== tab) return false;
      if (!query) return true;
      const haystack = `${row.full_name} ${row.reason} ${row.comment || ''} ${row.phone || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, tab, search]);

  async function updateStatus(row: DrivingInstructorComplaintItem, next: string) {
    try {
      await adminUpdateDrivingInstructorComplaint(row.id, next);
      toast.success('Shikoyat holati yangilandi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Shikoyatlar">
        <div>Yuklanmoqda...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Shikoyatlar"
      description="New / Tekshiruvda / Hal qilindi status oqimini boshqarish"
      actions={<Button onClick={() => void loadData()}>Yangilash</Button>}
    >
      <InstructorAdminSubmenu />
      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Tablar va filterlar</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={tab === 'new' ? 'default' : 'outline'} onClick={() => setTab('new')}>New ({counts.new})</Button>
            <Button variant={tab === 'reviewing' ? 'default' : 'outline'} onClick={() => setTab('reviewing')}>Tekshiruvda ({counts.reviewing})</Button>
            <Button variant={tab === 'resolved' ? 'default' : 'outline'} onClick={() => setTab('resolved')}>Hal qilindi ({counts.resolved})</Button>
            <Button variant={tab === 'rejected' ? 'default' : 'outline'} onClick={() => setTab('rejected')}>Rad etilgan ({counts.rejected})</Button>
            <select className="ml-auto h-10 rounded-md border border-input bg-background px-3 text-sm" value={instructorFilter} onChange={(e) => setInstructorFilter(e.target.value)}>
              <option value="all">Barcha instruktorlar</option>
              {instructorOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <div className="min-w-56">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidiruv..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Shikoyatlar ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instruktor</TableHead>
                <TableHead>Yuboruvchi</TableHead>
                <TableHead>Sabab</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const badge = complaintStatusView(row.status);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.instructor_name || '-'}</TableCell>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell className="max-w-[360px] truncate">{row.reason}{row.comment ? ` | ${row.comment}` : ''}</TableCell>
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
