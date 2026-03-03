import { z } from 'zod';

export const transmissionValues = ['manual', 'automatic'] as const;
export type TransmissionType = (typeof transmissionValues)[number];

export const genderValues = ['male', 'female', 'other', 'unspecified'] as const;
export type GenderType = (typeof genderValues)[number];

export type ProfileStatus = {
  verified: boolean;
  active: boolean;
  blocked: boolean;
  ratingAvg: number;
  reviewCount: number;
  viewCount: number;
  viewsLast24h: number;
};

export const mediaItemSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  caption: z.string().max(140),
  isPrimary: z.boolean(),
  sortOrder: z.number().int().min(0),
  status: z.enum(['uploaded', 'uploading', 'failed']),
});

export type BuilderMediaItem = z.infer<typeof mediaItemSchema>;

export const locationSchema = z.object({
  query: z.string().max(180),
  label: z.string().max(180),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  address: z.string().max(240),
});

export type BuilderLocation = z.infer<typeof locationSchema>;

export const scheduleSlotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(2).max(32),
});

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;

export const instructorProfileBuilderSchema = z.object({
  id: z.string().optional(),
  slug: z.string().max(160).optional(),
  fullName: z.string().min(3, "Ism kamida 3 ta belgidan iborat bo'lishi kerak").max(120),
  phone: z.string().min(5, "Telefon raqami noto'g'ri").max(40),
  city: z.string().min(2, "Shaharni kiriting").max(120),
  region: z.string().max(120),
  // Keep gender optional for UX; invalid/legacy values are normalized to "unspecified".
  gender: z.enum(genderValues).catch('unspecified'),
  transmission: z.enum(transmissionValues),
  carModel: z.string().min(2, "Mashina modeli majburiy").max(120),
  yearsExperience: z.number().int().min(0).max(60),
  hourlyPriceUsd: z.number().min(0.1, "Narx 0 dan katta bo'lishi kerak").max(2000),
  minLessonMinutes: z.number().int().min(15).max(240),
  maxLessonMinutes: z.number().int().min(15).max(360),
  availableSlots: z.array(scheduleSlotSchema).max(20),
    bio: z.string().min(30, "Bio kamida 30 ta belgi bo'lishi kerak").max(2200),
  tags: z.array(z.string().min(2).max(32)).max(20),
  media: z.array(mediaItemSchema).max(30),
  location: locationSchema,
  status: z.object({
    verified: z.boolean(),
    active: z.boolean(),
    blocked: z.boolean(),
    ratingAvg: z.number().min(0).max(5),
    reviewCount: z.number().int().min(0),
    viewCount: z.number().int().min(0),
    viewsLast24h: z.number().int().min(0),
  }),
  version: z.number().int().min(0),
});

export type InstructorProfileBuilderFormData = z.infer<typeof instructorProfileBuilderSchema>;

export const defaultProfileBuilderForm: InstructorProfileBuilderFormData = {
  fullName: '',
  phone: '',
  city: '',
  region: '',
  gender: 'unspecified',
  transmission: 'automatic',
  carModel: '',
  yearsExperience: 0,
  hourlyPriceUsd: 10,
  minLessonMinutes: 60,
  maxLessonMinutes: 120,
  availableSlots: [],
  bio: '',
  tags: [],
  media: [],
  location: {
    query: '',
    label: '',
    latitude: null,
    longitude: null,
    address: '',
  },
  status: {
    verified: false,
    active: false,
    blocked: false,
    ratingAvg: 0,
    reviewCount: 0,
    viewCount: 0,
    viewsLast24h: 0,
  },
  version: 0,
};

export const locationResolveResultSchema = z.object({
  id: z.string(),
  label: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string(),
});

export type LocationResolveResult = z.infer<typeof locationResolveResultSchema>;

export const publishProfileBuilderSchema = instructorProfileBuilderSchema.pick({
  fullName: true,
  phone: true,
  city: true,
  transmission: true,
  carModel: true,
  yearsExperience: true,
  hourlyPriceUsd: true,
  minLessonMinutes: true,
  bio: true,
});

export type PublishProfileBuilderData = z.infer<typeof publishProfileBuilderSchema>;

