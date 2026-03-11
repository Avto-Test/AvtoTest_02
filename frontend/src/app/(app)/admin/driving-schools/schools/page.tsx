'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DrivingSchoolAdminSubmenu } from '@/components/admin/driving-schools/DrivingSchoolAdminSubmenu';
import { SurfaceNav } from '@/components/intelligence/SurfaceNav';
import { drivingSchoolStatusView } from '@/components/admin/driving-schools/status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import { getPromoCodes } from '@/lib/admin';
import {
  adminCreateDrivingSchool,
  adminCreateDrivingSchoolCourse,
  adminCreateDrivingSchoolMedia,
  adminDeleteDrivingSchool,
  adminDeleteDrivingSchoolCourse,
  adminDeleteDrivingSchoolMedia,
  adminGetDrivingSchools,
  adminUpdateDrivingSchool,
  adminUploadDrivingSchoolMedia,
} from '@/lib/drivingSchools';
import {
  AdminDrivingSchool,
  AdminDrivingSchoolCourseFormData,
  AdminDrivingSchoolFormData,
  AdminDrivingSchoolMediaFormData,
  adminDrivingSchoolCourseSchema,
  adminDrivingSchoolMediaSchema,
  adminDrivingSchoolSchema,
} from '@/schemas/drivingSchool.schema';
import { cn } from '@/lib/utils';
import { adminNav } from '@/config/navigation';

type StatusFilter = 'all' | 'active' | 'inactive';

const emptySchool = (): AdminDrivingSchoolFormData => ({
  name: '',
  city: '',
  phone: '',
  slug: '',
  short_description: '',
  full_description: '',
  region: '',
  address: '',
  landmark: '',
  telegram: '',
  website: '',
  work_hours: '',
  license_info: '',
  years_active: undefined,
  logo_url: '',
  map_embed_url: '',
  referral_code: '',
  promo_code_id: '',
  is_active: true,
});

const emptyCourse = (): AdminDrivingSchoolCourseFormData => ({
  category_code: '',
  duration_weeks: undefined,
  price_cents: undefined,
  currency: 'UZS',
  installment_available: false,
  description: '',
  is_active: true,
  sort_order: 0,
});

const emptyMedia = (): AdminDrivingSchoolMediaFormData => ({
  media_type: 'image',
  url: '',
  caption: '',
  is_active: true,
  sort_order: 0,
});

export default function AdminDrivingSchoolsListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminDrivingSchool[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [cityFilter, setCityFilter] = useState('all');

  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [schoolForm, setSchoolForm] = useState<AdminDrivingSchoolFormData>(emptySchool());
  const [courseForm, setCourseForm] = useState<AdminDrivingSchoolCourseFormData>(emptyCourse());
  const [mediaForm, setMediaForm] = useState<AdminDrivingSchoolMediaFormData>(emptyMedia());
  const [promoOptions, setPromoOptions] = useState<Array<{ id: string; code: string }>>([]);
  const [uploading, setUploading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [schools, promos] = await Promise.all([adminGetDrivingSchools(), getPromoCodes()]);
      setRows(schools);
      setPromoOptions(promos.map((promo) => ({ id: promo.id, code: promo.code })));
      if (!selectedSchoolId && schools.length > 0) setSelectedSchoolId(schools[0].id);
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
  }, []);

  const counts = useMemo(() => {
    const active = rows.filter((item) => item.is_active).length;
    return {
      total: rows.length,
      active,
      inactive: rows.length - active,
    };
  }, [rows]);

  const cityOptions = useMemo(() => {
    return ['all', ...Array.from(new Set(rows.map((item) => item.city).filter(Boolean)))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === 'active' && !row.is_active) return false;
      if (statusFilter === 'inactive' && row.is_active) return false;
      if (cityFilter !== 'all' && row.city !== cityFilter) return false;
      if (!query) return true;
      const haystack = `${row.name} ${row.city} ${row.phone} ${row.referral_code}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search, statusFilter, cityFilter]);

  const selectedSchool = useMemo(
    () => rows.find((item) => item.id === selectedSchoolId) || null,
    [rows, selectedSchoolId]
  );

  function startEdit(row: AdminDrivingSchool) {
    setEditingId(row.id);
    setSelectedSchoolId(row.id);
    setSchoolForm({
      name: row.name,
      city: row.city,
      phone: row.phone,
      slug: row.slug,
      short_description: row.short_description || '',
      full_description: row.full_description || '',
      region: row.region || '',
      address: row.address || '',
      landmark: row.landmark || '',
      telegram: row.telegram || '',
      website: row.website || '',
      work_hours: row.work_hours || '',
      license_info: row.license_info || '',
      years_active: row.years_active ?? undefined,
      logo_url: row.logo_url || '',
      map_embed_url: row.map_embed_url || '',
      referral_code: row.referral_code || '',
      promo_code_id: row.promo_code_id || '',
      is_active: row.is_active,
    });
  }

  async function saveSchool() {
    const parsed = adminDrivingSchoolSchema.safeParse(schoolForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Forma xato.');
      return;
    }

    try {
      if (editingId) await adminUpdateDrivingSchool(editingId, parsed.data);
      else await adminCreateDrivingSchool(parsed.data);
      toast.success(editingId ? 'Avtomaktab yangilandi.' : 'Avtomaktab qoshildi.');
      setEditingId(null);
      setSchoolForm(emptySchool());
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function removeSchool(schoolId: string) {
    if (!window.confirm("Avtomaktabni ochirishni tasdiqlaysizmi?")) return;
    try {
      await adminDeleteDrivingSchool(schoolId);
      toast.success('Avtomaktab ochirildi.');
      if (selectedSchoolId === schoolId) setSelectedSchoolId(null);
      if (editingId === schoolId) {
        setEditingId(null);
        setSchoolForm(emptySchool());
      }
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await adminUploadDrivingSchoolMedia(file);
      setMediaForm((prev) => ({ ...prev, url: uploaded.url }));
      toast.success('Media yuklandi.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Avtomaktablar">
        <div className="space-y-4">
          <div className="intelligence-panel p-6">
            <SurfaceNav items={adminNav} />
          </div>
          <div>Yuklanmoqda...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Avtomaktablar"
      description="Katalogdagi avtomaktablarni boshqarish, tahrirlash va media/kurs qo'shish"
      actions={<Button onClick={() => void loadData()}>Yangilash</Button>}
    >
      <div className="mb-6 intelligence-panel p-6">
        <SurfaceNav items={adminNav} />
      </div>

      <DrivingSchoolAdminSubmenu />

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="py-4"><CardHeader className="pb-2"><CardTitle className="text-base">Jami</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{counts.total}</p></CardContent></Card>
        <Card className="py-4"><CardHeader className="pb-2"><CardTitle className="text-base">Faol</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-400">{counts.active}</p></CardContent></Card>
        <Card className="py-4"><CardHeader className="pb-2"><CardTitle className="text-base">Nofaol</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-300">{counts.inactive}</p></CardContent></Card>
      </div>

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Tezkor qidiruv va filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input placeholder="Nomi, telefon, referral..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">Barcha status</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
              {cityOptions.map((city) => (
                <option key={city} value={city}>{city === 'all' ? 'Barcha shaharlar' : city}</option>
              ))}
            </select>
            <div className="flex items-center text-sm text-muted-foreground">
              Natija: <span className="ml-1 font-semibold text-foreground">{filteredRows.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredRows.map((row) => {
          const badge = drivingSchoolStatusView(row);
          return (
            <Card key={`card-${row.id}`} className="py-4">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{row.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{row.city}{row.region ? `, ${row.region}` : ''}</p>
                  </div>
                  <Badge className={cn('border', badge.className)}>{badge.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Reyting: <span className="font-semibold">{row.rating_avg.toFixed(1)}</span> ({row.review_count})</p>
                <p>Leadlar: <span className="font-semibold">{row.lead_count}</span></p>
                <p>Promo redeem: <span className="font-semibold">{row.promo_redemption_count}</span></p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedSchoolId(row.id)}>Tanlash</Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(row)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => void removeSchool(row.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{editingId ? 'Avtomaktabni tahrirlash' : 'Yangi avtomaktab qoshish'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Input placeholder="Nomi" value={schoolForm.name} onChange={(e) => setSchoolForm((prev) => ({ ...prev, name: e.target.value }))} />
            <Input placeholder="Shahar" value={schoolForm.city} onChange={(e) => setSchoolForm((prev) => ({ ...prev, city: e.target.value }))} />
            <Input placeholder="Telefon" value={schoolForm.phone} onChange={(e) => setSchoolForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <Input placeholder="Slug" value={schoolForm.slug || ''} onChange={(e) => setSchoolForm((prev) => ({ ...prev, slug: e.target.value }))} />
            <Input placeholder="Referral code" value={schoolForm.referral_code || ''} onChange={(e) => setSchoolForm((prev) => ({ ...prev, referral_code: e.target.value }))} />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={schoolForm.promo_code_id || ''} onChange={(e) => setSchoolForm((prev) => ({ ...prev, promo_code_id: e.target.value }))}>
              <option value="">Promo yoq</option>
              {promoOptions.map((promo) => (
                <option key={promo.id} value={promo.id}>{promo.code}</option>
              ))}
            </select>
          </div>
          <textarea
            className="mt-3 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Qisqacha tavsif"
            value={schoolForm.short_description || ''}
            onChange={(e) => setSchoolForm((prev) => ({ ...prev, short_description: e.target.value }))}
          />
          <div className="mt-3 flex gap-2">
            <Button onClick={() => void saveSchool()}>{editingId ? 'Yangilash' : 'Qoshish'}</Button>
            {editingId ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setSchoolForm(emptySchool());
                }}
              >
                Bekor qilish
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Avtomaktablar jadvali</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi</TableHead>
                <TableHead>Shahar</TableHead>
                <TableHead>Reyting</TableHead>
                <TableHead>Leadlar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => {
                const badge = drivingSchoolStatusView(row);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.city}</TableCell>
                    <TableCell>{row.rating_avg.toFixed(1)} ({row.review_count})</TableCell>
                    <TableCell>{row.lead_count}</TableCell>
                    <TableCell><Badge className={cn('border', badge.className)}>{badge.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedSchoolId(row.id)}>Tanlash</Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(row)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => void removeSchool(row.id)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedSchool ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="py-4">
            <CardHeader className="pb-2"><CardTitle className="text-base">Kurs qoshish</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Toifa (B, C...)" value={courseForm.category_code} onChange={(e) => setCourseForm((prev) => ({ ...prev, category_code: e.target.value }))} />
                <Input type="number" placeholder="Narx (cents)" value={courseForm.price_cents ?? ''} onChange={(e) => setCourseForm((prev) => ({ ...prev, price_cents: e.target.value ? Number(e.target.value) : undefined }))} />
              </div>
              <Button
                className="mt-3"
                onClick={() => {
                  const parsed = adminDrivingSchoolCourseSchema.safeParse(courseForm);
                  if (!parsed.success) {
                    toast.error(parsed.error.issues[0]?.message || 'Kurs formasi xato.');
                    return;
                  }
                  void adminCreateDrivingSchoolCourse(selectedSchool.id, parsed.data)
                    .then(() => {
                      toast.success('Kurs qoshildi.');
                      setCourseForm(emptyCourse());
                      return loadData();
                    })
                    .catch((err) => toast.error(getErrorMessage(err)));
                }}
              >
                Kurs qoshish
              </Button>
              <div className="mt-3 space-y-2">
                {selectedSchool.courses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2 text-sm">
                    <span>{course.category_code} | {course.price_cents ? `${course.price_cents / 100} ${course.currency}` : '-'}</span>
                    <Button size="sm" variant="destructive" onClick={() => void adminDeleteDrivingSchoolCourse(course.id).then(loadData)}>Delete</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="pb-2"><CardTitle className="text-base">Media qoshish</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Input placeholder="Media URL" value={mediaForm.url} onChange={(e) => setMediaForm((prev) => ({ ...prev, url: e.target.value }))} />
                <Input type="file" onChange={onUpload} disabled={uploading} />
              </div>
              <Button
                className="mt-3"
                onClick={() => {
                  const parsed = adminDrivingSchoolMediaSchema.safeParse(mediaForm);
                  if (!parsed.success) {
                    toast.error(parsed.error.issues[0]?.message || 'Media formasi xato.');
                    return;
                  }
                  void adminCreateDrivingSchoolMedia(selectedSchool.id, parsed.data)
                    .then(() => {
                      toast.success('Media qoshildi.');
                      setMediaForm(emptyMedia());
                      return loadData();
                    })
                    .catch((err) => toast.error(getErrorMessage(err)));
                }}
              >
                Media qoshish
              </Button>
              <div className="mt-3 space-y-2">
                {selectedSchool.media_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2 text-sm">
                    <span className="truncate">{item.media_type} | {item.url}</span>
                    <Button size="sm" variant="destructive" onClick={() => void adminDeleteDrivingSchoolMedia(item.id).then(loadData)}>Delete</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AdminLayout>
  );
}
