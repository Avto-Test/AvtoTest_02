import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import {
  calculateProfileBuilderCompletion,
  getProfileBuilderData,
  patchProfileBuilderDraft,
  publishProfileBuilder,
  resolveProfileBuilderLocation,
  uploadProfileBuilderMedia,
} from '@/lib/instructorProfileBuilder';
import {
  defaultProfileBuilderForm,
  genderValues,
  transmissionValues,
  instructorProfileBuilderSchema,
  type InstructorProfileBuilderFormData,
  type LocationResolveResult,
  type BuilderMediaItem,
} from '@/schemas/instructorProfileBuilder.schema';

type PreviewMode = 'desktop' | 'mobile';
type PanelMode = 'edit' | 'preview';

function ensurePrimary(media: BuilderMediaItem[]): BuilderMediaItem[] {
  if (media.length === 0) return media;
  if (media.some((item) => item.isPrimary)) return media;
  return media.map((item, index) => ({ ...item, isPrimary: index === 0 }));
}

function normalizeMediaOrder(media: BuilderMediaItem[]): BuilderMediaItem[] {
  return ensurePrimary(media).map((item, index) => ({ ...item, sortOrder: index }));
}

function parseErrorCode(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code;
  if (code) return code;
  const message = (error as { message?: string } | undefined)?.message;
  if (message) return message;
  return 'UNKNOWN_ERROR';
}

function formatZodIssue(path: readonly PropertyKey[], message: string): string {
  const top = String(path[0] ?? '');
  const labels: Record<string, string> = {
    fullName: 'Ism',
    phone: 'Telefon',
    city: 'Shahar',
    region: 'Hudud',
    carModel: 'Mashina modeli',
    yearsExperience: 'Tajriba',
    hourlyPriceUsd: 'Narx',
    minLessonMinutes: 'Minimal dars vaqti',
    maxLessonMinutes: 'Maksimal dars vaqti',
    bio: 'Bio',
    tags: 'Teglar',
    media: 'Media',
    location: 'Lokatsiya',
    availableSlots: 'Dars vaqtlari',
  };
  const section = labels[top] ?? (top || 'Forma');
  return `${section}: ${message}`;
}

function normalizeFormSnapshot(
  raw: Partial<InstructorProfileBuilderFormData> | undefined
): InstructorProfileBuilderFormData {
  const source = raw ?? {};
  const normalizedGender = genderValues.includes(source.gender as (typeof genderValues)[number])
    ? (source.gender as InstructorProfileBuilderFormData['gender'])
    : 'unspecified';
  const normalizedTransmission = transmissionValues.includes(
    source.transmission as (typeof transmissionValues)[number]
  )
    ? (source.transmission as InstructorProfileBuilderFormData['transmission'])
    : defaultProfileBuilderForm.transmission;

  return {
    ...defaultProfileBuilderForm,
    ...source,
    gender: normalizedGender,
    transmission: normalizedTransmission,
    media: source.media ?? [],
    tags: source.tags ?? [],
    availableSlots: source.availableSlots ?? [],
    location: {
      ...defaultProfileBuilderForm.location,
      ...(source.location ?? {}),
    },
    status: {
      ...defaultProfileBuilderForm.status,
      ...(source.status ?? {}),
    },
  };
}

