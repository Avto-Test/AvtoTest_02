'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { InstructorAdminSubmenu } from '@/components/admin/driving-instructors/InstructorAdminSubmenu';
import { applicationStatusView, formatDate } from '@/components/admin/driving-instructors/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/api';
import { adminGetDrivingInstructorApplications, adminGetDrivingInstructors, adminUpdateDrivingInstructorApplication } from '@/lib/drivingInstructors';
import { DrivingInstructorAdmin, DrivingInstructorApplication } from '@/schemas/drivingInstructor.schema';
import { cn } from '@/lib/utils';

type Tab = 'pending' | 'approved' | 'rejected';

export default function AdminDrivingInstructorApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DrivingInstructorApplication[]>([]);
  const [instructors, setInstructors] = useState<DrivingInstructorAdmin[]>([]);
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [apps, instructorRows] = await Promise.all([
        adminGetDrivingInstructorApplications(),
        adminGetDrivingInstructors(),
      ]);
      setRows(apps);
      setInstructors(instructorRows);
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

  const mappedInstructorByUser = useMemo(() => {
    const map = new Map<string, DrivingInstructorAdmin>();
    instructors.forEach((item) => {
      if (item.user_id) map.set(item.user_id, item);
    });
    return map;
  }, [instructors]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.status !== tab) return false;
      if (!query) return true;
      const haystack = `${row.full_name} ${row.phone} ${row.city} ${row.car_model}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, tab, search]);

  const counts = useMemo(() => {
    return {
      pending: rows.filter((row) => row.status === 'pending').length,
      approved: rows.filter((row) => row.status === 'approved').length,
      rejected: rows.filter((row) => row.status === 'rejected').length,
    };
  }, [rows]);

  async function changeStatus(row: DrivingInstructorApplication, next: Tab) {
    try {
      let rejectionReason: string | undefined;
      if (next === 'rejected') {
        rejectionReason = window.prompt('Rad etish sababini kiriting:')?.trim();
        if (!rejectionReason) {
          toast.error('Rad etish uchun izoh kiritish shart.');
          return;
        }
      }
      await adminUpdateDrivingInstructorApplication(row.id, {
        status: next,
        rejection_reason: rejectionReason,
      });
      toast.success('Ariza holati yangilandi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Instruktor arizalari">
        <div>Yuklanmoqda...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Arizalar"
      description="Pending / Approved / Rejected jarayonini alohida boshqarish"
      actions={<Button onClick={() => void loadData()}>Yangilash</Button>}
    >
      <InstructorAdminSubmenu />
      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Status tablari</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={tab === 'pending' ? 'default' : 'outline'} onClick={() => setTab('pending')}>Pending ({counts.pending})</Button>
            <Button variant={tab === 'approved' ? 'default' : 'outline'} onClick={() => setTab('approved')}>Approved ({counts.approved})</Button>
            <Button variant={tab === 'rejected' ? 'default' : 'outline'} onClick={() => setTab('rejected')}>Rejected ({counts.rejected})</Button>
            <div className="ml-auto min-w-56">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidiruv: ism, telefon, shahar..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((row) => {
          const badge = applicationStatusView(row.status);
          const instructorProfile = row.user_id ? mappedInstructorByUser.get(row.user_id) : null;
          return (
            <Card key={row.id} className="py-4">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{row.full_name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{row.city}{row.region ? `, ${row.region}` : ''}</p>
                  </div>
                  <Badge className={cn('border', badge.className)}>{badge.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Telefon:</span> {row.phone}</p>
                <p><span className="text-muted-foreground">Mashina:</span> {row.transmission} / {row.car_model}</p>
                <p><span className="text-muted-foreground">Narx:</span> {(row.hourly_price_cents / 100).toLocaleString('en-US')} {row.currency}</p>
                <p className="text-muted-foreground line-clamp-2">{row.short_bio}</p>
                <p className="text-xs text-muted-foreground">Yuborilgan: {formatDate(row.created_at)}</p>
                {row.status === 'rejected' ? (
                  <p className="text-xs text-red-300">Sabab: {row.rejection_reason || 'Kiritilmagan'}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="default" onClick={() => void changeStatus(row, 'approved')}>Tasdiqlash</Button>
                  <Button size="sm" variant="outline" onClick={() => void changeStatus(row, 'rejected')}>Rad etish</Button>
                  {instructorProfile ? (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/driving-instructors/${instructorProfile.slug}`} target="_blank">Profilni ko‘rish</Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled>Profil mavjud emas</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}
