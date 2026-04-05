'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { InstructorAdminSubmenu } from '@/components/admin/driving-instructors/InstructorAdminSubmenu';
import { formatDate } from '@/components/admin/driving-instructors/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import { adminDeleteDrivingInstructorReview, adminGetDrivingInstructorReviews, adminGetDrivingInstructors, adminUpdateDrivingInstructorReview } from '@/lib/drivingInstructors';
import { DrivingInstructorReviewItem } from '@/schemas/drivingInstructor.schema';

export default function AdminDrivingInstructorReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DrivingInstructorReviewItem[]>([]);
  const [instructorFilter, setInstructorFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [instructorOptions, setInstructorOptions] = useState<Array<{ id: string; name: string }>>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [reviewRows, instructors] = await Promise.all([
        adminGetDrivingInstructorReviews(instructorFilter === 'all' ? undefined : instructorFilter),
        adminGetDrivingInstructors(),
      ]);
      setRows(reviewRows);
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (ratingFilter !== 'all' && String(row.rating) !== ratingFilter) return false;
      if (!query) return true;
      const haystack = `${row.user_display_name || ''} ${row.comment || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, ratingFilter, search]);

  async function toggleVisible(row: DrivingInstructorReviewItem) {
    try {
      await adminUpdateDrivingInstructorReview(row.id, { is_visible: !row.is_visible });
      toast.success(row.is_visible ? 'Review yashirildi.' : 'Review ko‘rsatildi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function markSpam(row: DrivingInstructorReviewItem) {
    try {
      await adminUpdateDrivingInstructorReview(row.id, { is_visible: false });
      toast.success('Review spam sifatida belgilandi (yashirildi).');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function deleteRow(id: string) {
    if (!window.confirm('Reviewni o‘chirasizmi?')) return;
    try {
      await adminDeleteDrivingInstructorReview(id);
      toast.success('Review o‘chirildi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Reviewlar">
        <div>Yuklanmoqda...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Reviewlar"
      description="Reytinglar moderatsiyasi: hide, delete, spam belgilash"
      actions={<Button onClick={() => void loadData()}>Yangilash</Button>}
    >
      <InstructorAdminSubmenu />
      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Filtrlar</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={instructorFilter} onChange={(e) => setInstructorFilter(e.target.value)}>
              <option value="all">Barcha instruktorlar</option>
              {instructorOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
              <option value="all">Barcha reytinglar</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
            <Input className="xl:col-span-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Fikr matni yoki foydalanuvchi..." />
          </div>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Reviewlar ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foydalanuvchi</TableHead>
                <TableHead>Reyting</TableHead>
                <TableHead>Fikr</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.user_display_name || 'Foydalanuvchi'}</TableCell>
                  <TableCell>{row.rating}/5</TableCell>
                  <TableCell className="max-w-[360px] truncate">{row.comment || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={row.is_visible ? 'default' : 'secondary'}>{row.is_visible ? 'Visible' : 'Hidden'}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void toggleVisible(row)}>{row.is_visible ? 'Hide' : 'Show'}</Button>
                      <Button size="sm" variant="secondary" onClick={() => void markSpam(row)}>Spam</Button>
                      <Button size="sm" variant="destructive" onClick={() => void deleteRow(row.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
