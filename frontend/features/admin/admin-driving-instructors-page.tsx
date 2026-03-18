"use client";

import { Plus, Trash2, Upload, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createAdminInstructor,
  createAdminInstructorMedia,
  deleteAdminInstructor,
  deleteAdminInstructorMedia,
  deleteAdminInstructorReview,
  getAdminDrivingInstructorsData,
  updateAdminInstructor,
  updateAdminInstructorApplication,
  updateAdminInstructorComplaint,
  updateAdminInstructorLead,
  updateAdminInstructorMedia,
  updateAdminInstructorRegistrationSettings,
  updateAdminInstructorReview,
  uploadAdminInstructorMedia,
} from "@/api/admin";
import type {
  AdminDrivingInstructorMediaPayload,
  AdminDrivingInstructorPayload,
  AdminDrivingInstructorRegistrationSettingsPayload,
} from "@/types/admin";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/shared/ui/modal";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { formatAdminStatus, statusVariant, toIsoOrNull, toNullableString, toOptionalNumber, toRequiredNumber } from "@/features/admin/utils";
import type { InstructorAdminProfile } from "@/types/instructor";

type InstructorDraft = {
  user_id: string;
  slug: string;
  full_name: string;
  gender: string;
  years_experience: string;
  short_bio: string;
  teaching_style: string;
  city: string;
  region: string;
  service_areas: string;
  transmission: string;
  car_model: string;
  car_year: string;
  car_features: string;
  hourly_price_cents: string;
  currency: string;
  min_lesson_minutes: string;
  special_services: string;
  phone: string;
  telegram: string;
  profile_image_url: string;
  map_embed_url: string;
  referral_code: string;
  promo_code_id: string;
  is_verified: boolean;
  is_active: boolean;
  is_blocked: boolean;
  is_top_rated: boolean;
};

type MediaDraft = {
  id?: string;
  media_type: string;
  url: string;
  caption: string;
  sort_order: string;
  is_active: boolean;
};

function makeInstructorDraft(instructor?: InstructorAdminProfile): InstructorDraft {
  return {
    user_id: instructor?.user_id ?? "",
    slug: instructor?.slug ?? "",
    full_name: instructor?.full_name ?? "",
    gender: instructor?.gender ?? "",
    years_experience: String(instructor?.years_experience ?? 0),
    short_bio: instructor?.short_bio ?? "",
    teaching_style: instructor?.teaching_style ?? "",
    city: instructor?.city ?? "",
    region: instructor?.region ?? "",
    service_areas: instructor?.service_areas ?? "",
    transmission: instructor?.transmission ?? "manual",
    car_model: instructor?.car_model ?? "",
    car_year: instructor?.car_year != null ? String(instructor.car_year) : "",
    car_features: instructor?.car_features ?? "",
    hourly_price_cents: String(instructor?.hourly_price_cents ?? 0),
    currency: instructor?.currency ?? "UZS",
    min_lesson_minutes: String(instructor?.min_lesson_minutes ?? 60),
    special_services: instructor?.special_services ?? "",
    phone: instructor?.phone ?? "",
    telegram: instructor?.telegram ?? "",
    profile_image_url: instructor?.profile_image_url ?? "",
    map_embed_url: instructor?.map_embed_url ?? "",
    referral_code: instructor?.referral_code ?? "",
    promo_code_id: instructor?.promo_code_id ?? "",
    is_verified: instructor?.is_verified ?? false,
    is_active: instructor?.is_active ?? true,
    is_blocked: instructor?.is_blocked ?? false,
    is_top_rated: instructor?.is_top_rated ?? false,
  };
}

function makeMediaDraft(item?: InstructorAdminProfile["media_items"][number]): MediaDraft {
  return {
    id: item?.id,
    media_type: item?.media_type ?? "image",
    url: item?.url ?? "",
    caption: item?.caption ?? "",
    sort_order: String(item?.sort_order ?? 0),
    is_active: item?.is_active ?? true,
  };
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-[1.75rem] bg-[var(--muted)]" />
      <Skeleton className="h-[26rem] rounded-[1.75rem] bg-[var(--muted)]" />
      <Skeleton className="h-[36rem] rounded-[1.75rem] bg-[var(--muted)]" />
    </div>
  );
}

