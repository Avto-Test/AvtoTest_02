'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DrivingSchoolAdminSubmenu } from '@/components/admin/driving-schools/DrivingSchoolAdminSubmenu';
import { formatDate } from '@/components/admin/driving-schools/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import {
  adminDeleteDrivingSchoolReview,
  adminGetDrivingSchoolReviews,
  adminGetDrivingSchools,
  adminUpdateDrivingSchoolReview,
} from '@/lib/drivingSchools';
import { DrivingSchoolReviewItem } from '@/schemas/drivingSchool.schema';

export default function AdminDrivingSchoolReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DrivingSchoolReviewItem[]>([]);
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [schoolOptions, setSchoolOptions] = useState<Array<{ id: string; name: string }>>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [reviews, schools] = await Promise.all([
        adminGetDrivingSchoolReviews(schoolFilter === 'all' ? undefined : schoolFilter),
        adminGetDrivingSchools(),
      ]);
      setRows(reviews);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolFilter]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (ratingFilter !== 'all' && String(row.rating) !== ratingFilter) return false;
      if (!query) return true;
      const haystack = `${row.user_display_name || ''} ${row.comment || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, ratingFilter, search]);

  async function toggleVisible(row: DrivingSchoolReviewItem) {
    try {
      await adminUpdateDrivingSchoolReview(row.id, { is_visible: !row.is_visible });
      toast.success(row.is_visible ? 'Review yashirildi.' : 'Review korsatildi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function markSpam(row: DrivingSchoolReviewItem) {
    try {
      await adminUpdateDrivingSchoolReview(row.id, { is_visible: false });
      toast.success('Review spam deb belgilandi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function deleteRow(reviewId: string) {
    if (!window.confirm("Reviewni ochirasizmi?")) return;
    try {
      await adminDeleteDrivingSchoolReview(reviewId);
      toast.success('Review ochirildi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Avtomaktab reviewlari">
        <div>Yuklanmoqda...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Reviewlar"
      description="Avtomaktab reviewlarini moderatsiya qilish: hide, delete, spam"
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
              <option value="all">Barcha avtomaktablar</option>
              {schoolOptions.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
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
            <Input className="xl:col-span-2" placeholder="Fikr yoki foydalanuvchi..." value={search} onChange={(e) => setSearch(e.target.value)} />
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

