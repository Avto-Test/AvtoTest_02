"use client";

import { useEffect, useState } from "react";

import { updateMyInstructorProfile } from "@/api/instructors";
import type { InstructorAdminProfile } from "@/types/instructor";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

export function InstructorProfileEditor({
  instructor,
  onSaved,
}: {
  instructor: InstructorAdminProfile;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    city: "",
    region: "",
    phone: "",
    car_model: "",
    hourly_price: "",
    transmission: "automatic",
    short_bio: "",
    teaching_style: "",
    map_embed_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      full_name: instructor.full_name,
      city: instructor.city,
      region: instructor.region ?? "",
      phone: instructor.phone,
      car_model: instructor.car_model,
      hourly_price: String(instructor.hourly_price_cents / 100),
      transmission: instructor.transmission,
      short_bio: instructor.short_bio,
      teaching_style: instructor.teaching_style ?? "",
      map_embed_url: instructor.map_embed_url ?? "",
    });
  }, [instructor]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateMyInstructorProfile({
        full_name: form.full_name.trim(),
        city: form.city.trim(),
        region: form.region.trim() || undefined,
        phone: form.phone.trim(),
        car_model: form.car_model.trim(),
        hourly_price_cents: Math.round(Number(form.hourly_price || 0) * 100),
        transmission: form.transmission,
        short_bio: form.short_bio.trim(),
        teaching_style: form.teaching_style.trim() || undefined,
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
          <Input placeholder="Ism va familiya" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} required />
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Shahar" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required />
            <Input placeholder="Viloyat" value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} />
          </div>
          <Input placeholder="Telefon" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Mashina modeli" value={form.car_model} onChange={(event) => setForm((current) => ({ ...current, car_model: event.target.value }))} required />
            <Input placeholder="Soatlik narx" type="number" min={0} value={form.hourly_price} onChange={(event) => setForm((current) => ({ ...current, hourly_price: event.target.value }))} required />
            <Select value={form.transmission} onChange={(event) => setForm((current) => ({ ...current, transmission: event.target.value }))}>
              <option value="automatic">Avtomat</option>
              <option value="manual">Mexanika</option>
            </Select>
          </div>
          <Textarea placeholder="Qisqacha bio" value={form.short_bio} onChange={(event) => setForm((current) => ({ ...current, short_bio: event.target.value }))} className="min-h-[100px]" />
          <Textarea placeholder="Teaching style" value={form.teaching_style} onChange={(event) => setForm((current) => ({ ...current, teaching_style: event.target.value }))} className="min-h-[100px]" />
          <Input placeholder="Map embed URL" value={form.map_embed_url} onChange={(event) => setForm((current) => ({ ...current, map_embed_url: event.target.value }))} />
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
