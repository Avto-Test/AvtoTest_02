import { z } from 'zod';
import {
  createMyDrivingInstructorMedia,
  deleteMyDrivingInstructorMedia,
  getMyDrivingInstructorSummary,
  updateMyDrivingInstructorMedia,
  updateMyDrivingInstructorProfile,
  uploadDrivingInstructorMedia,
} from '@/lib/drivingInstructors';
import type { AdminDrivingInstructorFormData, DrivingInstructorAdmin } from '@/schemas/drivingInstructor.schema';
import {
  defaultProfileBuilderForm,
  instructorProfileBuilderSchema,
  type InstructorProfileBuilderFormData,
  publishProfileBuilderSchema,
  type LocationResolveResult,
} from '@/schemas/instructorProfileBuilder.schema';

const DRAFT_KEY = 'autotest:instructor-profile-builder:draft:v2';

const locationMocks: LocationResolveResult[] = [
  { id: 'tash-1', label: 'Toshkent shahri, Chilonzor', latitude: 41.285, longitude: 69.203, address: 'Chilonzor, Toshkent' },
  { id: 'tash-2', label: 'Toshkent shahri, Yunusobod', latitude: 41.358, longitude: 69.288, address: 'Yunusobod, Toshkent' },
  { id: 'sam-1', label: 'Samarqand shahri, Registon atrofi', latitude: 39.654, longitude: 66.975, address: 'Registon, Samarqand' },
  { id: 'and-1', label: "Andijon shahri, Bobur ko'chasi", latitude: 40.782, longitude: 72.345, address: "Bobur ko'chasi, Andijon" },
  { id: 'nam-1', label: 'Namangan shahri, Davlatobod', latitude: 41.006, longitude: 71.672, address: 'Davlatobod, Namangan' },
  { id: 'bux-1', label: 'Buxoro shahri, Markaz', latitude: 39.774, longitude: 64.428, address: 'Markaz, Buxoro' },
];

const draftEnvelopeSchema = z.object({
  version: z.number().int().min(0),
  updatedAt: z.string(),
  profile: instructorProfileBuilderSchema,
});

type DraftEnvelope = z.infer<typeof draftEnvelopeSchema>;

function normalizeDraftMedia(media: InstructorProfileBuilderFormData['media']): InstructorProfileBuilderFormData['media'] {
  const uploaded = media
    .filter((item) => item.status === 'uploaded')
    .filter((item) => item.url.trim().length > 0)
    .filter((item) => !item.url.startsWith('blob:'))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (uploaded.length === 0) return [];

  const hasPrimary = uploaded.some((item) => item.isPrimary);
  return uploaded.map((item, index) => ({
    ...item,
    url: item.url.trim(),
    caption: item.caption.trim(),
    status: 'uploaded' as const,
    sortOrder: index,
    isPrimary: hasPrimary ? item.isPrimary : index === 0,
  }));
}

function sanitizeDraftProfile(profile: InstructorProfileBuilderFormData): InstructorProfileBuilderFormData {
  const normalized = {
    ...defaultProfileBuilderForm,
    ...profile,
    gender: normalizeGender(profile.gender),
    media: normalizeDraftMedia(profile.media),
    version: Math.max(0, Number(profile.version || 0)),
  } satisfies InstructorProfileBuilderFormData;

  return instructorProfileBuilderSchema.parse(normalized);
}

function normalizeGender(value: unknown): InstructorProfileBuilderFormData['gender'] {
  if (typeof value !== 'string') return 'unspecified';
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 'unspecified';
  if (['male', 'm', 'erkak', 'man'].includes(normalized)) return 'male';
  if (['female', 'f', 'ayol', 'woman'].includes(normalized)) return 'female';
  if (['other', 'boshqa'].includes(normalized)) return 'other';
  if (['unspecified', 'none', "ko'rsatmaslik", 'korsatmaslik'].includes(normalized)) return 'unspecified';
  return 'unspecified';
}

export type BuilderCompletionItem = {
  key: string;
  label: string;
  done: boolean;
};

export type BuilderCompletion = {
  percent: number;
  items: BuilderCompletionItem[];
};

function readDraft(): DraftEnvelope | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = draftEnvelopeSchema.safeParse(parsed);
    if (!result.success) return null;
    const safeProfile = sanitizeDraftProfile(result.data.profile);
    const safeEnvelope: DraftEnvelope = {
      ...result.data,
      profile: safeProfile,
      version: Math.max(result.data.version, safeProfile.version || 0),
    };
    return safeEnvelope;
  } catch {
    return null;
  }
}

