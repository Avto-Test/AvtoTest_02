'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DrivingSchoolAdminSubmenu } from '@/components/admin/driving-schools/DrivingSchoolAdminSubmenu';
import { formatDate, schoolLeadStatusView } from '@/components/admin/driving-schools/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import { adminGetDrivingSchoolLeads, adminGetDrivingSchools, adminUpdateDrivingSchoolLeadStatus } from '@/lib/drivingSchools';
import { AdminDrivingSchoolLead } from '@/schemas/drivingSchool.schema';
import { cn } from '@/lib/utils';

const statuses = ['new', 'contacted', 'qualified', 'closed'];

export default function AdminDrivingSchoolLeadsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminDrivingSchoolLead[]>([]);
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [schoolOptions, setSchoolOptions] = useState<Array<{ id: string; name: string }>>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [leads, schools] = await Promise.all([
        adminGetDrivingSchoolLeads(),
        adminGetDrivingSchools(),
      ]);
      setRows(leads);
      setSchoolOptions(schools.map((item) => ({ id: item.id, name: item.name })));
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
      if (schoolFilter !== 'all' && row.school_id !== schoolFilter) return false;
      if (statusFilter !== 'all' && row.status.toLowerCase() !== statusFilter.toLowerCase()) return false;

      const createdAt = new Date(row.created_at).getTime();
      if (fromMs !== null && createdAt < fromMs) return false;
      if (toMs !== null && createdAt > toMs) return false;

      if (!query) return true;
      const haystack = `${row.full_name} ${row.phone} ${row.school_name || ''} ${row.comment || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, schoolFilter, statusFilter, dateFrom, dateTo, search]);

  async function updateStatus(row: AdminDrivingSchoolLead, nextStatus: string) {
    try {
      await adminUpdateDrivingSchoolLeadStatus(row.id, nextStatus);
      toast.success('Lead status yangilandi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Avtomaktab leadlari">
        <div>Yuklanmoqda...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Leadlar"
      description="Avtomaktablar bo'yicha lead oqimini boshqarish va statuslarni kuzatish"
      actions={<Button onClick={() => void loadData()}>Yangilash</Button>}
    >
      <DrivingSchoolAdminSubmenu />

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Filtrlar</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
              <option value="all">Barcha avtomaktablar</option>
              {schoolOptions.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Barcha statuslar</option>
              {statuses.map((statusValue) => (
                <option key={statusValue} value={statusValue}>{statusValue}</option>
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
                <TableHead>Avtomaktab</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const badge = schoolLeadStatusView(row.status);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.school_name || '-'}</TableCell>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell><Badge className={cn('border', badge.className)}>{badge.label}</Badge></TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell>
                      <select className="h-8 rounded border border-input bg-background px-2 text-xs" value={row.status} onChange={(e) => void updateStatus(row, e.target.value)}>
                        {statuses.map((statusValue) => (
                          <option key={statusValue} value={statusValue}>{statusValue}</option>
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

