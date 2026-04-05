'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { InstructorAdminSubmenu } from '@/components/admin/driving-instructors/InstructorAdminSubmenu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import { adminGetDrivingInstructorPromoStats, adminGetDrivingInstructorRegistrationSettings, adminUpdateDrivingInstructorRegistrationSettings } from '@/lib/drivingInstructors';
import { DrivingInstructorPromoStatsItem, DrivingInstructorRegistrationSettings } from '@/schemas/drivingInstructor.schema';

export default function AdminDrivingInstructorCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DrivingInstructorRegistrationSettings | null>(null);
  const [stats, setStats] = useState<DrivingInstructorPromoStatsItem[]>([]);

  async function loadData() {
    setLoading(true);
    try {
      const [settingsRow, statRows] = await Promise.all([
        adminGetDrivingInstructorRegistrationSettings(),
        adminGetDrivingInstructorPromoStats(),
      ]);
      setSettings(settingsRow);
      setStats(statRows);
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

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, item) => {
        acc.views += item.view_count;
        acc.leads += item.lead_count;
        acc.redeems += item.promo_redemption_count;
        return acc;
      },
      { views: 0, leads: 0, redeems: 0 }
    );
  }, [stats]);

  async function saveSettings() {
    if (!settings) return;
    try {
      await adminUpdateDrivingInstructorRegistrationSettings(settings);
      toast.success('Kampaniya sozlamalari saqlandi.');
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Kampaniya sozlamalari">
        <div>Yuklanmoqda...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Kampaniya sozlamalari"
      description="Pullik rejim, countdown, banner matni va chegirma boshqaruvi"
      actions={<Button onClick={() => void loadData()}>Yangilash</Button>}
    >
      <InstructorAdminSubmenu />
      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="py-4"><CardHeader className="pb-2"><CardTitle className="text-base">Jami ko‘rishlar</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.views}</p></CardContent></Card>
        <Card className="py-4"><CardHeader className="pb-2"><CardTitle className="text-base">Jami leadlar</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.leads}</p></CardContent></Card>
        <Card className="py-4"><CardHeader className="pb-2"><CardTitle className="text-base">Promo redeem</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.redeems}</p></CardContent></Card>
      </div>

      <Card className="mb-6 py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Kampaniya konfiguratsiyasi</CardTitle></CardHeader>
        <CardContent>
          {settings ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.is_paid_enabled} onChange={(e) => setSettings((prev) => (prev ? { ...prev, is_paid_enabled: e.target.checked } : prev))} /> Pullik ON/OFF</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.countdown_enabled} onChange={(e) => setSettings((prev) => (prev ? { ...prev, countdown_enabled: e.target.checked } : prev))} /> Countdown ON/OFF</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.free_banner_enabled} onChange={(e) => setSettings((prev) => (prev ? { ...prev, free_banner_enabled: e.target.checked } : prev))} /> Banner ON/OFF</label>
              <Input type="number" value={settings.price_cents} onChange={(e) => setSettings((prev) => (prev ? { ...prev, price_cents: Number(e.target.value || 0) } : prev))} placeholder="Narx (cents)" />
              <Input type="number" value={settings.discount_percent} onChange={(e) => setSettings((prev) => (prev ? { ...prev, discount_percent: Number(e.target.value || 0) } : prev))} placeholder="Chegirma foizi" />
              <Input type="number" value={settings.validity_days} onChange={(e) => setSettings((prev) => (prev ? { ...prev, validity_days: Number(e.target.value || 0) } : prev))} placeholder="Amal qilish kuni" />
              <Input value={settings.currency} onChange={(e) => setSettings((prev) => (prev ? { ...prev, currency: e.target.value } : prev))} placeholder="Valyuta" />
              <Input value={settings.campaign_title || ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, campaign_title: e.target.value } : prev))} placeholder="Banner matni" />
              <Input value={settings.countdown_ends_at || ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, countdown_ends_at: e.target.value } : prev))} placeholder="Tugash vaqti (ISO)" />
              <textarea className="xl:col-span-3 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={settings.campaign_description || ''} onChange={(e) => setSettings((prev) => (prev ? { ...prev, campaign_description: e.target.value } : prev))} placeholder="Kampaniya tavsifi" />
              <div className="xl:col-span-3"><Button onClick={() => void saveSettings()}>Saqlash</Button></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sozlama topilmadi.</p>
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Promo kod statistikasi</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instruktor</TableHead>
                <TableHead>Promo</TableHead>
                <TableHead>Referral</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Redeem</TableHead>
                <TableHead>Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((row) => (
                <TableRow key={row.instructor_id}>
                  <TableCell>{row.instructor_name}</TableCell>
                  <TableCell>{row.promo_code || '-'}</TableCell>
                  <TableCell>{row.referral_code}</TableCell>
                  <TableCell>{row.lead_count}</TableCell>
                  <TableCell>{row.promo_redemption_count}</TableCell>
                  <TableCell>{row.view_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
