'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DrivingSchoolAdminSubmenu } from '@/components/admin/driving-schools/DrivingSchoolAdminSubmenu';
import { formatDate, schoolApplicationStatusView } from '@/components/admin/driving-schools/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/api';
import { adminGetPartnerApplications, adminUpdatePartnerApplication } from '@/lib/drivingSchools';
import { DrivingSchoolPartnerApplication } from '@/schemas/drivingSchool.schema';
import { cn } from '@/lib/utils';

type Tab = 'new' | 'reviewing' | 'approved' | 'rejected';

export default function AdminDrivingSchoolApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DrivingSchoolPartnerApplication[]>([]);
  const [tab, setTab] = useState<Tab>('new');
  const [search, setSearch] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const applications = await adminGetPartnerApplications();
      setRows(applications);
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

  const counts = useMemo(() => {
    return {
      new: rows.filter((item) => item.status === 'new').length,
      reviewing: rows.filter((item) => item.status === 'reviewing').length,
      approved: rows.filter((item) => item.status === 'approved').length,
      rejected: rows.filter((item) => item.status === 'rejected').length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((item) => {
      if (item.status !== tab) return false;
      if (!query) return true;
      const haystack = `${item.school_name} ${item.city} ${item.responsible_person} ${item.phone} ${item.email}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, tab, search]);

  async function changeStatus(row: DrivingSchoolPartnerApplication, next: Tab) {
    try {
      await adminUpdatePartnerApplication(row.id, next);
      toast.success('Ariza holati yangilandi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Avtomaktab arizalari">
        <div>Yuklanmoqda...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Arizalar"
      description="Pending oqimini boshqarish: yangi, korib chiqilmoqda, tasdiqlangan, rad etilgan"
      actions={<Button onClick={() => void loadData()}>Yangilash</Button>}
    >
      <DrivingSchoolAdminSubmenu />

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Status tablari</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={tab === 'new' ? 'default' : 'outline'} onClick={() => setTab('new')}>Yangi ({counts.new})</Button>
            <Button variant={tab === 'reviewing' ? 'default' : 'outline'} onClick={() => setTab('reviewing')}>Korib chiqilmoqda ({counts.reviewing})</Button>
            <Button variant={tab === 'approved' ? 'default' : 'outline'} onClick={() => setTab('approved')}>Tasdiqlangan ({counts.approved})</Button>
            <Button variant={tab === 'rejected' ? 'default' : 'outline'} onClick={() => setTab('rejected')}>Rad etilgan ({counts.rejected})</Button>
            <div className="ml-auto min-w-56">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidiruv: nom, shahar, telefon..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((row) => {
          const badge = schoolApplicationStatusView(row.status);
          return (
            <Card key={row.id} className="py-4">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{row.school_name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{row.city}</p>
                  </div>
                  <Badge className={cn('border', badge.className)}>{badge.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Masul shaxs:</span> {row.responsible_person}</p>
                <p><span className="text-muted-foreground">Telefon:</span> {row.phone}</p>
                <p><span className="text-muted-foreground">Email:</span> {row.email}</p>
                {row.note ? <p className="text-muted-foreground line-clamp-2">{row.note}</p> : null}
                <p className="text-xs text-muted-foreground">Yuborilgan: {formatDate(row.created_at)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void changeStatus(row, 'approved')}>Tasdiqlash</Button>
                  <Button size="sm" variant="outline" onClick={() => void changeStatus(row, 'reviewing')}>Tekshiruvga otkazish</Button>
                  <Button size="sm" variant="destructive" onClick={() => void changeStatus(row, 'rejected')}>Rad etish</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}

