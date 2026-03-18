"use client";

import { Building2, Plus, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";

import {
  createAdminSchool,
  createAdminSchoolCourse,
  createAdminSchoolMedia,
  deleteAdminSchool,
  deleteAdminSchoolCourse,
  deleteAdminSchoolMedia,
  deleteAdminSchoolReview,
  getAdminDrivingSchoolsData,
  updateAdminSchool,
  updateAdminSchoolApplication,
  updateAdminSchoolCourse,
  updateAdminSchoolLead,
  updateAdminSchoolMedia,
  updateAdminSchoolReview,
  uploadAdminSchoolMedia,
} from "@/api/admin";
import type {
  AdminDrivingSchoolCoursePayload,
  AdminDrivingSchoolMediaPayload,
  AdminDrivingSchoolPayload,
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
import { formatAdminStatus, statusVariant, toNullableString, toOptionalNumber, toRequiredNumber } from "@/features/admin/utils";
import type { SchoolAdminProfile } from "@/types/school";

type SchoolDraft = {
  owner_user_id: string;
  slug: string;
  name: string;
  short_description: string;
  full_description: string;
  city: string;
  region: string;
  address: string;
  landmark: string;
  phone: string;
  telegram: string;
  website: string;
  work_hours: string;
  license_info: string;
  years_active: string;
  logo_url: string;
  map_embed_url: string;
  referral_code: string;
  promo_code_id: string;
  is_active: boolean;
};

type CourseDraft = {
  id?: string;
  category_code: string;
  duration_weeks: string;
  price_cents: string;
  currency: string;
  installment_available: boolean;
  description: string;
  is_active: boolean;
  sort_order: string;
};

type MediaDraft = {
  id?: string;
  media_type: string;
  url: string;
  caption: string;
  sort_order: string;
  is_active: boolean;
};

function makeSchoolDraft(school?: SchoolAdminProfile): SchoolDraft {
  return {
    owner_user_id: school?.owner_user_id ?? "",
    slug: school?.slug ?? "",
    name: school?.name ?? "",
    short_description: school?.short_description ?? "",
    full_description: school?.full_description ?? "",
    city: school?.city ?? "",
    region: school?.region ?? "",
    address: school?.address ?? "",
    landmark: school?.landmark ?? "",
    phone: school?.phone ?? "",
    telegram: school?.telegram ?? "",
    website: school?.website ?? "",
    work_hours: school?.work_hours ?? "",
    license_info: school?.license_info ?? "",
    years_active: school?.years_active != null ? String(school.years_active) : "",
    logo_url: school?.logo_url ?? "",
    map_embed_url: school?.map_embed_url ?? "",
    referral_code: school?.referral_code ?? "",
    promo_code_id: school?.promo_code_id ?? "",
    is_active: school?.is_active ?? true,
  };
}

function makeCourseDraft(course?: SchoolAdminProfile["courses"][number]): CourseDraft {
  return {
    id: course?.id,
    category_code: course?.category_code ?? "",
    duration_weeks: course?.duration_weeks != null ? String(course.duration_weeks) : "",
    price_cents: course?.price_cents != null ? String(course.price_cents) : "",
    currency: course?.currency ?? "UZS",
    installment_available: course?.installment_available ?? false,
    description: course?.description ?? "",
    is_active: course?.is_active ?? true,
    sort_order: String(course?.sort_order ?? 0),
  };
}

function makeMediaDraft(item?: SchoolAdminProfile["media_items"][number]): MediaDraft {
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

export function AdminDrivingSchoolsPage() {
  const resource = useAsyncResource(getAdminDrivingSchoolsData, [], true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolAdminProfile | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [schoolDraft, setSchoolDraft] = useState<SchoolDraft>(makeSchoolDraft());
  const [courseDraft, setCourseDraft] = useState<CourseDraft>(makeCourseDraft());
  const [mediaDraft, setMediaDraft] = useState<MediaDraft>(makeMediaDraft());

  const selectedSchool = useMemo(() => {
    const schools = resource.data?.schools ?? [];
    return schools.find((school) => school.id === selectedSchoolId) ?? schools[0] ?? null;
  }, [resource.data?.schools, selectedSchoolId]);

  const refresh = async () => {
    await resource.reload();
  };

  const openSchoolModal = (school?: SchoolAdminProfile) => {
    setEditingSchool(school ?? null);
    setSchoolDraft(makeSchoolDraft(school));
    setSchoolModalOpen(true);
  };

  const saveSchool = async () => {
    setBusy("school");
    setNotice(null);
    const payload: AdminDrivingSchoolPayload = {
      owner_user_id: toNullableString(schoolDraft.owner_user_id),
      slug: toNullableString(schoolDraft.slug),
      name: schoolDraft.name.trim(),
      short_description: toNullableString(schoolDraft.short_description),
      full_description: toNullableString(schoolDraft.full_description),
      city: schoolDraft.city.trim(),
      region: toNullableString(schoolDraft.region),
      address: toNullableString(schoolDraft.address),
      landmark: toNullableString(schoolDraft.landmark),
      phone: schoolDraft.phone.trim(),
      telegram: toNullableString(schoolDraft.telegram),
      website: toNullableString(schoolDraft.website),
      work_hours: toNullableString(schoolDraft.work_hours),
      license_info: toNullableString(schoolDraft.license_info),
      years_active: toOptionalNumber(schoolDraft.years_active),
      logo_url: toNullableString(schoolDraft.logo_url),
      map_embed_url: toNullableString(schoolDraft.map_embed_url),
      referral_code: toNullableString(schoolDraft.referral_code),
      promo_code_id: toNullableString(schoolDraft.promo_code_id),
      is_active: schoolDraft.is_active,
    };

    try {
      const saved = editingSchool
        ? await updateAdminSchool(editingSchool.id, payload)
        : await createAdminSchool(payload);
      setSelectedSchoolId(saved.id);
      setSchoolModalOpen(false);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "School saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const saveCourse = async () => {
    if (!selectedSchool) {
      return;
    }
    setBusy("course");
    setNotice(null);
    const payload: AdminDrivingSchoolCoursePayload = {
      category_code: courseDraft.category_code.trim(),
      duration_weeks: toOptionalNumber(courseDraft.duration_weeks),
      price_cents: toOptionalNumber(courseDraft.price_cents),
      currency: courseDraft.currency.trim() || "UZS",
      installment_available: courseDraft.installment_available,
      description: toNullableString(courseDraft.description),
      is_active: courseDraft.is_active,
      sort_order: toRequiredNumber(courseDraft.sort_order, 0),
    };

    try {
      if (courseDraft.id) {
        await updateAdminSchoolCourse(courseDraft.id, payload);
      } else {
        await createAdminSchoolCourse(selectedSchool.id, payload);
      }
      setCourseDraft(makeCourseDraft());
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Kurs saqlanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const saveMedia = async () => {
    if (!selectedSchool) {
      return;
    }
    setBusy("media");
    setNotice(null);
    const payload: AdminDrivingSchoolMediaPayload = {
      media_type: mediaDraft.media_type,
      url: mediaDraft.url.trim(),
      caption: toNullableString(mediaDraft.caption),
      sort_order: toRequiredNumber(mediaDraft.sort_order, 0),
      is_active: mediaDraft.is_active,
    };

    try {
      if (mediaDraft.id) {
        await updateAdminSchoolMedia(mediaDraft.id, payload);
      } else {
        await createAdminSchoolMedia(selectedSchool.id, payload);
      }
      setMediaDraft(makeMediaDraft());
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Media saqlanmadi.");
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
        title="Driving schools admin yuklanmadi"
        description="Avtomaktablar ma'lumotini olib bo'lmadi."
        error={resource.error}
        onRetry={() => void resource.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avtomaktablar"
        description="School CRUD, kurs/media boshqaruvi, partner applications, leadlar va reviewlar shu yerda jamlangan."
        action={
          <Button onClick={() => openSchoolModal()}>
            <Plus className="h-4 w-4" />
            Yangi school
          </Button>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Avtomaktablar katalogi</CardTitle>
          <CardDescription>{resource.data.schools.length} ta school admin panelga ulangan</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {resource.data.schools.length === 0 ? (
            <EmptyState title="School yo'q" description="Yangi school yaratish uchun yuqoridagi tugmadan foydalaning." />
          ) : (
            resource.data.schools.map((school) => (
              <div key={school.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{school.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{school.city}{school.region ? `, ${school.region}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={school.is_active ? "success" : "outline"}>{school.is_active ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline">{school.lead_count} leads</Badge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedSchoolId(school.id)}>Boshqarish</Button>
                  <Button size="sm" variant="outline" onClick={() => openSchoolModal(school)}>Tahrirlash</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy === school.id}
                    onClick={() => {
                      void (async () => {
                        setBusy(school.id);
                        setNotice(null);
                        try {
                          await deleteAdminSchool(school.id);
                          await refresh();
                        } catch (error) {
                          setNotice(error instanceof Error ? error.message : "School o'chirilmadi.");
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

      {selectedSchool ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedSchool.name} boshqaruvi</CardTitle>
            <CardDescription>Kurs va media CRUD shu school kesimida ishlaydi</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border)] p-4">
                <p className="font-medium">Kurs formasi</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input placeholder="Category code" value={courseDraft.category_code} onChange={(event) => setCourseDraft((draft) => ({ ...draft, category_code: event.target.value }))} />
                  <Input placeholder="Duration weeks" value={courseDraft.duration_weeks} onChange={(event) => setCourseDraft((draft) => ({ ...draft, duration_weeks: event.target.value }))} />
                  <Input placeholder="Price cents" value={courseDraft.price_cents} onChange={(event) => setCourseDraft((draft) => ({ ...draft, price_cents: event.target.value }))} />
                  <Input placeholder="Currency" value={courseDraft.currency} onChange={(event) => setCourseDraft((draft) => ({ ...draft, currency: event.target.value }))} />
                  <Input placeholder="Sort order" value={courseDraft.sort_order} onChange={(event) => setCourseDraft((draft) => ({ ...draft, sort_order: event.target.value }))} />
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <input type="checkbox" checked={courseDraft.installment_available} onChange={(event) => setCourseDraft((draft) => ({ ...draft, installment_available: event.target.checked }))} />
                    Installment
                  </label>
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <input type="checkbox" checked={courseDraft.is_active} onChange={(event) => setCourseDraft((draft) => ({ ...draft, is_active: event.target.checked }))} />
                    Active
                  </label>
                  <Textarea className="md:col-span-2" placeholder="Description" value={courseDraft.description} onChange={(event) => setCourseDraft((draft) => ({ ...draft, description: event.target.value }))} />
                </div>
                <div className="mt-4 flex gap-3">
                  <Button disabled={busy === "course"} onClick={() => void saveCourse()}>{courseDraft.id ? "Kursni saqlash" : "Kurs qo'shish"}</Button>
                  <Button variant="outline" onClick={() => setCourseDraft(makeCourseDraft())}>Tozalash</Button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedSchool.courses.map((course) => (
                  <div key={course.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{course.category_code}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {course.duration_weeks ?? "?"} hafta • {course.price_cents != null ? formatCurrency(course.price_cents, course.currency) : "Narx yo'q"}
                        </p>
                      </div>
                      <Badge variant={course.is_active ? "success" : "outline"}>{course.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setCourseDraft(makeCourseDraft(course))}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => void deleteAdminSchoolCourse(course.id).then(refresh)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                      setBusy("school-upload");
                      try {
                        const uploaded = await uploadAdminSchoolMedia(file);
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
                  <Button disabled={busy === "media" || busy === "school-upload"} onClick={() => void saveMedia()}>
                    <Upload className="h-4 w-4" />
                    {mediaDraft.id ? "Mediani saqlash" : "Media qo'shish"}
                  </Button>
                  <Button variant="outline" onClick={() => setMediaDraft(makeMediaDraft())}>Tozalash</Button>
                </div>
              </div>

              <div className="space-y-3">
                {selectedSchool.media_items.map((item) => (
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
                      <Button size="sm" variant="ghost" onClick={() => void deleteAdminSchoolMedia(item.id).then(refresh)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Partner applications</CardTitle>
            <CardDescription>{resource.data.applications.length} ta ariza</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resource.data.applications.length === 0 ? (
              <EmptyState title="Ariza yo'q" description="Partner applications shu yerda ko'rinadi." />
            ) : resource.data.applications.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.school_name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.responsible_person} • {item.city}</p>
                  </div>
                  <Badge variant={statusVariant(item.status)}>{formatAdminStatus(item.status)}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  {["pending", "approved", "rejected"].map((status) => (
                    <Button key={status} size="sm" variant="outline" onClick={() => void updateAdminSchoolApplication(item.id, { status }).then(refresh)}>
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
              <EmptyState title="Leadlar yo'q" description="Katalogdan tushgan leadlar shu yerda." />
            ) : resource.data.leads.map((lead) => (
              <div key={lead.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{lead.full_name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{lead.school_name ?? "Unknown school"} • {lead.phone}</p>
                  </div>
                  <Badge variant={statusVariant(lead.status)}>{formatAdminStatus(lead.status)}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  {["new", "contacted", "enrolled", "rejected"].map((status) => (
                    <Button key={status} size="sm" variant="outline" onClick={() => void updateAdminSchoolLead(lead.id, { status }).then(refresh)}>
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
            <CardTitle>Reviewlar</CardTitle>
            <CardDescription>{resource.data.reviews.length} ta review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resource.data.reviews.length === 0 ? (
              <EmptyState title="Review yo'q" description="School review moderatsiyasi shu yerda." />
            ) : resource.data.reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{review.rating}/5</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{review.comment ?? "No comment"}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">{formatDate(review.created_at)}</p>
                  </div>
                  <Badge variant={review.is_visible ? "success" : "outline"}>{review.is_visible ? "Visible" : "Hidden"}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void updateAdminSchoolReview(review.id, { is_visible: !review.is_visible }).then(refresh)}>
                    {review.is_visible ? "Hide" : "Show"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void deleteAdminSchoolReview(review.id).then(refresh)}>Delete</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Promo statistika</CardTitle>
            <CardDescription>Referral va promo samaradorligi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resource.data.promoStats.length === 0 ? (
              <EmptyState title="Promo statistika yo'q" description="Hozircha ma'lumot topilmadi." />
            ) : resource.data.promoStats.map((item) => (
              <div key={item.school_id} className="rounded-2xl border border-[var(--border)] p-4">
                <p className="font-medium">{item.school_name}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {item.referral_code} • {item.promo_code ?? "No promo"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{item.lead_count} leads</Badge>
                  <Badge variant="outline">{item.promo_redemption_count} redemptions</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Modal open={schoolModalOpen} onClose={() => setSchoolModalOpen(false)} title={editingSchool ? "School tahrirlash" : "Yangi school"} className="max-w-5xl">
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Owner user id" value={schoolDraft.owner_user_id} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, owner_user_id: event.target.value }))} />
          <Input placeholder="Slug" value={schoolDraft.slug} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, slug: event.target.value }))} />
          <Input placeholder="Name" value={schoolDraft.name} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, name: event.target.value }))} />
          <Input placeholder="City" value={schoolDraft.city} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, city: event.target.value }))} />
          <Input placeholder="Region" value={schoolDraft.region} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, region: event.target.value }))} />
          <Input placeholder="Phone" value={schoolDraft.phone} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, phone: event.target.value }))} />
          <Input placeholder="Telegram" value={schoolDraft.telegram} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, telegram: event.target.value }))} />
          <Input placeholder="Website" value={schoolDraft.website} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, website: event.target.value }))} />
          <Input placeholder="Referral code" value={schoolDraft.referral_code} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, referral_code: event.target.value }))} />
          <Input placeholder="Promo code id" value={schoolDraft.promo_code_id} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, promo_code_id: event.target.value }))} />
          <Input placeholder="Address" value={schoolDraft.address} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, address: event.target.value }))} />
          <Input placeholder="Landmark" value={schoolDraft.landmark} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, landmark: event.target.value }))} />
          <Input placeholder="Work hours" value={schoolDraft.work_hours} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, work_hours: event.target.value }))} />
          <Input placeholder="License info" value={schoolDraft.license_info} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, license_info: event.target.value }))} />
          <Input placeholder="Years active" value={schoolDraft.years_active} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, years_active: event.target.value }))} />
          <Input placeholder="Logo URL" value={schoolDraft.logo_url} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, logo_url: event.target.value }))} />
          <Input className="md:col-span-2" placeholder="Map embed URL" value={schoolDraft.map_embed_url} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, map_embed_url: event.target.value }))} />
          <Textarea className="md:col-span-2" placeholder="Short description" value={schoolDraft.short_description} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, short_description: event.target.value }))} />
          <Textarea className="md:col-span-2" placeholder="Full description" value={schoolDraft.full_description} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, full_description: event.target.value }))} />
          <label className="flex items-center gap-3 text-sm font-medium md:col-span-2">
            <input type="checkbox" checked={schoolDraft.is_active} onChange={(event) => setSchoolDraft((draft) => ({ ...draft, is_active: event.target.checked }))} />
            Active
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setSchoolModalOpen(false)}>Bekor qilish</Button>
          <Button disabled={busy === "school"} onClick={() => void saveSchool()}>
            <Building2 className="h-4 w-4" />
            Saqlash
          </Button>
        </div>
      </Modal>
    </div>
  );
}
