'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { InstructorAdminSubmenu } from '@/components/admin/driving-instructors/InstructorAdminSubmenu';
import { instructorStatusView } from '@/components/admin/driving-instructors/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import { adminDeleteDrivingInstructor, adminGetDrivingInstructors, adminUpdateDrivingInstructor } from '@/lib/drivingInstructors';
import { DrivingInstructorAdmin } from '@/schemas/drivingInstructor.schema';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'blocked' | 'top' | 'premium';

type EditState = {
  id: string;
  full_name: string;
  city: string;
  phone: string;
  hourly_price_cents: number;
  is_active: boolean;
  is_verified: boolean;
  is_top_rated: boolean;
  is_blocked: boolean;
};

function toEditState(row: DrivingInstructorAdmin): EditState {
  return {
    id: row.id,
    full_name: row.full_name,
    city: row.city,
    phone: row.phone,
    hourly_price_cents: row.hourly_price_cents,
    is_active: row.is_active,
    is_verified: row.is_verified,
    is_top_rated: row.is_top_rated,
    is_blocked: row.is_blocked,
  };
}

export default function AdminDrivingInstructorsListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DrivingInstructorAdmin[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [editing, setEditing] = useState<EditState | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const data = await adminGetDrivingInstructors();
      setRows(data);
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

  const regions = useMemo(() => {
    return ['all', ...Array.from(new Set(rows.map((item) => item.region || item.city).filter(Boolean)))];
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (query) {
        const haystack = `${row.full_name} ${row.city} ${row.phone} ${row.referral_code}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (regionFilter !== 'all') {
        const scope = row.region || row.city;
        if (scope !== regionFilter) return false;
      }
      if (statusFilter === 'active' && !(row.is_active && !row.is_blocked)) return false;
      if (statusFilter === 'blocked' && !row.is_blocked) return false;
      if (statusFilter === 'top' && !row.is_top_rated) return false;
      if (statusFilter === 'premium' && !row.promo_code_id) return false;
      return true;
    });
  }, [rows, search, statusFilter, regionFilter]);

  const counts = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((item) => item.is_active && !item.is_blocked).length,
      blocked: rows.filter((item) => item.is_blocked).length,
      top: rows.filter((item) => item.is_top_rated).length,
    };
  }, [rows]);

  async function toggleBlock(row: DrivingInstructorAdmin) {
    try {
      await adminUpdateDrivingInstructor(row.id, { is_blocked: !row.is_blocked });
      toast.success(row.is_blocked ? 'Instruktor blokdan chiqarildi.' : 'Instruktor bloklandi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function deleteRow(id: string) {
    const ok = window.confirm('Instruktorni o‘chirishni tasdiqlaysizmi?');
    if (!ok) return;
    try {
      await adminDeleteDrivingInstructor(id);
      toast.success('Instruktor o‘chirildi.');
      if (editing?.id === id) setEditing(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await adminUpdateDrivingInstructor(editing.id, {
        full_name: editing.full_name,
        city: editing.city,
        phone: editing.phone,
        hourly_price_cents: editing.hourly_price_cents,
        is_active: editing.is_active,
        is_verified: editing.is_verified,
        is_top_rated: editing.is_top_rated,
        is_blocked: editing.is_blocked,
      });
      toast.success('Instruktor yangilandi.');
      setEditing(null);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Instruktorlar">
        <div>Yuklanmoqda...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Instruktorlar"
      description="Faoliyat, bloklash, top-rated va premium segmentlari bo‘yicha instruktolarni boshqarish"
      actions={<Button onClick={() => void loadData()}>Yangilash</Button>}
    >
      <InstructorAdminSubmenu />

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="py-4">
          <CardHeader className="pb-2"><CardTitle className="text-base">Jami</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{counts.total}</p></CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-2"><CardTitle className="text-base">Faol</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-400">{counts.active}</p></CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-2"><CardTitle className="text-base">Bloklangan</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-400">{counts.blocked}</p></CardContent>
        </Card>
        <Card className="py-4">
          <CardHeader className="pb-2"><CardTitle className="text-base">Top rated</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-amber-300">{counts.top}</p></CardContent>
        </Card>
      </div>

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Tezkor qidiruv va filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <Input placeholder="Ism, telefon, referral..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">Barcha status</option>
              <option value="active">Faol</option>
              <option value="blocked">Bloklangan</option>
              <option value="top">Top rated</option>
              <option value="premium">Premium</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
              {regions.map((region) => (
                <option key={region} value={region}>{region === 'all' ? 'Barcha hudud' : region}</option>
              ))}
            </select>
            <div className="text-sm text-muted-foreground">Natija: <span className="font-semibold text-foreground">{filtered.length}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row) => {
          const badge = instructorStatusView(row);
          return (
            <Card key={`card-${row.id}`} className="py-4">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{row.full_name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{row.city}{row.region ? `, ${row.region}` : ''}</p>
                  </div>
                  <Badge className={cn('border', badge.className)}>{badge.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Reyting: <span className="font-semibold">{row.rating_avg.toFixed(1)}</span> ({row.review_count})</p>
                <p>Leadlar: <span className="font-semibold">{row.lead_count}</span></p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(toEditState(row))}>Edit</Button>
                  <Button variant={row.is_blocked ? 'outline' : 'secondary'} size="sm" onClick={() => void toggleBlock(row)}>
                    {row.is_blocked ? 'Unblock' : 'Block'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => void deleteRow(row.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Instruktorlar ro‘yxati</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Shahar/Hudud</TableHead>
                <TableHead>Reyting</TableHead>
                <TableHead>Leadlar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const badge = instructorStatusView(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell>{row.region || row.city}</TableCell>
                    <TableCell>{row.rating_avg.toFixed(1)} ({row.review_count})</TableCell>
                    <TableCell>{row.lead_count}</TableCell>
                    <TableCell>
                      <Badge className={cn('border', badge.className)}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(toEditState(row))}>Edit</Button>
                        <Button variant={row.is_blocked ? 'outline' : 'secondary'} size="sm" onClick={() => void toggleBlock(row)}>
                          {row.is_blocked ? 'Unblock' : 'Block'}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => void deleteRow(row.id)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing ? (
        <Card className="mt-6 py-4">
          <CardHeader className="pb-2"><CardTitle className="text-base">Instruktorni tahrirlash</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input value={editing.full_name} onChange={(e) => setEditing((prev) => (prev ? { ...prev, full_name: e.target.value } : prev))} placeholder="Ism" />
              <Input value={editing.city} onChange={(e) => setEditing((prev) => (prev ? { ...prev, city: e.target.value } : prev))} placeholder="Shahar" />
              <Input value={editing.phone} onChange={(e) => setEditing((prev) => (prev ? { ...prev, phone: e.target.value } : prev))} placeholder="Telefon" />
              <Input type="number" value={editing.hourly_price_cents} onChange={(e) => setEditing((prev) => (prev ? { ...prev, hourly_price_cents: Number(e.target.value || 0) } : prev))} placeholder="Narx (cents)" />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing((prev) => (prev ? { ...prev, is_active: e.target.checked } : prev))} /> Faol</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editing.is_verified} onChange={(e) => setEditing((prev) => (prev ? { ...prev, is_verified: e.target.checked } : prev))} /> Tasdiqlangan</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editing.is_top_rated} onChange={(e) => setEditing((prev) => (prev ? { ...prev, is_top_rated: e.target.checked } : prev))} /> Top rated</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editing.is_blocked} onChange={(e) => setEditing((prev) => (prev ? { ...prev, is_blocked: e.target.checked } : prev))} /> Bloklangan</label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void saveEdit()}>Saqlash</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Bekor</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </AdminLayout>
  );
}
