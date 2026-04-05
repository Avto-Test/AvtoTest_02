"use client";

import { ImageIcon, MessageSquare, Plus, RefreshCcw, Search, ShieldAlert, Upload, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
import { AdminActionMenu, AdminDetailHeader, AdminStatCard, AdminSurface, AdminToolbar } from "@/features/admin/admin-ui";
import type {
  AdminDrivingInstructorMediaPayload,
  AdminDrivingInstructorPayload,
  AdminDrivingInstructorRegistrationSettingsPayload,
} from "@/types/admin";
import { useAsyncResource } from "@/hooks/use-async-resource";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "@/shared/ui/modal";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { formatAdminStatus, statusVariant, toIsoOrNull, toNullableString, toOptionalNumber, toRequiredNumber } from "@/features/admin/utils";
import type { InstructorAdminProfile } from "@/types/instructor";
import {
  canTransitionStatus,
  INSTRUCTOR_APPLICATION_STATUSES,
  INSTRUCTOR_APPLICATION_TRANSITIONS,
  INSTRUCTOR_COMPLAINT_STATUSES,
  INSTRUCTOR_COMPLAINT_TRANSITIONS,
  INSTRUCTOR_LEAD_STATUSES,
  INSTRUCTOR_LEAD_TRANSITIONS,
} from "@/types/statuses";
import type {
  DrivingInstructorApplicationStatus,
  DrivingInstructorComplaintStatus,
  DrivingInstructorLeadStatus,
} from "@/types/statuses";

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

function normalizeInstructorText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function ensureList<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function toInstructorPayload(instructor: InstructorAdminProfile): AdminDrivingInstructorPayload {
  return {
    user_id: instructor.user_id ?? null,
    slug: instructor.slug ?? null,
    full_name: instructor.full_name,
    gender: instructor.gender ?? null,
    years_experience: instructor.years_experience,
    short_bio: instructor.short_bio,
    teaching_style: instructor.teaching_style ?? null,
    city: instructor.city,
    region: instructor.region ?? null,
    service_areas: instructor.service_areas ?? null,
    transmission: instructor.transmission,
    car_model: instructor.car_model,
    car_year: instructor.car_year ?? null,
    car_features: instructor.car_features ?? null,
    hourly_price_cents: instructor.hourly_price_cents,
    currency: instructor.currency,
    min_lesson_minutes: instructor.min_lesson_minutes,
    special_services: instructor.special_services ?? null,
    phone: instructor.phone,
    telegram: instructor.telegram ?? null,
    profile_image_url: instructor.profile_image_url,
    map_embed_url: instructor.map_embed_url ?? null,
    referral_code: instructor.referral_code ?? null,
    promo_code_id: instructor.promo_code_id ?? null,
    is_verified: instructor.is_verified,
    is_active: instructor.is_active,
    is_blocked: instructor.is_blocked,
    is_top_rated: instructor.is_top_rated,
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailTab, setDetailTab] = useState("overview");
  const [applicationFilter, setApplicationFilter] = useState("linked");

  const selectedInstructor = useMemo(() => {
    const items = resource.data?.instructors ?? [];
    return items.find((item) => item.id === selectedInstructorId) ?? null;
  }, [resource.data?.instructors, selectedInstructorId]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredInstructors = useMemo(() => {
    return (resource.data?.instructors ?? []).filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.full_name.toLowerCase().includes(normalizedQuery) ||
        item.city.toLowerCase().includes(normalizedQuery) ||
        normalizeInstructorText(item.region).includes(normalizedQuery) ||
        normalizeInstructorText(item.short_bio).includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? item.is_active && !item.is_blocked
            : statusFilter === "pending"
              ? !item.is_verified
              : item.is_blocked;
      return matchesQuery && matchesStatus;
    });
  }, [normalizedQuery, resource.data?.instructors, statusFilter]);

  const selectedInstructorApplications = useMemo(() => {
    if (!selectedInstructor) {
      return [];
    }

    return (resource.data?.applications ?? []).filter((item) => item.linked_instructor_id === selectedInstructor.id);
  }, [resource.data?.applications, selectedInstructor]);

  const unlinkedInstructorApplications = useMemo(() => {
    return (resource.data?.applications ?? []).filter((item) => !item.linked_instructor_id);
  }, [resource.data?.applications]);

  const visibleInstructorApplications = useMemo(() => {
    if (!selectedInstructor) {
      return [];
    }
    if (applicationFilter === "unlinked") {
      return unlinkedInstructorApplications;
    }
    if (applicationFilter === "all") {
      return [...selectedInstructorApplications, ...unlinkedInstructorApplications];
    }
    return selectedInstructorApplications;
  }, [applicationFilter, selectedInstructor, selectedInstructorApplications, unlinkedInstructorApplications]);

  const selectedInstructorLeads = useMemo(() => {
    if (!selectedInstructor) {
      return [];
    }
    return (resource.data?.leads ?? []).filter((lead) => lead.instructor_id === selectedInstructor.id);
  }, [resource.data?.leads, selectedInstructor]);

  const selectedInstructorComplaints = useMemo(() => {
    if (!selectedInstructor) {
      return [];
    }
    return (resource.data?.complaints ?? []).filter((complaint) => complaint.instructor_id === selectedInstructor.id);
  }, [resource.data?.complaints, selectedInstructor]);

  const selectedInstructorPromoStats = useMemo(() => {
    if (!selectedInstructor) {
      return null;
    }
    return (resource.data?.promoStats ?? []).find((item) => item.instructor_id === selectedInstructor.id) ?? null;
  }, [resource.data?.promoStats, selectedInstructor]);
  const selectedInstructorMediaItems = ensureList(selectedInstructor?.media_items);
  const selectedInstructorReviews = ensureList(selectedInstructor?.reviews);

  const refresh = async () => {
    await resource.reload();
  };

  useEffect(() => {
    setApplicationFilter("linked");
  }, [selectedInstructorId]);

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

  const removeInstructor = async (instructor: InstructorAdminProfile) => {
    setBusy(instructor.id);
    setNotice(null);
    try {
      await deleteAdminInstructor(instructor.id);
      if (selectedInstructorId === instructor.id) {
        setSelectedInstructorId(null);
      }
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Instruktor o'chirilmadi.");
    } finally {
      setBusy(null);
    }
  };

  const toggleInstructorActive = async (instructor: InstructorAdminProfile) => {
    setBusy(`instructor-status-${instructor.id}`);
    setNotice(null);
    try {
      await updateAdminInstructor(instructor.id, { ...toInstructorPayload(instructor), is_active: !instructor.is_active });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Instruktor holati yangilanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const updateInstructorApplicationStatus = async (
    applicationId: string,
    nextStatus: DrivingInstructorApplicationStatus,
    currentRejectionReason?: string | null,
    linkedInstructorId?: string | null,
  ) => {
    setBusy(`instructor-application-${applicationId}-${nextStatus}`);
    setNotice(null);
    try {
      await updateAdminInstructorApplication(applicationId, {
        status: nextStatus,
        rejection_reason: nextStatus === "REJECTED" ? currentRejectionReason ?? "Admin rejected" : null,
        linked_instructor_id: linkedInstructorId ?? undefined,
      });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Application holati yangilanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const linkInstructorApplication = async (
    applicationId: string,
    currentStatus: DrivingInstructorApplicationStatus,
    currentRejectionReason?: string | null,
  ) => {
    if (!selectedInstructor) {
      return;
    }
    setBusy(`instructor-application-link-${applicationId}`);
    setNotice(null);
    try {
      await updateAdminInstructorApplication(applicationId, {
        status: currentStatus,
        rejection_reason: currentStatus === "REJECTED" ? currentRejectionReason ?? "Admin rejected" : null,
        linked_instructor_id: selectedInstructor.id,
      });
      setNotice("Application tanlangan instruktor bilan bog'landi.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Application instruktor bilan bog'lanmadi.");
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
        description="Instructor CRUD, media, applications, leads, reviews, complaints va registration settings endi cleaner detail oqimida boshqariladi."
        action={
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4" />
            Yangi instruktor
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Jami instructors" value={resource.data.instructors.length} caption="Admin panelga ulangan profil" icon={Users} />
        <AdminStatCard label="Verified" value={resource.data.instructors.filter((item) => item.is_verified).length} caption="Tasdiqlangan instruktorlar" icon={UserRound} tone="success" />
        <AdminStatCard label="Leadlar" value={resource.data.leads.length} caption="Bron va aloqa so'rovlari" icon={MessageSquare} tone="warning" />
        <AdminStatCard label="Complaints" value={resource.data.complaints.length} caption="Moderatsiya signalari" icon={ShieldAlert} tone="danger" />
      </div>

      <AdminToolbar
        search={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Instruktor, shahar yoki bio bo'yicha qidiring"
              className="pl-9"
            />
          </div>
        }
        filters={
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-40">
            <option value="all">Barcha status</option>
            <option value="active">Faol</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
          </Select>
        }
        actions={
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCcw className="h-4 w-4" />
            Yangilash
          </Button>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>
      ) : null}

      <AdminSurface
        title="Instructor katalogi"
        description={`${filteredInstructors.length} ta instruktor ko'rinmoqda. Detail sahifa Manage tugmasi bilan ochiladi.`}
      >
        <div className="grid gap-4 p-5 xl:grid-cols-3">
          {filteredInstructors.length === 0 ? (
            <EmptyState title="Instruktor topilmadi" description="Qidiruv va filtr bo'yicha mos instruktor yo'q." />
          ) : (
            filteredInstructors.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{item.full_name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {item.city}
                      {item.region ? `, ${item.region}` : ""} / {item.transmission}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">{item.short_bio}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={item.is_active ? "success" : "muted"}>{item.is_active ? "Active" : "Inactive"}</Badge>
                    {item.is_verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Pending</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="muted">{formatCurrency(item.hourly_price_cents, item.currency)}</Badge>
                  <Badge variant="muted">{item.lead_count} leads</Badge>
                  {item.is_top_rated ? <Badge variant="warning">Top rated</Badge> : null}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedInstructorId(item.id); setDetailTab("overview"); }}>
                    Manage
                  </Button>
                  <AdminActionMenu
                    items={[
                      { label: "Edit", onClick: () => openModal(item) },
                      {
                        label: item.is_active ? "Deactivate" : "Activate",
                        disabled: busy === `instructor-status-${item.id}`,
                        onClick: () => void toggleInstructorActive(item),
                      },
                      {
                        label: "Delete",
                        tone: "danger",
                        disabled: busy === item.id,
                        onClick: () => void removeInstructor(item),
                      },
                    ]}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </AdminSurface>

      {selectedInstructor ? (
        <>
          <AdminDetailHeader
            title={selectedInstructor.full_name}
            description={selectedInstructor.short_bio}
            onBack={() => setSelectedInstructorId(null)}
            action={
              <>
                <Button variant="outline" onClick={() => openModal(selectedInstructor)}>
                  Tahrirlash
                </Button>
                <AdminActionMenu
                  items={[
                    {
                      label: selectedInstructor.is_active ? "Deactivate" : "Activate",
                      disabled: busy === `instructor-status-${selectedInstructor.id}`,
                      onClick: () => void toggleInstructorActive(selectedInstructor),
                    },
                    {
                      label: "Delete",
                      tone: "danger",
                      disabled: busy === selectedInstructor.id,
                      onClick: () => void removeInstructor(selectedInstructor),
                    },
                  ]}
                />
              </>
            }
            meta={
              <>
                <Badge variant={selectedInstructor.is_active ? "success" : "muted"}>{selectedInstructor.is_active ? "Active" : "Inactive"}</Badge>
                <Badge variant={selectedInstructor.is_verified ? "success" : "warning"}>{selectedInstructor.is_verified ? "Verified" : "Pending"}</Badge>
                {selectedInstructor.is_blocked ? <Badge variant="danger">Blocked</Badge> : null}
                {selectedInstructor.is_top_rated ? <Badge variant="warning">Top rated</Badge> : null}
              </>
            }
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard label="Media" value={selectedInstructorMediaItems.length} caption="Galereya va proof material" icon={ImageIcon} tone="neutral" />
            <AdminStatCard label="Leadlar" value={selectedInstructorLeads.length} caption="Tanlangan instruktor so'rovlari" icon={MessageSquare} tone="warning" />
            <AdminStatCard label="Reviews" value={selectedInstructorReviews.length} caption="Ko'rinish boshqaruvi" icon={MessageSquare} tone="success" />
            <AdminStatCard label="Complaints" value={selectedInstructorComplaints.length} caption="Moderatsiya oqimi" icon={ShieldAlert} tone="danger" />
          </div>

          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <AdminSurface title="Overview" description="Profil summary, pricing va keyingi actionlar bitta joyda.">
                <div className="grid gap-4 p-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] p-4">
                    <p className="text-sm font-medium text-[var(--muted-foreground)]">Asosiy ma&apos;lumotlar</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <p><span className="font-medium">Shahar:</span> {selectedInstructor.city}{selectedInstructor.region ? `, ${selectedInstructor.region}` : ""}</p>
                      <p><span className="font-medium">Mashina:</span> {selectedInstructor.car_model}{selectedInstructor.car_year ? ` (${selectedInstructor.car_year})` : ""}</p>
                      <p><span className="font-medium">Transmission:</span> {selectedInstructor.transmission}</p>
                      <p><span className="font-medium">Narx:</span> {formatCurrency(selectedInstructor.hourly_price_cents, selectedInstructor.currency)}</p>
                      <p><span className="font-medium">Telefon:</span> {selectedInstructor.phone}</p>
                      <p><span className="font-medium">Telegram:</span> {selectedInstructor.telegram ?? "Kiritilmagan"}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] p-4">
                    <p className="text-sm font-medium text-[var(--muted-foreground)]">Next action</p>
                    <div className="mt-4 space-y-3 text-sm text-[var(--muted-foreground)]">
                      <p>Media tabida proof materiallarni yangilang va captionlarni qisqartiring.</p>
                      <p>Applications tabida yangi so&apos;rovlarni quickly statusga o&apos;tkazing.</p>
                      <p>Activity tabida reviews va complaints oqimini tozalang.</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="muted">{selectedInstructor.view_count} views</Badge>
                      <Badge variant="muted">{selectedInstructor.views_last_24h} oxirgi 24h</Badge>
                    </div>
                  </div>
                </div>
              </AdminSurface>

              <AdminSurface title="Promo performance" description="Referral va visibility ko'rsatkichlari detail ichida ko'rsatiladi.">
                <div className="p-5">
                  {selectedInstructorPromoStats ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--border)] p-4">
                        <p className="text-sm text-[var(--muted-foreground)]">Referral code</p>
                        <p className="mt-2 text-lg font-semibold">{selectedInstructorPromoStats.referral_code}</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] p-4">
                        <p className="text-sm text-[var(--muted-foreground)]">Lead count</p>
                        <p className="mt-2 text-lg font-semibold">{selectedInstructorPromoStats.lead_count}</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] p-4">
                        <p className="text-sm text-[var(--muted-foreground)]">Promo redemptions</p>
                        <p className="mt-2 text-lg font-semibold">{selectedInstructorPromoStats.promo_redemption_count}</p>
                      </div>
                    </div>
                  ) : (
                    <EmptyState title="Promo statistika topilmadi" description="Tanlangan instruktor uchun promo metrika hali yo'q." />
                  )}
                </div>
              </AdminSurface>
            </TabsContent>

            <TabsContent value="media" className="space-y-6">
              <AdminSurface title="Media management" description="Upload va media list shu tabga ajratildi.">
                <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
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
                    {selectedInstructorMediaItems.length === 0 ? (
                      <EmptyState title="Media yo'q" description="Tanlangan instruktor uchun hali media yuklanmagan." />
                    ) : (
                      selectedInstructorMediaItems.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-[var(--border)] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{item.caption ?? item.media_type}</p>
                              <p className="mt-1 line-clamp-1 text-xs text-[var(--muted-foreground)]">{item.url}</p>
                            </div>
                            <Badge variant={item.is_active ? "success" : "muted"}>{item.is_active ? "Active" : "Inactive"}</Badge>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-2">
                            <Button size="sm" variant="outline" onClick={() => setMediaDraft(makeMediaDraft(item))}>Manage</Button>
                            <AdminActionMenu items={[{ label: "Edit", onClick: () => setMediaDraft(makeMediaDraft(item)) }, { label: "Delete", tone: "danger", onClick: () => void deleteAdminInstructorMedia(item.id).then(refresh) }]} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </AdminSurface>
            </TabsContent>

            <TabsContent value="applications" className="space-y-6">
              <AdminSurface
                title="Applications queue"
                description="Arizalar endi full_name bilan emas, canonical linked_instructor_id orqali ko'rsatiladi."
              >
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="success">{selectedInstructorApplications.length} linked</Badge>
                      <Badge variant="warning">{unlinkedInstructorApplications.length} unlinked</Badge>
                    </div>
                    <Select value={applicationFilter} onChange={(event) => setApplicationFilter(event.target.value)} className="min-w-52">
                      <option value="linked">Linked to current instructor</option>
                      <option value="unlinked">Only unlinked</option>
                      <option value="all">Linked + unlinked</option>
                    </Select>
                  </div>
                  {visibleInstructorApplications.length === 0 ? (
                    <EmptyState
                      title={applicationFilter === "unlinked" ? "Unlinked application yo'q" : "Application yo'q"}
                      description={
                        applicationFilter === "linked"
                          ? "Tanlangan instruktor bilan bog'langan application hali yo'q."
                          : applicationFilter === "unlinked"
                            ? "Manual link kutayotgan application topilmadi."
                            : "Linked yoki unlinked application topilmadi."
                      }
                    />
                  ) : (
                    visibleInstructorApplications.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-[var(--border)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.full_name}</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                              {item.city} / {item.phone} / {item.user_email ?? "No user email"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={statusVariant(item.status)}>{formatAdminStatus(item.status)}</Badge>
                            <Badge variant={item.linked_instructor_id ? "success" : "warning"}>
                              {item.linked_instructor_id ? "Linked" : "Unlinked"}
                            </Badge>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                          {item.linked_instructor_id
                            ? "Bu ariza tanlangan instruktor bilan stable ID orqali bog'langan."
                            : "Unlinked application. To'g'ri bo'lsa uni tanlangan instruktorga qo'lda ulang."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!item.linked_instructor_id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === `instructor-application-link-${item.id}`}
                              onClick={() => void linkInstructorApplication(item.id, item.status, item.rejection_reason)}
                            >
                              Link to current instructor
                            </Button>
                          ) : null}
                          {INSTRUCTOR_APPLICATION_STATUSES.map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant="outline"
                              disabled={
                                busy === `instructor-application-${item.id}-${status}` ||
                                !canTransitionStatus(item.status, status, INSTRUCTOR_APPLICATION_TRANSITIONS)
                              }
                              onClick={() =>
                                void updateInstructorApplicationStatus(
                                  item.id,
                                  status,
                                  item.rejection_reason,
                                  item.linked_instructor_id,
                                )
                              }
                            >
                              {formatAdminStatus(status)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AdminSurface>

              <AdminSurface title="Leads" description={`${selectedInstructorLeads.length} ta lead tanlangan instruktor bilan bog'langan.`}>
                <div className="space-y-3 p-5">
                  {selectedInstructorLeads.length === 0 ? (
                    <EmptyState title="Lead yo'q" description="Instruktor leadlari shu yerda." />
                  ) : (
                    selectedInstructorLeads.map((lead) => (
                      <div key={lead.id} className="rounded-2xl border border-[var(--border)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{lead.full_name}</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{lead.phone}</p>
                          </div>
                          <Badge variant={statusVariant(lead.status)}>{formatAdminStatus(lead.status)}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {INSTRUCTOR_LEAD_STATUSES.map((status: DrivingInstructorLeadStatus) => (
                            <Button
                              key={status}
                              size="sm"
                              variant="outline"
                              disabled={!canTransitionStatus(lead.status, status, INSTRUCTOR_LEAD_TRANSITIONS)}
                              onClick={() => void updateAdminInstructorLead(lead.id, { status }).then(refresh)}
                            >
                              {formatAdminStatus(status)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AdminSurface>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <AdminSurface title="Reviews" description={`${selectedInstructorReviews.length} ta review moderatsiya uchun tayyor.`}>
                <div className="space-y-3 p-5">
                  {selectedInstructorReviews.length === 0 ? (
                    <EmptyState title="Review yo'q" description="Instruktor review moderatsiyasi shu yerda." />
                  ) : (
                    selectedInstructorReviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-[var(--border)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{review.rating}/5</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{review.comment ?? "No comment"}</p>
                          </div>
                          <Badge variant={review.is_visible ? "success" : "muted"}>{review.is_visible ? "Visible" : "Hidden"}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => void updateAdminInstructorReview(review.id, { is_visible: !review.is_visible }).then(refresh)}>
                            {review.is_visible ? "Hide" : "Show"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void deleteAdminInstructorReview(review.id).then(refresh)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AdminSurface>

              <AdminSurface title="Complaints" description={`${selectedInstructorComplaints.length} ta complaint tanlangan instruktor bilan bog'langan.`}>
                <div className="space-y-3 p-5">
                  {selectedInstructorComplaints.length === 0 ? (
                    <EmptyState title="Complaint yo'q" description="Complaint oqimi shu yerda ko'rinadi." />
                  ) : (
                    selectedInstructorComplaints.map((complaint) => (
                      <div key={complaint.id} className="rounded-2xl border border-[var(--border)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{complaint.full_name}</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{complaint.reason}</p>
                          </div>
                          <Badge variant={statusVariant(complaint.status)}>{formatAdminStatus(complaint.status)}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {INSTRUCTOR_COMPLAINT_STATUSES.map((status: DrivingInstructorComplaintStatus) => (
                            <Button
                              key={status}
                              size="sm"
                              variant="outline"
                              disabled={!canTransitionStatus(complaint.status, status, INSTRUCTOR_COMPLAINT_TRANSITIONS)}
                              onClick={() => void updateAdminInstructorComplaint(complaint.id, { status }).then(refresh)}
                            >
                              {formatAdminStatus(status)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AdminSurface>

              <AdminSurface title="Registration settings" description="Paid/free campaign oqimi activity ichiga ko'chirildi.">
                <div className="p-5">
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
                </div>
              </AdminSurface>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <AdminSurface title="Instructor detail" description="Ro'yxatdan biror instruktor tanlang va detail tablarini oching.">
          <div className="p-5">
            <EmptyState title="Detail tanlanmagan" description="Katalogdan Manage tugmasi orqali instruktor detailini oching." />
          </div>
        </AdminSurface>
      )}
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


