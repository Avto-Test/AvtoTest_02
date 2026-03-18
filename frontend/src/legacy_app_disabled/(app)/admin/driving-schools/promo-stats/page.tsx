'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DrivingSchoolAdminSubmenu } from '@/components/admin/driving-schools/DrivingSchoolAdminSubmenu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getErrorMessage } from '@/lib/api';
import { adminGetDrivingSchoolPromoStats } from '@/lib/drivingSchools';
import { DrivingSchoolPromoStatsItem } from '@/schemas/drivingSchool.schema';

export default function AdminDrivingSchoolPromoStatsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DrivingSchoolPromoStatsItem[]>([]);

  async function loadData() {
    setLoading(true);
    try {
      const stats = await adminGetDrivingSchoolPromoStats();
      setRows(stats);
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
    return rows.reduce(
      (acc, row) => {
        acc.leads += row.lead_count;
        acc.redeems += row.promo_redemption_count;
        return acc;
      },
      { leads: 0, redeems: 0 }
    );
  }, [rows]);

  if (loading) {
    return (
      <AdminLayout title="Promo statistika">
        <div>Yuklanmoqda...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Promo statistika"
      description="Avtomaktablar kesimida referral/promo samaradorligini kuzatish"
      actions={<Button onClick={() => void loadData()}>Yangilash</Button>}
    >
      <DrivingSchoolAdminSubmenu />

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="py-4"><CardHeader className="pb-2"><CardTitle className="text-base">Jami leadlar</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.leads}</p></CardContent></Card>
        <Card className="py-4"><CardHeader className="pb-2"><CardTitle className="text-base">Jami redeem</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.redeems}</p></CardContent></Card>
      </div>

      <Card className="py-4">
        <CardHeader className="pb-2"><CardTitle className="text-base">Avtomaktablar promo jadvali</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avtomaktab</TableHead>
                <TableHead>Promo</TableHead>
                <TableHead>Referral</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Redeem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.school_id}>
                  <TableCell>{row.school_name}</TableCell>
                  <TableCell>{row.promo_code || '-'}</TableCell>
                  <TableCell>{row.referral_code}</TableCell>
                  <TableCell>{row.lead_count}</TableCell>
                  <TableCell>{row.promo_redemption_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