export function useProfileBuilder() {
  const form = useForm<InstructorProfileBuilderFormData>({
    resolver: zodResolver(instructorProfileBuilderSchema),
    defaultValues: defaultProfileBuilderForm,
    mode: 'onChange',
  });

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('edit');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<LocationResolveResult[]>([]);
  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrorByMediaId, setUploadErrorByMediaId] = useState<Record<string, string>>({});

  const initializedRef = useRef(false);
  const autosaveTickRef = useRef(0);
  const autosaveTimerRef = useRef<number | null>(null);
  const inFlightSaveRef = useRef(false);
  const retryFileStoreRef = useRef<Record<string, File>>({});
  const tempObjectUrlsRef = useRef<Record<string, string>>({});

  const revokeTempObjectUrl = useCallback((mediaId: string) => {
    const url = tempObjectUrlsRef.current[mediaId];
    if (!url) return;
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore browser-specific revoke failures.
    }
    delete tempObjectUrlsRef.current[mediaId];
  }, []);

  const revokeAllTempObjectUrls = useCallback(() => {
    const ids = Object.keys(tempObjectUrlsRef.current);
    for (const mediaId of ids) {
      revokeTempObjectUrl(mediaId);
    }
  }, [revokeTempObjectUrl]);

  const watchedProfile = useWatch({ control: form.control });
  const normalizedSnapshot = useMemo(
    () =>
      normalizeFormSnapshot(
        ((watchedProfile as Partial<InstructorProfileBuilderFormData> | undefined) ?? form.getValues()) as
          | Partial<InstructorProfileBuilderFormData>
          | undefined
      ),
    [form, watchedProfile]
  );
  const profile = useMemo(() => {
    const parsed = instructorProfileBuilderSchema.safeParse(normalizedSnapshot);
    if (parsed.success) return parsed.data;
    return normalizedSnapshot;
  }, [normalizedSnapshot]);
  const completion = useMemo(
    () => calculateProfileBuilderCompletion(profile),
    [profile]
  );
  const validationIssues = useMemo(() => {
    const parsed = instructorProfileBuilderSchema.safeParse(normalizedSnapshot);
    if (parsed.success) return [] as string[];
    return parsed.error.issues.map((issue) => formatZodIssue(issue.path, issue.message));
  }, [normalizedSnapshot]);
  const canPublish = validationIssues.length === 0 && !publishing && !autosaving && !loading;

  const resetFormFromRemote = useCallback(
    (nextProfile: InstructorProfileBuilderFormData, nextVersion: number, nextSavedAt: string | null) => {
      revokeAllTempObjectUrls();
      initializedRef.current = false;
      form.reset(nextProfile);
      setVersion(nextVersion);
      setLastSavedAt(nextSavedAt);
      setUnsavedChanges(false);
      autosaveTickRef.current = 0;
      setTimeout(() => {
        initializedRef.current = true;
      }, 0);
    },
    [form, revokeAllTempObjectUrls]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const result = await getProfileBuilderData();
      resetFormFromRemote(result.profile, result.version, result.savedAt);
    } catch {
      setGlobalError("Builder ma'lumotlarini yuklab bo'lmadi.");
      resetFormFromRemote(defaultProfileBuilderForm, 0, null);
    } finally {
      setLoading(false);
    }
  }, [resetFormFromRemote]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const subscription = form.watch(() => {
      if (!initializedRef.current) return;
      setUnsavedChanges(true);
      autosaveTickRef.current += 1;
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const doAutosave = useCallback(
    async (forced = false) => {
      if (!initializedRef.current) return;
      if (!forced && !unsavedChanges) return;
      if (inFlightSaveRef.current) return;

      const parsed = instructorProfileBuilderSchema.safeParse(normalizeFormSnapshot(form.getValues()));
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        const issueText = firstIssue
          ? formatZodIssue(firstIssue.path, firstIssue.message)
          : "validatsiya xatoligini to'g'rilang";
        setSaveError(`Autosave to'xtadi: ${issueText}.`);
        await form.trigger();
        return;
      }

      inFlightSaveRef.current = true;
      setAutosaving(true);
      setSaveError(null);
      try {
        const saved = await patchProfileBuilderDraft({
          profile: parsed.data,
          expectedVersion: version,
        });
        setVersion(saved.version);
        setLastSavedAt(saved.savedAt);
        setUnsavedChanges(false);
      } catch (error) {
        const code = parseErrorCode(error);
        if (code === 'VERSION_CONFLICT') {
          setSaveError("Versiya konflikti: oxirgi holat qayta yuklandi.");
          const latest = await getProfileBuilderData();
          resetFormFromRemote(latest.profile, latest.version, latest.savedAt);
        } else {
          setSaveError("Autosave bajarilmadi. Internet yoki server holatini tekshiring.");
        }
      } finally {
        setAutosaving(false);
        inFlightSaveRef.current = false;
      }
    },
    [form, resetFormFromRemote, unsavedChanges, version]
  );

  useEffect(() => {
    if (!initializedRef.current || !unsavedChanges) return;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      void doAutosave(false);
    }, 2000);
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [doAutosave, unsavedChanges, profile]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      revokeAllTempObjectUrls();
    };
  }, [revokeAllTempObjectUrls]);

  const saveNow = useCallback(async () => {
    await doAutosave(true);
  }, [doAutosave]);

  const publish = useCallback(async () => {
    const parsed = instructorProfileBuilderSchema.safeParse(normalizeFormSnapshot(form.getValues()));
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const issueText = firstIssue
        ? formatZodIssue(firstIssue.path, firstIssue.message)
        : "formani to'liq to'g'rilang";
      setGlobalError(`Publish qilishdan oldin to'g'rilang: ${issueText}.`);
      await form.trigger();
      return false;
    }
    setPublishing(true);
    setGlobalError(null);
    try {
      const result = await publishProfileBuilder(parsed.data);
      resetFormFromRemote(result.profile, result.version, result.savedAt);
      return true;
    } catch (error) {
      const code = parseErrorCode(error);
      if (code === 'MEDIA_UPLOAD_IN_PROGRESS') {
        setGlobalError("Media hali yuklanmoqda. Iltimos yuklash tugaguncha kuting.");
      } else {
        setGlobalError("Publish muvaffaqiyatsiz tugadi. Keyinroq urinib ko'ring.");
      }
      return false;
    } finally {
      setPublishing(false);
    }
  }, [form, resetFormFromRemote]);

  const updateTags = useCallback(
    (tags: string[]) => {
      form.setValue('tags', Array.from(new Set(tags.map((item) => item.trim()).filter(Boolean))), {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [form]
  );

  const addTag = useCallback(
    (tag: string) => {
      const clean = tag.trim();
      if (!clean) return;
      if (clean.length < 2) {
        form.setError('tags', {
          type: 'manual',
          message: "Har bir teg kamida 2 ta belgidan iborat bo'lishi kerak.",
        });
        return;
      }
      form.clearErrors('tags');
      updateTags([...form.getValues('tags'), clean]);
    },
    [form, updateTags]
  );

  const removeTag = useCallback(
    (tag: string) => {
      updateTags(form.getValues('tags').filter((item) => item !== tag));
    },
    [form, updateTags]
  );

  const addSlot = useCallback(
    (label: string) => {
      const clean = label.trim();
      if (!clean) return;
      if (clean.length < 2) {
        form.setError('availableSlots', {
          type: 'manual',
          message: "Har bir vaqt yorlig'i kamida 2 ta belgidan iborat bo'lishi kerak.",
        });
        return;
      }
      form.clearErrors('availableSlots');
      const current = form.getValues('availableSlots');
      const next = [...current, { id: `slot-${Date.now()}`, label: clean }];
      form.setValue('availableSlots', next, { shouldDirty: true, shouldValidate: true });
    },
    [form]
  );

  const removeSlot = useCallback(
    (id: string) => {
      const next = form.getValues('availableSlots').filter((item) => item.id !== id);
      form.setValue('availableSlots', next, { shouldDirty: true, shouldValidate: true });
    },
    [form]
  );

  const setPrimaryMedia = useCallback(
    (mediaId: string) => {
      const current = form.getValues('media');
      const next = normalizeMediaOrder(
        current.map((item) => ({ ...item, isPrimary: item.id === mediaId }))
      );
      form.setValue('media', next, { shouldDirty: true, shouldValidate: true });
    },
    [form]
  );

  const removeMedia = useCallback(
    (mediaId: string) => {
      const current = form.getValues('media');
      const removed = current.find((item) => item.id === mediaId);
      const next = normalizeMediaOrder(current.filter((item) => item.id !== mediaId));
      revokeTempObjectUrl(mediaId);
      if (removed?.url?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(removed.url);
        } catch {
          // Ignore browser-specific revoke failures.
        }
      }
      delete retryFileStoreRef.current[mediaId];
      setUploadProgress((prev) => {
        const cloned = { ...prev };
        delete cloned[mediaId];
        return cloned;
      });
      setUploadErrorByMediaId((prev) => {
        const cloned = { ...prev };
        delete cloned[mediaId];
        return cloned;
      });
      form.setValue('media', next, { shouldDirty: true, shouldValidate: true });
    },
    [form, revokeTempObjectUrl]
  );

  const updateMediaCaption = useCallback(
    (mediaId: string, caption: string) => {
      const next = form.getValues('media').map((item) => (
        item.id === mediaId ? { ...item, caption } : item
      ));
      form.setValue('media', next, { shouldDirty: true, shouldValidate: true });
    },
    [form]
  );

  const moveMedia = useCallback(
    (mediaId: string, direction: 'up' | 'down') => {
      const current = [...form.getValues('media')];
      const index = current.findIndex((item) => item.id === mediaId);
      if (index === -1) return;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return;
      [current[index], current[targetIndex]] = [current[targetIndex], current[index]];
      form.setValue('media', normalizeMediaOrder(current), { shouldDirty: true, shouldValidate: true });
    },
    [form]
  );

  const uploadOne = useCallback(
    async (file: File) => {
      const tempId = `media-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      retryFileStoreRef.current[tempId] = file;
      const tempUrl = URL.createObjectURL(file);
      tempObjectUrlsRef.current[tempId] = tempUrl;

      const draftItem: BuilderMediaItem = {
        id: tempId,
        url: tempUrl,
        caption: '',
        isPrimary: form.getValues('media').length === 0,
        sortOrder: form.getValues('media').length,
        status: 'uploading',
      };

      form.setValue('media', normalizeMediaOrder([...form.getValues('media'), draftItem]), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setUploadProgress((prev) => ({ ...prev, [tempId]: 1 }));

      try {
        const uploaded = await uploadProfileBuilderMedia(file, (percent) => {
          setUploadProgress((prev) => ({ ...prev, [tempId]: percent }));
        });
        const uploadedId = uploaded.filename || tempId;
        revokeTempObjectUrl(tempId);
        delete retryFileStoreRef.current[tempId];

        const next = form.getValues('media').map((item) => (
          item.id === tempId
            ? { ...item, id: uploadedId, url: uploaded.url, status: 'uploaded' as const }
            : item
        ));
        form.setValue('media', normalizeMediaOrder(next), {
          shouldDirty: true,
          shouldValidate: true,
        });
        setUploadProgress((prev) => {
          const cloned = { ...prev };
          delete cloned[tempId];
          cloned[uploadedId] = 100;
          return cloned;
        });
        setUploadErrorByMediaId((prev) => {
          const cloned = { ...prev };
          delete cloned[tempId];
          delete cloned[uploadedId];
          return cloned;
        });
      } catch {
        const next = form.getValues('media').map((item) => (
          item.id === tempId ? { ...item, status: 'failed' as const } : item
        ));
        form.setValue('media', next, {
          shouldDirty: true,
          shouldValidate: true,
        });
        setUploadErrorByMediaId((prev) => ({
          ...prev,
          [tempId]: "Yuklash xatosi. Qayta urinib ko'ring.",
        }));
      }
    },
    [form, revokeTempObjectUrl]
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        // Sequential upload keeps progress stable per file.
        await uploadOne(file);
      }
    },
    [uploadOne]
  );

  const retryUpload = useCallback(
    async (mediaId: string) => {
      const file = retryFileStoreRef.current[mediaId];
      if (!file) {
        setUploadErrorByMediaId((prev) => ({
          ...prev,
          [mediaId]: 'Qayta yuklash uchun fayl topilmadi. Iltimos qayta tanlang.',
        }));
        return;
      }
      removeMedia(mediaId);
      await uploadOne(file);
    },
    [removeMedia, uploadOne]
  );

  const searchLocations = useCallback(async (query: string) => {
    setLocationQuery(query);
    if (!query.trim()) {
      setLocationResults([]);
      return;
    }
    setLocationLoading(true);
    try {
      const results = await resolveProfileBuilderLocation(query);
      setLocationResults(results);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const applyLocation = useCallback(
    (location: LocationResolveResult) => {
      form.setValue(
        'location',
        {
          query: location.label,
          label: location.label,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        },
        { shouldDirty: true, shouldValidate: true }
      );
      setLocationQuery(location.label);
      setLocationResults([]);
      setLocationPanelOpen(false);
    },
    [form]
  );

  const setLocationFromMap = useCallback(
    (latitude: number, longitude: number) => {
      const fallbackLabel = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      form.setValue(
        'location',
        {
          query: fallbackLabel,
          label: fallbackLabel,
          latitude,
          longitude,
          address: form.getValues('location.address') || fallbackLabel,
        },
        { shouldDirty: true, shouldValidate: true }
      );
      setLocationQuery(fallbackLabel);
    },
    [form]
  );

  return {
    form,
    profile,
    completion,
    loading,
    publishing,
    autosaving,
    canPublish,
    validationIssues,
    unsavedChanges,
    lastSavedAt,
    saveError,
    globalError,
    panelMode,
    previewMode,
    setPanelMode,
    setPreviewMode,
    saveNow,
    publish,
    addTag,
    removeTag,
    addSlot,
    removeSlot,
    uploadFiles,
    retryUpload,
    removeMedia,
    moveMedia,
    setPrimaryMedia,
    updateMediaCaption,
    uploadProgress,
    uploadErrorByMediaId,
    locationLoading,
    locationQuery,
    locationResults,
    locationPanelOpen,
    setLocationPanelOpen,
    searchLocations,
    applyLocation,
    setLocationFromMap,
    reload: loadInitial,
  };
}

export type UseProfileBuilderReturn = ReturnType<typeof useProfileBuilder>;