function writeDraft(envelope: DraftEnvelope): void {
  if (typeof window === 'undefined') return;
  const safeProfile = sanitizeDraftProfile(envelope.profile);
  const safeEnvelope: DraftEnvelope = {
    ...envelope,
    profile: safeProfile,
    version: Math.max(envelope.version, safeProfile.version || 0),
  };
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(safeEnvelope));
}

function parseMapLatLng(embedUrl?: string | null): { latitude: number | null; longitude: number | null } {
  if (!embedUrl) return { latitude: null, longitude: null };

  const decoded = decodeURIComponent(embedUrl);
  const markerMatch = decoded.match(/marker=([-\d.]+),([-\d.]+)/i);
  if (markerMatch) {
    return {
      latitude: Number(markerMatch[1]) || null,
      longitude: Number(markerMatch[2]) || null,
    };
  }

  const centerMatch = decoded.match(/#map=\d+\/([-\d.]+)\/([-\d.]+)/i);
  if (centerMatch) {
    return {
      latitude: Number(centerMatch[1]) || null,
      longitude: Number(centerMatch[2]) || null,
    };
  }

  return { latitude: null, longitude: null };
}

export function buildOpenStreetMapEmbed(latitude: number, longitude: number): string {
  const delta = 0.012;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;
  const bbox = `${left}%2C${bottom}%2C${right}%2C${top}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export function mapInstructorToBuilder(
  instructor: DrivingInstructorAdmin | null
): InstructorProfileBuilderFormData {
  if (!instructor) {
    return { ...defaultProfileBuilderForm };
  }

  const parsed = parseMapLatLng(instructor.map_embed_url);
  const mediaFromServer = (instructor.media_items || [])
    .filter((item) => item.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((item, index) => ({
      id: item.id,
      url: item.url,
      caption: item.caption || '',
      isPrimary: index === 0,
      sortOrder: item.sort_order || index,
      status: 'uploaded' as const,
    }));

  const media =
    mediaFromServer.length > 0
      ? mediaFromServer
      : instructor.profile_image_url
        ? [
            {
              id: 'profile-primary',
              url: instructor.profile_image_url,
              caption: 'Asosiy rasm',
              isPrimary: true,
              sortOrder: 0,
              status: 'uploaded' as const,
            },
          ]
        : [];

  return {
    id: instructor.id,
    slug: instructor.slug,
    fullName: instructor.full_name || '',
    phone: instructor.phone || '',
    city: instructor.city || '',
    region: instructor.region || '',
    gender: normalizeGender(instructor.gender),
    transmission: instructor.transmission === 'manual' ? 'manual' : 'automatic',
    carModel: instructor.car_model || '',
    yearsExperience: instructor.years_experience || 0,
    hourlyPriceUsd: Math.max(0.1, (instructor.hourly_price_cents || 0) / 100),
    minLessonMinutes: instructor.min_lesson_minutes || 60,
    maxLessonMinutes: Math.max(instructor.min_lesson_minutes || 60, 120),
    availableSlots: (instructor.special_services || '')
      .split(',')
      .map((item, index) => ({ id: `slot-${index}`, label: item.trim() }))
      .filter((item) => item.label.length > 0),
    bio: instructor.short_bio || '',
    tags: (instructor.service_areas || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    media,
    location: {
      query: instructor.city || '',
      label: [instructor.city, instructor.region].filter(Boolean).join(', '),
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      address: [instructor.region, instructor.city].filter(Boolean).join(', '),
    },
    status: {
      verified: instructor.is_verified,
      active: instructor.is_active,
      blocked: instructor.is_blocked,
      ratingAvg: instructor.rating_avg || 0,
      reviewCount: instructor.review_count || 0,
      viewCount: instructor.view_count || 0,
      viewsLast24h: 0,
    },
    version: 0,
  };
}

function mapBuilderToUpdatePayload(
  profile: InstructorProfileBuilderFormData
): Partial<AdminDrivingInstructorFormData> {
  const uploadedMedia = profile.media.filter(
    (item) => item.status === 'uploaded' && item.url.trim().length > 0 && !item.url.startsWith('blob:')
  );
  const primaryMedia = uploadedMedia.find((item) => item.isPrimary) ?? uploadedMedia[0];
  const locationEmbed =
    profile.location.latitude != null && profile.location.longitude != null
      ? buildOpenStreetMapEmbed(profile.location.latitude, profile.location.longitude)
      : undefined;

  return {
    full_name: profile.fullName,
    phone: profile.phone,
    city: profile.city,
    region: profile.region || undefined,
    gender: profile.gender === 'unspecified' ? undefined : profile.gender,
    transmission: profile.transmission,
    car_model: profile.carModel,
    years_experience: profile.yearsExperience,
    hourly_price_cents: Math.round(profile.hourlyPriceUsd * 100),
    min_lesson_minutes: profile.minLessonMinutes,
    short_bio: profile.bio,
    profile_image_url: primaryMedia?.url || undefined,
    service_areas: profile.tags.join(', ') || undefined,
    special_services: profile.availableSlots.map((item) => item.label).join(', ') || undefined,
    map_embed_url: locationEmbed,
  };
}

function inferMediaType(url: string): 'image' | 'video' {
  const normalized = url.split('?')[0].toLowerCase();
  if (normalized.endsWith('.mp4') || normalized.endsWith('.webm') || normalized.endsWith('.mov')) {
    return 'video';
  }
  return 'image';
}

function normalizeMediaForSync(media: InstructorProfileBuilderFormData['media']) {
  return media
    .filter((item) => item.status === 'uploaded' && item.url.trim().length > 0 && !item.url.startsWith('blob:'))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, index) => ({
      id: item.id,
      url: item.url.trim(),
      caption: item.caption.trim(),
      sortOrder: index,
      mediaType: inferMediaType(item.url),
      isActive: true,
    }));
}

async function syncInstructorMediaWithServer(
  profile: InstructorProfileBuilderFormData,
  serverMedia: DrivingInstructorAdmin['media_items']
): Promise<void> {
  const hasUploadingMedia = profile.media.some((item) => item.status === 'uploading');
  if (hasUploadingMedia) {
    const err = new Error('MEDIA_UPLOAD_IN_PROGRESS');
    (err as Error & { code: string }).code = 'MEDIA_UPLOAD_IN_PROGRESS';
    throw err;
  }

  const desired = normalizeMediaForSync(profile.media);
  const currentById = new Map(serverMedia.map((item) => [item.id, item]));
  const desiredServerIds = new Set<string>();

  for (const item of desired) {
    const current = currentById.get(item.id);
    if (!current) {
      const created = await createMyDrivingInstructorMedia({
        media_type: item.mediaType,
        url: item.url,
        caption: item.caption || undefined,
        sort_order: item.sortOrder,
        is_active: item.isActive,
      });
      desiredServerIds.add(created.id);
      continue;
    }

    desiredServerIds.add(current.id);
    const currentCaption = current.caption ?? '';
    const needsUpdate =
      current.media_type !== item.mediaType ||
      current.url !== item.url ||
      currentCaption !== item.caption ||
      current.sort_order !== item.sortOrder ||
      current.is_active !== item.isActive;

    if (needsUpdate) {
      await updateMyDrivingInstructorMedia(current.id, {
        media_type: item.mediaType,
        url: item.url,
        caption: item.caption || undefined,
        sort_order: item.sortOrder,
        is_active: item.isActive,
      });
    }
  }

  for (const current of serverMedia) {
    if (!desiredServerIds.has(current.id)) {
      await deleteMyDrivingInstructorMedia(current.id);
    }
  }
}

function mergeWithDraft(
  base: InstructorProfileBuilderFormData,
  draft: DraftEnvelope | null
): InstructorProfileBuilderFormData {
  if (!draft) return base;
  const merged = {
    ...base,
    ...draft.profile,
    gender: normalizeGender(draft.profile.gender),
    status: {
      ...base.status,
      ...draft.profile.status,
      // Server status fields should stay authoritative.
      verified: base.status.verified,
      active: base.status.active,
      blocked: base.status.blocked,
      ratingAvg: base.status.ratingAvg,
      reviewCount: base.status.reviewCount,
      viewCount: base.status.viewCount,
      viewsLast24h: base.status.viewsLast24h,
    },
    id: base.id || draft.profile.id,
    slug: base.slug || draft.profile.slug,
    version: Math.max(base.version || 0, draft.version || 0),
  } satisfies InstructorProfileBuilderFormData;

  return instructorProfileBuilderSchema.parse(merged);
}

export async function getProfileBuilderData(): Promise<{
  profile: InstructorProfileBuilderFormData;
  version: number;
  savedAt: string;
}> {
  let base = { ...defaultProfileBuilderForm };
  let version = 0;
  let savedAt = new Date().toISOString();

  try {
    const summary = await getMyDrivingInstructorSummary();
    base = mapInstructorToBuilder(summary.instructor);
  } catch {
    // Fallback to draft-only mode if remote summary is unavailable.
  }

  const draft = readDraft();
  const merged = mergeWithDraft(base, draft);
  if (draft) {
    version = draft.version;
    savedAt = draft.updatedAt;
  }

  writeDraft({
    version,
    updatedAt: savedAt,
    profile: merged,
  });

  return { profile: merged, version, savedAt };
}

export async function patchProfileBuilderDraft(input: {
  profile: InstructorProfileBuilderFormData;
  expectedVersion: number;
}): Promise<{
  profile: InstructorProfileBuilderFormData;
  version: number;
  savedAt: string;
}> {
  const current = readDraft();
  if (current && input.expectedVersion < current.version) {
    const err = new Error('VERSION_CONFLICT');
    (err as Error & { code: string }).code = 'VERSION_CONFLICT';
    throw err;
  }

  const nextVersion = input.expectedVersion + 1;
  const savedAt = new Date().toISOString();
  const parsed = instructorProfileBuilderSchema.parse({ ...input.profile, version: nextVersion });

  writeDraft({
    version: nextVersion,
    updatedAt: savedAt,
    profile: parsed,
  });

  try {
    const updated = await updateMyDrivingInstructorProfile(mapBuilderToUpdatePayload(parsed));
    const remoteMapped = mapInstructorToBuilder(updated);
    const mergedRemote = {
      ...parsed,
      status: remoteMapped.status,
      id: remoteMapped.id,
      slug: remoteMapped.slug,
      version: nextVersion,
    } satisfies InstructorProfileBuilderFormData;

    writeDraft({
      version: nextVersion,
      updatedAt: savedAt,
      profile: mergedRemote,
    });

    return {
      profile: mergedRemote,
      version: nextVersion,
      savedAt,
    };
  } catch {
    // Local draft is still persisted even if remote sync fails.
    return {
      profile: parsed,
      version: nextVersion,
      savedAt,
    };
  }
}

export async function publishProfileBuilder(
  profile: InstructorProfileBuilderFormData
): Promise<{
  profile: InstructorProfileBuilderFormData;
  version: number;
  savedAt: string;
}> {
  publishProfileBuilderSchema.parse(profile);
  const updated = await updateMyDrivingInstructorProfile(mapBuilderToUpdatePayload(profile));
  await syncInstructorMediaWithServer(profile, updated.media_items || []);

  const latestSummary = await getMyDrivingInstructorSummary();
  const mapped = mapInstructorToBuilder(latestSummary.instructor ?? updated);
  const existing = readDraft();
  const version = (existing?.version || 0) + 1;
  const savedAt = new Date().toISOString();
  const merged = {
    ...profile,
    ...mapped,
    status: mapped.status,
    version,
  } satisfies InstructorProfileBuilderFormData;

  writeDraft({
    version,
    updatedAt: savedAt,
    profile: merged,
  });

  return {
    profile: merged,
    version,
    savedAt,
  };
}

export async function uploadProfileBuilderMedia(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; filename: string }> {
  return uploadDrivingInstructorMedia(file, onProgress);
}

export async function resolveProfileBuilderLocation(query: string): Promise<LocationResolveResult[]> {
  const normalized = query.trim().toLowerCase();
  await new Promise((resolve) => {
    setTimeout(resolve, 200);
  });
  if (!normalized) return locationMocks.slice(0, 5);
  return locationMocks.filter((item) => item.label.toLowerCase().includes(normalized));
}

export function calculateProfileBuilderCompletion(
  profile: InstructorProfileBuilderFormData
): BuilderCompletion {
  const items: BuilderCompletionItem[] = [
    {
      key: 'identity',
      label: "Asosiy ma'lumotlar",
      done: Boolean(profile.fullName && profile.phone && profile.city),
    },
    {
      key: 'vehicle',
      label: "Mashina va tajriba",
      done: Boolean(profile.carModel) && profile.yearsExperience >= 0,
    },
    {
      key: 'pricing',
      label: 'Narx va dars vaqti',
      done: profile.hourlyPriceUsd > 0 && profile.minLessonMinutes >= 15,
    },
    {
      key: 'bio',
      label: 'Bio va teglar',
      done: profile.bio.trim().length >= 30 && profile.tags.length > 0,
    },
    {
      key: 'media',
      label: 'Media',
      done: profile.media.length > 0,
    },
    {
      key: 'location',
      label: 'Lokatsiya',
      done: profile.location.latitude != null && profile.location.longitude != null,
    },
  ];

  const doneCount = items.filter((item) => item.done).length;
  return {
    percent: Math.round((doneCount / items.length) * 100),
    items,
  };
}