export function AdminDrivingInstructorsPage() {
  const resource = useAsyncResource(getAdminDrivingInstructorsData, [], true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<InstructorAdminProfile | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [draft, setDraft] = useState<InstructorDraft>(makeInstructorDraft());
  const [mediaDraft, setMediaDraft] = useState<MediaDraft>(makeMediaDraft());

  const selectedInstructor = useMemo(() => {
    const items = resource.data?.instructors ?? [];
    return items.find((item) => item.id === selectedInstructorId) ?? items[0] ?? null;
  }, [resource.data?.instructors, selectedInstructorId]);

  const refresh = async () => {
    await resource.reload();
  };

  const openModal = (instructor?: InstructorAdminProfile) => {
    setEditingInstructor(instructor ?? null);
    setDraft(makeInstructorDraft(instructor));
    setModalOpen(true);
  };

  const saveInstructor = async () => {
    setBusy("instructor");
    setNotice(null);
    const payload: AdminDrivingInstructorPayload = {
      user_id: toNullableString(draft.user_id),
      slug: toNullableString(draft.slug),
      full_name: draft.full_name.trim(),
      gender: toNullableString(draft.gender),
      years_experience: toRequiredNumber(draft.years_experience, 0),
      short_bio: draft.short_bio.trim(),
      teaching_style: toNullableString(draft.teaching_style),
      city: draft.city.trim(),
      region: toNullableString(draft.region),
      service_areas: toNullableString(draft.service_areas),
      transmission: draft.transmission.trim(),
      car_model: draft.car_model.trim(),
      car_year: toOptionalNumber(draft.car_year),
      car_features: toNullableString(draft.car_features),
      hourly_price_cents: toRequiredNumber(draft.hourly_price_cents, 0),
      currency: draft.currency.trim() || "UZS",
      min_lesson_minutes: toRequiredNumber(draft.min_lesson_minutes, 60),
      special_services: toNullableString(draft.special_services),
      phone: draft.phone.trim(),
      telegram: toNullableString(draft.telegram),
      profile_image_url: draft.profile_image_url.trim(),
      map_embed_url: toNullableString(draft.map_embed_url),
      referral_code: toNullableString(draft.referral_code),
      promo_code_id: toNullableString(draft.promo_code_id),
      is_verified: draft.is_verified,
      is_active: draft.is_active,
      is_blocked: draft.is_blocked,
      is_top_rated: draft.is_top_rated,
    };

    try {
      const saved = editingInstructor
        ? await updateAdminInstructor(editingInstructor.id, payload)
        : await createAdminInstructor(payload);
      setSelectedInstructorId(saved.id);
      setModalOpen(false);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Instruktor saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const saveMedia = async () => {
    if (!selectedInstructor) return;
    setBusy("media");
    setNotice(null);
    const payload: AdminDrivingInstructorMediaPayload = {
      media_type: mediaDraft.media_type,
      url: mediaDraft.url.trim(),
      caption: toNullableString(mediaDraft.caption),
      sort_order: toRequiredNumber(mediaDraft.sort_order, 0),
      is_active: mediaDraft.is_active,
    };

    try {
      if (mediaDraft.id) {
        await updateAdminInstructorMedia(mediaDraft.id, payload);
      } else {
        await createAdminInstructorMedia(selectedInstructor.id, payload);
      }
      setMediaDraft(makeMediaDraft());
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Media saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const saveSettings = async (payload: AdminDrivingInstructorRegistrationSettingsPayload) => {
    setBusy("settings");
    setNotice(null);
    try {
      await updateAdminInstructorRegistrationSettings(payload);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Registration settings saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  if (resource.loading) {
    return <LoadingState />;
  }

  if (resource.error || !resource.data) {
    return (
      <ErrorState
        title="Driving instructors admin yuklanmadi"
        description="Instruktorlar ma'lumotini olib bo'lmadi."
        error={resource.error}
        onRetry={() => void resource.reload()}
      />
    );
  }

  const registrationSettings = resource.data.registrationSettings;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instruktorlar"
        description="Instructor CRUD, media, apply/leads/reviews/complaints va registration settings shu sahifaga birlashtirildi."
        action={
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4" />
            Yangi instruktor
          </Button>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Instruktorlar katalogi</CardTitle>
          <CardDescription>{resource.data.instructors.length} ta instruktor admin panelga ulangan</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {resource.data.instructors.length === 0 ? (
            <EmptyState title="Instruktor yo'q" description="Yangi instruktor yaratish uchun yuqoridagi tugmadan foydalaning." />
          ) : (
            resource.data.instructors.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.full_name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.city}{item.region ? `, ${item.region}` : ""} • {item.transmission}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={item.is_active ? "success" : "outline"}>{item.is_active ? "Active" : "Inactive"}</Badge>
                    {item.is_verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Pending</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedInstructorId(item.id)}>Boshqarish</Button>
                  <Button size="sm" variant="outline" onClick={() => openModal(item)}>Tahrirlash</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === item.id}
                    onClick={() => {
                      void (async () => {
                        setBusy(item.id);
                        try {
                          await deleteAdminInstructor(item.id);
                          await refresh();
                        } finally {
                          setBusy(null);
                        }
                      })();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    O'chirish
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {selectedInstructor ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedInstructor.full_name} boshqaruvi</CardTitle>
            <CardDescription>Media, promo va asosiy operatsiyalar</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <p className="font-medium">Media formasi</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Select value={mediaDraft.media_type} onChange={(event) => setMediaDraft((draft) => ({ ...draft, media_type: event.target.value }))}>
                    <option value="image">image</option>
                    <option value="video">video</option>
                  </Select>
                  <Input placeholder="Sort order" value={mediaDraft.sort_order} onChange={(event) => setMediaDraft((draft) => ({ ...draft, sort_order: event.target.value }))} />
                  <Input className="md:col-span-2" placeholder="Media URL" value={mediaDraft.url} onChange={(event) => setMediaDraft((draft) => ({ ...draft, url: event.target.value }))} />
                  <Input className="md:col-span-2" placeholder="Caption" value={mediaDraft.caption} onChange={(event) => setMediaDraft((draft) => ({ ...draft, caption: event.target.value }))} />
                  <Input className="md:col-span-2" type="file" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void (async () => {
                      setBusy("instructor-upload");
                      try {
                        const uploaded = await uploadAdminInstructorMedia(file);
                        setMediaDraft((draft) => ({ ...draft, url: uploaded.url }));
                      } finally {
                        setBusy(null);
                      }
                    })();
                  }} />
                  <label className="flex items-center gap-3 text-sm font-medium md:col-span-2">
                    <input type="checkbox" checked={mediaDraft.is_active} onChange={(event) => setMediaDraft((draft) => ({ ...draft, is_active: event.target.checked }))} />
                    Active
                  </label>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button disabled={busy === "media" || busy === "instructor-upload"} onClick={() => void saveMedia()}>
                    <Upload className="h-4 w-4" />
                    {mediaDraft.id ? "Mediani saqlash" : "Media qo'shish"}
                  </Button>
                  <Button variant="outline" onClick={() => setMediaDraft(makeMediaDraft())}>Tozalash</Button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedInstructor.media_items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.caption ?? item.media_type}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.url}</p>
                      </div>
                      <Badge variant={item.is_active ? "success" : "outline"}>{item.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setMediaDraft(makeMediaDraft(item))}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => void deleteAdminInstructorMedia(item.id).then(refresh)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-[var(--border)] shadow-none">
              <CardHeader>
                <CardTitle>Registration settings</CardTitle>
                <CardDescription>Paid/free campaign oqimi</CardDescription>
              </CardHeader>
              <CardContent>
                {registrationSettings ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input defaultValue={String(registrationSettings.price_cents)} placeholder="Price cents" onBlur={(event) => void saveSettings({ price_cents: Number(event.target.value) })} />
                      <Input defaultValue={String(registrationSettings.validity_days)} placeholder="Validity days" onBlur={(event) => void saveSettings({ validity_days: Number(event.target.value) })} />
                      <Input defaultValue={String(registrationSettings.discount_percent)} placeholder="Discount percent" onBlur={(event) => void saveSettings({ discount_percent: Number(event.target.value) })} />
                      <Input defaultValue={registrationSettings.currency} placeholder="Currency" onBlur={(event) => void saveSettings({ currency: event.target.value })} />
                      <Input className="md:col-span-2" defaultValue={registrationSettings.campaign_title ?? ""} placeholder="Campaign title" onBlur={(event) => void saveSettings({ campaign_title: toNullableString(event.target.value) })} />
                      <Textarea className="md:col-span-2" defaultValue={registrationSettings.campaign_description ?? ""} placeholder="Campaign description" onBlur={(event) => void saveSettings({ campaign_description: toNullableString(event.target.value) })} />
                      <Input type="datetime-local" className="md:col-span-2" defaultValue={registrationSettings.countdown_ends_at?.slice(0, 16) ?? ""} onBlur={(event) => void saveSettings({ countdown_ends_at: toIsoOrNull(event.target.value) })} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => void saveSettings({ is_paid_enabled: !registrationSettings.is_paid_enabled })}>
                        {registrationSettings.is_paid_enabled ? "Paid off" : "Paid on"}
                      </Button>
                      <Button variant="outline" onClick={() => void saveSettings({ free_banner_enabled: !registrationSettings.free_banner_enabled })}>
                        Banner toggle
                      </Button>
                      <Button variant="outline" onClick={() => void saveSettings({ countdown_enabled: !registrationSettings.countdown_enabled })}>
                        Countdown toggle
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState title="Sozlamalar yo'q" description="Hozircha ro'yxatdan o'tish sozlamalari topilmadi." />
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Apply oqimi</CardTitle>
            <CardDescription>{resource.data.applications.length} ta application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resource.data.applications.length === 0 ? (
              <EmptyState title="Application yo'q" description="Instructor apply oqimi shu yerda." />
            ) : resource.data.applications.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.full_name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.city} • {item.phone}</p>
                  </div>
                  <Badge variant={statusVariant(item.status)}>{formatAdminStatus(item.status)}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  {["pending", "approved", "rejected"].map((status) => (
                    <Button key={status} size="sm" variant="outline" onClick={() => void updateAdminInstructorApplication(item.id, { status, rejection_reason: status === "rejected" ? "Admin rejected" : null }).then(refresh)}>
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leadlar</CardTitle>
            <CardDescription>{resource.data.leads.length} ta lead</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resource.data.leads.length === 0 ? (
              <EmptyState title="Lead yo'q" description="Instruktor leadlari shu yerda." />
            ) : resource.data.leads.map((lead) => (
              <div key={lead.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{lead.full_name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{lead.instructor_name ?? "Unknown instructor"} • {lead.phone}</p>
                  </div>
                  <Badge variant={statusVariant(lead.status)}>{formatAdminStatus(lead.status)}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  {["new", "contacted", "booked", "rejected"].map((status) => (
                    <Button key={status} size="sm" variant="outline" onClick={() => void updateAdminInstructorLead(lead.id, { status }).then(refresh)}>
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reviewlar va shikoyatlar</CardTitle>
            <CardDescription>Moderatsiya oqimi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resource.data.reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{review.rating}/5</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{review.comment ?? "No comment"}</p>
                  </div>
                  <Badge variant={review.is_visible ? "success" : "outline"}>{review.is_visible ? "Visible" : "Hidden"}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void updateAdminInstructorReview(review.id, { is_visible: !review.is_visible }).then(refresh)}>
                    {review.is_visible ? "Hide" : "Show"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void deleteAdminInstructorReview(review.id).then(refresh)}>Delete</Button>
                </div>
              </div>
            ))}
            {resource.data.complaints.map((complaint) => (
              <div key={complaint.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{complaint.full_name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{complaint.reason}</p>
                  </div>
                  <Badge variant={statusVariant(complaint.status)}>{formatAdminStatus(complaint.status)}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  {["new", "reviewing", "resolved"].map((status) => (
                    <Button key={status} size="sm" variant="outline" onClick={() => void updateAdminInstructorComplaint(complaint.id, { status }).then(refresh)}>
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Promo statistika</CardTitle>
            <CardDescription>Instruktor promo va referral ko'rsatkichlari</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resource.data.promoStats.length === 0 ? (
              <EmptyState title="Promo statistika yo'q" description="Hozircha ma'lumot topilmadi." />
            ) : resource.data.promoStats.map((item) => (
              <div key={item.instructor_id} className="rounded-2xl border border-[var(--border)] p-4">
                <p className="font-medium">{item.instructor_name}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.referral_code} • {item.promo_code ?? "No promo"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{item.lead_count} leads</Badge>
                  <Badge variant="outline">{item.promo_redemption_count} redemptions</Badge>
                  <Badge variant="outline">{item.view_count} views</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingInstructor ? "Instruktor tahrirlash" : "Yangi instruktor"} className="max-w-5xl">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="User id" value={draft.user_id} onChange={(event) => setDraft((state) => ({ ...state, user_id: event.target.value }))} />
          <Input placeholder="Slug" value={draft.slug} onChange={(event) => setDraft((state) => ({ ...state, slug: event.target.value }))} />
          <Input placeholder="Full name" value={draft.full_name} onChange={(event) => setDraft((state) => ({ ...state, full_name: event.target.value }))} />
          <Input placeholder="Gender" value={draft.gender} onChange={(event) => setDraft((state) => ({ ...state, gender: event.target.value }))} />
          <Input placeholder="Years experience" value={draft.years_experience} onChange={(event) => setDraft((state) => ({ ...state, years_experience: event.target.value }))} />
          <Input placeholder="Transmission" value={draft.transmission} onChange={(event) => setDraft((state) => ({ ...state, transmission: event.target.value }))} />
          <Input placeholder="City" value={draft.city} onChange={(event) => setDraft((state) => ({ ...state, city: event.target.value }))} />
          <Input placeholder="Region" value={draft.region} onChange={(event) => setDraft((state) => ({ ...state, region: event.target.value }))} />
          <Input placeholder="Car model" value={draft.car_model} onChange={(event) => setDraft((state) => ({ ...state, car_model: event.target.value }))} />
          <Input placeholder="Car year" value={draft.car_year} onChange={(event) => setDraft((state) => ({ ...state, car_year: event.target.value }))} />
          <Input placeholder="Hourly price cents" value={draft.hourly_price_cents} onChange={(event) => setDraft((state) => ({ ...state, hourly_price_cents: event.target.value }))} />
          <Input placeholder="Currency" value={draft.currency} onChange={(event) => setDraft((state) => ({ ...state, currency: event.target.value }))} />
          <Input placeholder="Min lesson minutes" value={draft.min_lesson_minutes} onChange={(event) => setDraft((state) => ({ ...state, min_lesson_minutes: event.target.value }))} />
          <Input placeholder="Phone" value={draft.phone} onChange={(event) => setDraft((state) => ({ ...state, phone: event.target.value }))} />
          <Input placeholder="Telegram" value={draft.telegram} onChange={(event) => setDraft((state) => ({ ...state, telegram: event.target.value }))} />
          <Input placeholder="Referral code" value={draft.referral_code} onChange={(event) => setDraft((state) => ({ ...state, referral_code: event.target.value }))} />
          <Input className="md:col-span-2" placeholder="Profile image URL" value={draft.profile_image_url} onChange={(event) => setDraft((state) => ({ ...state, profile_image_url: event.target.value }))} />
          <Input className="md:col-span-2" placeholder="Map embed URL" value={draft.map_embed_url} onChange={(event) => setDraft((state) => ({ ...state, map_embed_url: event.target.value }))} />
          <Input className="md:col-span-2" placeholder="Promo code id" value={draft.promo_code_id} onChange={(event) => setDraft((state) => ({ ...state, promo_code_id: event.target.value }))} />
          <Textarea className="md:col-span-2" placeholder="Short bio" value={draft.short_bio} onChange={(event) => setDraft((state) => ({ ...state, short_bio: event.target.value }))} />
          <Textarea className="md:col-span-2" placeholder="Teaching style" value={draft.teaching_style} onChange={(event) => setDraft((state) => ({ ...state, teaching_style: event.target.value }))} />
          <Textarea className="md:col-span-2" placeholder="Service areas" value={draft.service_areas} onChange={(event) => setDraft((state) => ({ ...state, service_areas: event.target.value }))} />
          <Textarea className="md:col-span-2" placeholder="Car features / special services" value={draft.car_features} onChange={(event) => setDraft((state) => ({ ...state, car_features: event.target.value }))} />
          <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.is_verified} onChange={(event) => setDraft((state) => ({ ...state, is_verified: event.target.checked }))} />Verified</label>
          <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft((state) => ({ ...state, is_active: event.target.checked }))} />Active</label>
          <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.is_blocked} onChange={(event) => setDraft((state) => ({ ...state, is_blocked: event.target.checked }))} />Blocked</label>
          <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={draft.is_top_rated} onChange={(event) => setDraft((state) => ({ ...state, is_top_rated: event.target.checked }))} />Top rated</label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Bekor qilish</Button>
          <Button disabled={busy === "instructor"} onClick={() => void saveInstructor()}>
            <UserRound className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </Modal>
    </div>
  );
}
