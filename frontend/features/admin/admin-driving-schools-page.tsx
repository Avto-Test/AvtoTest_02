"use client";

import { Building2, FileStack, ImageIcon, MessageSquare, Phone, Plus, RefreshCcw, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
import { AdminActionMenu, AdminDetailHeader, AdminStatCard, AdminSurface, AdminToolbar } from "@/features/admin/admin-ui";
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
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Select } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { formatAdminStatus, statusVariant, toNullableString, toOptionalNumber, toRequiredNumber } from "@/features/admin/utils";
import type { SchoolAdminProfile } from "@/types/school";
import {
  canTransitionStatus,
  SCHOOL_LEAD_STATUSES,
  SCHOOL_LEAD_TRANSITIONS,
  SCHOOL_PARTNER_APPLICATION_STATUSES,
  SCHOOL_PARTNER_APPLICATION_TRANSITIONS,
} from "@/types/statuses";
import type { DrivingSchoolLeadStatus, DrivingSchoolPartnerApplicationStatus } from "@/types/statuses";

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

function normalizeSchoolText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function ensureList<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function toSchoolPayload(school: SchoolAdminProfile): AdminDrivingSchoolPayload {
  return {
    owner_user_id: school.owner_user_id ?? null,
    slug: school.slug ?? null,
    name: school.name,
    short_description: school.short_description ?? null,
    full_description: school.full_description ?? null,
    city: school.city,
    region: school.region ?? null,
    address: school.address ?? null,
    landmark: school.landmark ?? null,
    phone: school.phone,
    telegram: school.telegram ?? null,
    website: school.website ?? null,
    work_hours: school.work_hours ?? null,
    license_info: school.license_info ?? null,
    years_active: school.years_active ?? null,
    logo_url: school.logo_url ?? null,
    map_embed_url: school.map_embed_url ?? null,
    referral_code: school.referral_code ?? null,
    promo_code_id: school.promo_code_id ?? null,
    is_active: school.is_active,
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailTab, setDetailTab] = useState("overview");
  const [applicationFilter, setApplicationFilter] = useState("linked");

  const selectedSchool = useMemo(() => {
    const schools = resource.data?.schools ?? [];
    return schools.find((school) => school.id === selectedSchoolId) ?? null;
  }, [resource.data?.schools, selectedSchoolId]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSchools = useMemo(() => {
    return (resource.data?.schools ?? []).filter((school) => {
      const matchesQuery =
        !normalizedQuery ||
        school.name.toLowerCase().includes(normalizedQuery) ||
        school.city.toLowerCase().includes(normalizedQuery) ||
        normalizeSchoolText(school.region).includes(normalizedQuery) ||
        normalizeSchoolText(school.short_description).includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" ? true : statusFilter === "active" ? school.is_active : !school.is_active;
      return matchesQuery && matchesStatus;
    });
  }, [normalizedQuery, resource.data?.schools, statusFilter]);

  const selectedSchoolApplications = useMemo(() => {
    if (!selectedSchool) {
      return [];
    }

    return (resource.data?.applications ?? []).filter((item) => item.linked_school_id === selectedSchool.id);
  }, [resource.data?.applications, selectedSchool]);

  const unlinkedSchoolApplications = useMemo(() => {
    return (resource.data?.applications ?? []).filter((item) => !item.linked_school_id);
  }, [resource.data?.applications]);

  const visibleSchoolApplications = useMemo(() => {
    if (!selectedSchool) {
      return [];
    }
    if (applicationFilter === "unlinked") {
      return unlinkedSchoolApplications;
    }
    if (applicationFilter === "all") {
      return [...selectedSchoolApplications, ...unlinkedSchoolApplications];
    }
    return selectedSchoolApplications;
  }, [applicationFilter, selectedSchool, selectedSchoolApplications, unlinkedSchoolApplications]);

  const selectedSchoolLeads = useMemo(() => {
    if (!selectedSchool) {
      return [];
    }
    return (resource.data?.leads ?? []).filter((lead) => lead.school_id === selectedSchool.id);
  }, [resource.data?.leads, selectedSchool]);

  const selectedSchoolPromoStats = useMemo(() => {
    if (!selectedSchool) {
      return null;
    }
    return (resource.data?.promoStats ?? []).find((item) => item.school_id === selectedSchool.id) ?? null;
  }, [resource.data?.promoStats, selectedSchool]);
  const selectedSchoolCourses = ensureList(selectedSchool?.courses);
  const selectedSchoolMediaItems = ensureList(selectedSchool?.media_items);
  const selectedSchoolReviews = ensureList(selectedSchool?.reviews);

  const refresh = async () => {
    await resource.reload();
  };

  useEffect(() => {
    setApplicationFilter("linked");
  }, [selectedSchoolId]);

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

  const removeSchool = async (school: SchoolAdminProfile) => {
    setBusy(school.id);
    setNotice(null);
    try {
      await deleteAdminSchool(school.id);
      if (selectedSchoolId === school.id) {
        setSelectedSchoolId(null);
      }
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "School o'chirilmadi.");
    } finally {
      setBusy(null);
    }
  };

  const toggleSchoolStatus = async (school: SchoolAdminProfile) => {
    setBusy(`school-status-${school.id}`);
    setNotice(null);
    try {
      await updateAdminSchool(school.id, { ...toSchoolPayload(school), is_active: !school.is_active });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "School holati yangilanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const updateSchoolApplicationStatus = async (
    applicationId: string,
    nextStatus: DrivingSchoolPartnerApplicationStatus,
    linkedSchoolId?: string | null,
  ) => {
    setBusy(`school-application-${applicationId}-${nextStatus}`);
    setNotice(null);
    try {
      await updateAdminSchoolApplication(applicationId, {
        status: nextStatus,
        linked_school_id: linkedSchoolId ?? undefined,
      });
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Application holati yangilanmadi.");
    } finally {
      setBusy(null);
    }
  };

  const linkSchoolApplication = async (applicationId: string, currentStatus: DrivingSchoolPartnerApplicationStatus) => {
    if (!selectedSchool) {
      return;
    }
    setBusy(`school-application-link-${applicationId}`);
    setNotice(null);
    try {
      await updateAdminSchoolApplication(applicationId, {
        status: currentStatus,
        linked_school_id: selectedSchool.id,
      });
      setNotice("Ariza tanlangan school bilan bog'landi.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Application school bilan bog'lanmadi.");
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
        description="School CRUD, kurs/media boshqaruvi, partner applications, leadlar va reviewlarni SaaS detail oqimida boshqaring."
        action={
          <Button onClick={() => openSchoolModal()}>
            <Plus className="h-4 w-4" />
            Yangi school
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Jami schools" value={resource.data.schools.length} caption="Katalogdagi barcha avtomaktablar" icon={Building2} />
        <AdminStatCard label="Faol schools" value={resource.data.schools.filter((school) => school.is_active).length} caption="Foydalanuvchiga ko'rinadiganlari" icon={Building2} tone="success" />
        <AdminStatCard label="Leadlar" value={resource.data.leads.length} caption="Umumiy lead oqimi" icon={Phone} tone="warning" />
        <AdminStatCard label="Reviewlar" value={resource.data.reviews.length} caption="Moderatsiya qilinadigan feedbacklar" icon={MessageSquare} tone="neutral" />
      </div>

      <AdminToolbar
        search={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="School nomi, shahar yoki tavsif bo'yicha qidiring"
              className="pl-9"
            />
          </div>
        }
        filters={
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-40">
            <option value="all">Barcha status</option>
            <option value="active">Faol</option>
            <option value="inactive">Nofaol</option>
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
        title="Schools katalogi"
        description={`${filteredSchools.length} ta school ko'rinmoqda. Primary action detail sahifani ochadi, qolgan amallar menyuga yig'ildi.`}
      >
        <div className="grid gap-4 p-5 xl:grid-cols-3">
          {filteredSchools.length === 0 ? (
            <EmptyState title="School topilmadi" description="Qidiruv va filtr bo'yicha mos school yo'q." />
          ) : (
            filteredSchools.map((school) => (
              <div key={school.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{school.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {school.city}
                      {school.region ? `, ${school.region}` : ""}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">{school.short_description ?? "Qisqa tavsif kiritilmagan."}</p>
                  </div>
                  <Badge variant={school.is_active ? "success" : "muted"}>{school.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="muted">{ensureList(school.courses).length} kurs</Badge>
                  <Badge variant="muted">{ensureList(school.media_items).length} media</Badge>
                  <Badge variant="muted">{school.lead_count} leads</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedSchoolId(school.id); setDetailTab("overview"); }}>
                    Manage
                  </Button>
                  <AdminActionMenu
                    items={[
                      { label: "Edit", onClick: () => openSchoolModal(school) },
                      {
                        label: school.is_active ? "Deactivate" : "Activate",
                        disabled: busy === `school-status-${school.id}`,
                        onClick: () => void toggleSchoolStatus(school),
                      },
                      {
                        label: "Delete",
                        tone: "danger",
                        disabled: busy === school.id,
                        onClick: () => void removeSchool(school),
                      },
                    ]}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </AdminSurface>

      {selectedSchool ? (
        <>
          <AdminDetailHeader
            title={selectedSchool.name}
            description={selectedSchool.short_description ?? "School detail boshqaruvi: overview, kurslar, media, applications, leads va reviews bir joyda."}
            onBack={() => setSelectedSchoolId(null)}
            action={
              <>
                <Button variant="outline" onClick={() => openSchoolModal(selectedSchool)}>
                  Tahrirlash
                </Button>
                <AdminActionMenu
                  items={[
                    {
                      label: selectedSchool.is_active ? "Deactivate" : "Activate",
                      disabled: busy === `school-status-${selectedSchool.id}`,
                      onClick: () => void toggleSchoolStatus(selectedSchool),
                    },
                    {
                      label: "Delete",
                      tone: "danger",
                      disabled: busy === selectedSchool.id,
                      onClick: () => void removeSchool(selectedSchool),
                    },
                  ]}
                />
              </>
            }
            meta={
              <>
                <Badge variant={selectedSchool.is_active ? "success" : "muted"}>{selectedSchool.is_active ? "Active" : "Inactive"}</Badge>
                <Badge variant="muted">{selectedSchool.city}</Badge>
                <Badge variant="muted">{selectedSchool.referral_code}</Badge>
                {selectedSchool.promo_code ? <Badge variant="warning">Promo: {selectedSchool.promo_code}</Badge> : null}
              </>
            }
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard label="Kurslar" value={selectedSchoolCourses.length} caption="Faol va draft kurslar" icon={FileStack} tone="neutral" />
            <AdminStatCard label="Media" value={selectedSchoolMediaItems.length} caption="Galereya elementlari" icon={ImageIcon} tone="neutral" />
            <AdminStatCard label="Leadlar" value={selectedSchoolLeads.length} caption="Tanlangan school oqimi" icon={Phone} tone="warning" />
            <AdminStatCard label="Reviewlar" value={selectedSchoolReviews.length} caption="Mijoz feedbacklari" icon={MessageSquare} tone="success" />
          </div>

          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <AdminSurface title="Overview" description="Asosiy kontaktlar, tavsif va keyingi actionlar shu yerda jamlandi.">
                <div className="grid gap-4 p-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] p-4">
                    <p className="text-sm font-medium text-[var(--muted-foreground)]">Asosiy ma&apos;lumotlar</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <p><span className="font-medium">Telefon:</span> {selectedSchool.phone}</p>
                      <p><span className="font-medium">Telegram:</span> {selectedSchool.telegram ?? "Kiritilmagan"}</p>
                      <p><span className="font-medium">Website:</span> {selectedSchool.website ?? "Kiritilmagan"}</p>
                      <p><span className="font-medium">Manzil:</span> {selectedSchool.address ?? "Kiritilmagan"}</p>
                      <p><span className="font-medium">Ish vaqti:</span> {selectedSchool.work_hours ?? "Kiritilmagan"}</p>
                      <p><span className="font-medium">Litsenziya:</span> {selectedSchool.license_info ?? "Kiritilmagan"}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] p-4">
                    <p className="text-sm font-medium text-[var(--muted-foreground)]">Next action</p>
                    <div className="mt-4 space-y-3 text-sm text-[var(--muted-foreground)]">
                      <p>Kurs narxlarini tekshirib, media galereyani yangilang.</p>
                      <p>Leadlar tabida yangi so&apos;rovlarni tezda statusga o&apos;tkazing.</p>
                      <p>Reviews tabida ko&apos;rinishini tasdiqlab, reputatsiya oqimini tozalang.</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="muted">{selectedSchool.review_count} reviews</Badge>
                      <Badge variant="muted">{selectedSchool.promo_redemption_count} redemptions</Badge>
                    </div>
                  </div>
                </div>
              </AdminSurface>

              <AdminSurface title="Promo performance" description="Referral va promo ko'rsatkichlari school detail ichiga ko'chirildi.">
                <div className="p-5">
                  {selectedSchoolPromoStats ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--border)] p-4">
                        <p className="text-sm text-[var(--muted-foreground)]">Referral code</p>
                        <p className="mt-2 text-lg font-semibold">{selectedSchoolPromoStats.referral_code}</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] p-4">
                        <p className="text-sm text-[var(--muted-foreground)]">Lead count</p>
                        <p className="mt-2 text-lg font-semibold">{selectedSchoolPromoStats.lead_count}</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] p-4">
                        <p className="text-sm text-[var(--muted-foreground)]">Promo redemptions</p>
                        <p className="mt-2 text-lg font-semibold">{selectedSchoolPromoStats.promo_redemption_count}</p>
                      </div>
                    </div>
                  ) : (
                    <EmptyState title="Promo statistika topilmadi" description="Tanlangan school uchun promo metrikalar hali yo'q." />
                  )}
                </div>
              </AdminSurface>
            </TabsContent>

            <TabsContent value="courses" className="space-y-6">
              <AdminSurface title="Course management" description="Form va list alohida, ammo bir tab ichida qoladi.">
                <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
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
                    {selectedSchoolCourses.length === 0 ? (
                      <EmptyState title="Kurs yo'q" description="Tanlangan school uchun hali kurs qo'shilmagan." />
                    ) : (
                      selectedSchoolCourses.map((course) => (
                        <div key={course.id} className="rounded-2xl border border-[var(--border)] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{course.category_code}</p>
                              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{course.duration_weeks ?? "?"} hafta / {course.price_cents != null ? formatCurrency(course.price_cents, course.currency) : "Narx yo'q"}</p>
                            </div>
                            <Badge variant={course.is_active ? "success" : "muted"}>{course.is_active ? "Active" : "Inactive"}</Badge>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-2">
                            <Button size="sm" variant="outline" onClick={() => setCourseDraft(makeCourseDraft(course))}>Manage</Button>
                            <AdminActionMenu items={[{ label: "Edit", onClick: () => setCourseDraft(makeCourseDraft(course)) }, { label: "Delete", tone: "danger", onClick: () => void deleteAdminSchoolCourse(course.id).then(refresh) }]} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </AdminSurface>
            </TabsContent>

            <TabsContent value="media" className="space-y-6">
              <AdminSurface title="Media management" description="Upload va galereya boshqaruvi bitta tabga yig'ildi.">
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
                    {selectedSchoolMediaItems.length === 0 ? (
                      <EmptyState title="Media yo'q" description="Tanlangan school uchun hali media yuklanmagan." />
                    ) : (
                      selectedSchoolMediaItems.map((item) => (
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
                            <AdminActionMenu items={[{ label: "Edit", onClick: () => setMediaDraft(makeMediaDraft(item)) }, { label: "Delete", tone: "danger", onClick: () => void deleteAdminSchoolMedia(item.id).then(refresh) }]} />
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
                title="Partner applications"
                description="Arizalar endi school nomi bilan emas, canonical linked_school_id orqali ko'rsatiladi."
              >
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="success">{selectedSchoolApplications.length} linked</Badge>
                      <Badge variant="warning">{unlinkedSchoolApplications.length} unlinked</Badge>
                    </div>
                    <Select value={applicationFilter} onChange={(event) => setApplicationFilter(event.target.value)} className="min-w-52">
                      <option value="linked">Linked to current school</option>
                      <option value="unlinked">Only unlinked</option>
                      <option value="all">Linked + unlinked</option>
                    </Select>
                  </div>
                  {visibleSchoolApplications.length === 0 ? (
                    <EmptyState
                      title={applicationFilter === "unlinked" ? "Unlinked application yo'q" : "Ariza yo'q"}
                      description={
                        applicationFilter === "linked"
                          ? "Tanlangan school bilan bog'langan application hali yo'q."
                          : applicationFilter === "unlinked"
                            ? "Qo'lda bog'lashni kutayotgan application topilmadi."
                            : "Linked yoki unlinked application topilmadi."
                      }
                    />
                  ) : (
                    visibleSchoolApplications.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-[var(--border)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.school_name}</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                              {item.responsible_person} / {item.city} / {item.email}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={statusVariant(item.status)}>{formatAdminStatus(item.status)}</Badge>
                            <Badge variant={item.linked_school_id ? "success" : "warning"}>
                              {item.linked_school_id ? "Linked" : "Unlinked"}
                            </Badge>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                          {item.linked_school_id
                            ? "Bu ariza tanlangan school bilan stable ID orqali bog'langan."
                            : "Unlinked application. Kerak bo'lsa uni tanlangan school ga qo'lda ulang."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!item.linked_school_id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === `school-application-link-${item.id}`}
                              onClick={() => void linkSchoolApplication(item.id, item.status)}
                            >
                              Link to current school
                            </Button>
                          ) : null}
                          {SCHOOL_PARTNER_APPLICATION_STATUSES.map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant="outline"
                              disabled={
                                busy === `school-application-${item.id}-${status}` ||
                                !canTransitionStatus(item.status, status, SCHOOL_PARTNER_APPLICATION_TRANSITIONS)
                              }
                              onClick={() => void updateSchoolApplicationStatus(item.id, status, item.linked_school_id)}
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

            <TabsContent value="leads" className="space-y-6">
              <AdminSurface title="Leads" description={`${selectedSchoolLeads.length} ta lead tanlangan school bilan bog'langan.`}>
                <div className="space-y-3 p-5">
                  {selectedSchoolLeads.length === 0 ? (
                    <EmptyState title="Lead topilmadi" description="Tanlangan school uchun leadlar hali yo'q." />
                  ) : (
                    selectedSchoolLeads.map((lead) => (
                      <div key={lead.id} className="rounded-2xl border border-[var(--border)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{lead.full_name}</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{lead.phone}</p>
                          </div>
                          <Badge variant={statusVariant(lead.status)}>{formatAdminStatus(lead.status)}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {SCHOOL_LEAD_STATUSES.map((status: DrivingSchoolLeadStatus) => (
                            <Button
                              key={status}
                              size="sm"
                              variant="outline"
                              disabled={!canTransitionStatus(lead.status, status, SCHOOL_LEAD_TRANSITIONS)}
                              onClick={() => void updateAdminSchoolLead(lead.id, { status }).then(refresh)}
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

            <TabsContent value="reviews" className="space-y-6">
              <AdminSurface title="Reviews" description={`${selectedSchoolReviews.length} ta review tanlangan school detail ichida ko'rsatilmoqda.`}>
                <div className="space-y-3 p-5">
                  {selectedSchoolReviews.length === 0 ? (
                    <EmptyState title="Review yo'q" description="School review moderatsiyasi shu yerda." />
                  ) : (
                    selectedSchoolReviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-[var(--border)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{review.rating}/5</p>
                            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{review.comment ?? "No comment"}</p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{formatDate(review.created_at)}</p>
                          </div>
                          <Badge variant={review.is_visible ? "success" : "muted"}>{review.is_visible ? "Visible" : "Hidden"}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => void updateAdminSchoolReview(review.id, { is_visible: !review.is_visible }).then(refresh)}>
                            {review.is_visible ? "Hide" : "Show"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void deleteAdminSchoolReview(review.id).then(refresh)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </AdminSurface>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <AdminSurface title="School detail" description="Ro'yxatdan biror school tanlang va boshqaruv tablarini oching.">
          <div className="p-5">
            <EmptyState title="Detail tanlanmagan" description="Katalogdan biror school uchun Manage tugmasini bosing." />
          </div>
        </AdminSurface>
      )}
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


