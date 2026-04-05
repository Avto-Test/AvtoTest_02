"use client";

import { useEffect, useState } from "react";

import { updateMySchoolProfile } from "@/api/schools";
import type { SchoolAdminProfile } from "@/types/school";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

export function SchoolProfileEditor({
  school,
  onSaved,
}: {
  school: SchoolAdminProfile;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    city: "",
    region: "",
    phone: "",
    short_description: "",
    address: "",
    work_hours: "",
    map_embed_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: school.name,
      city: school.city,
      region: school.region ?? "",
      phone: school.phone,
      short_description: school.short_description ?? "",
      address: school.address ?? "",
      work_hours: school.work_hours ?? "",
      map_embed_url: school.map_embed_url ?? "",
    });
  }, [school]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateMySchoolProfile({
        name: form.name.trim(),
        city: form.city.trim(),
        region: form.region.trim() || undefined,
        phone: form.phone.trim(),
        short_description: form.short_description.trim() || undefined,
        address: form.address.trim() || undefined,
        work_hours: form.work_hours.trim() || undefined,
        map_embed_url: form.map_embed_url.trim() || undefined,
      });
      setSuccess("Profil ma'lumotlari saqlandi.");
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Profil saqlanmadi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil tahriri</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input placeholder="Maktab nomi" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Shahar" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required />
            <Input placeholder="Viloyat" value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} />
          </div>
          <Input placeholder="Telefon" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
          <Textarea placeholder="Qisqa tavsif" value={form.short_description} onChange={(event) => setForm((current) => ({ ...current, short_description: event.target.value }))} className="min-h-[100px]" />
          <Input placeholder="Manzil" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Ish vaqti" value={form.work_hours} onChange={(event) => setForm((current) => ({ ...current, work_hours: event.target.value }))} />
            <Input placeholder="Map embed URL" value={form.map_embed_url} onChange={(event) => setForm((current) => ({ ...current, map_embed_url: event.target.value }))} />
          </div>
          {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Profilni saqlash"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
