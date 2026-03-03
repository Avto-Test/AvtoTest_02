'use client';
/* eslint-disable react/no-unescaped-entities */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Save } from 'lucide-react';
import { Controller } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CompletionChecklist } from '@/components/instructor-profile-builder/CompletionChecklist';
import { LocationPicker } from '@/components/instructor-profile-builder/LocationPicker';
import { MediaManager } from '@/components/instructor-profile-builder/MediaManager';
import type { UseProfileBuilderReturn } from '@/hooks/useProfileBuilder';

type SectionKey = 'basic' | 'vehicle' | 'pricing' | 'bio' | 'media' | 'location' | 'status';

type EditPanelProps = {
  builder: UseProfileBuilderReturn;
};

function SectionCard({
  title,
  sectionKey,
  openSections,
  toggleSection,
  children,
}: {
  title: string;
  sectionKey: SectionKey;
  openSections: Record<SectionKey, boolean>;
  toggleSection: (section: SectionKey) => void;
  children: React.ReactNode;
}) {
  const opened = openSections[sectionKey];
  return (
    <Card className="border-white/10 bg-slate-900/80">
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          className="flex w-full items-center justify-between text-left"
        >
          <CardTitle className="text-base text-slate-100">{title}</CardTitle>
          {opened ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
      </CardHeader>
      {opened ? <CardContent className="space-y-3 pt-0">{children}</CardContent> : null}
    </Card>
  );
}

export function EditPanel({ builder }: EditPanelProps) {
  const {
    form,
    completion,
    autosaving,
    canPublish,
    validationIssues,
    unsavedChanges,
    lastSavedAt,
    saveError,
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
    saveNow,
    publish,
  } = builder;

  const [tagInput, setTagInput] = useState('');
  const [slotInput, setSlotInput] = useState('');
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basic: true,
    vehicle: true,
    pricing: true,
    bio: true,
    media: true,
    location: true,
    status: true,
  });

  const errors = form.formState.errors;

  const transmission = form.watch('transmission');
  const gender = form.watch('gender');
  const tags = form.watch('tags');
  const slots = form.watch('availableSlots');
  const media = form.watch('media');
  const status = form.watch('status');
  const genderOptions: Array<{
    value: 'male' | 'female' | 'other' | 'unspecified';
    label: string;
  }> = [
    { value: 'male', label: 'Erkak' },
    { value: 'female', label: 'Ayol' },
    { value: 'other', label: 'Boshqa' },
    { value: 'unspecified', label: "Ko'rsatmaslik" },
  ];

  const statusChips = useMemo(
    () => [
      {
        label: status.verified ? 'Verified' : 'Not verified',
        className: status.verified
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
          : 'border-slate-500/40 bg-slate-500/15 text-slate-200',
      },
      {
        label: status.active ? 'Active' : 'NoFaol',
        className: status.active
          ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200'
          : 'border-slate-500/40 bg-slate-500/15 text-slate-200',
      },
      {
        label: status.blocked ? 'Blocked' : 'Not blocked',
        className: status.blocked
          ? 'border-red-500/40 bg-red-500/15 text-red-200'
          : 'border-slate-500/40 bg-slate-500/15 text-slate-200',
      },
    ],
    [status.active, status.blocked, status.verified]
  );

  function toggleSection(section: SectionKey) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  async function handlePublish() {
    await publish();
  }

  return (
    <div className="space-y-4">
      <Card className="border-cyan-400/20 bg-gradient-to-br from-slate-900 to-slate-950">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">Instruktor Visual Builder</CardTitle>
          <div className="text-xs text-slate-400">
            {autosaving ? "Draft saqlanmoqda..." : unsavedChanges ? "Saqlanmagan o'zgarishlar bor" : "Barcha o'zgarishlar saqlandi"}
            {lastSavedAt ? ` • ${new Date(lastSavedAt).toLocaleTimeString('uz-UZ')}` : ''}
          </div>
          {saveError ? <p className="text-xs text-red-300">{saveError}</p> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <CompletionChecklist completion={completion} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => void saveNow()}>
              <Save className="h-4 w-4" />
              Draft saqlash
            </Button>
            <Button
              type="button"
              disabled={!canPublish}
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handlePublish()}
            >
              Publish qilish
            </Button>
          </div>
          {!canPublish && validationIssues.length > 0 ? (
            <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3">
              <p className="text-xs font-medium text-red-200">Publish bloklangan. Quyidagilarni to'g'rilang:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-200/90">
                {validationIssues.slice(0, 5).map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <SectionCard title="Asosiy ma'lumotlar" sectionKey="basic" openSections={openSections} toggleSection={toggleSection}>
        <Input placeholder="Ism Familiya" {...form.register('fullName')} />
        {errors.fullName ? <p className="text-xs text-red-300">{errors.fullName.message}</p> : null}
        <Input placeholder="Telefon" {...form.register('phone')} />
        {errors.phone ? <p className="text-xs text-red-300">{errors.phone.message}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Shahar" {...form.register('city')} />
          <Input placeholder="Hudud / Viloyat" {...form.register('region')} />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Jins (ixtiyoriy)</label>
          <div className="grid gap-2 sm:grid-cols-4">
            {genderOptions.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={gender === item.value ? 'default' : 'outline'}
                className={gender === item.value ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : ''}
                onClick={() =>
                  form.setValue('gender', item.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                {item.label}
              </Button>
            ))}
          </div>
          <select
            {...form.register('gender')}
            className="mt-1 w-full rounded-md border border-input bg-slate-950/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400/40"
          >
            {genderOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          {errors.gender ? <p className="text-xs text-red-300">{errors.gender.message as string}</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Mashina va tajriba" sectionKey="vehicle" openSections={openSections} toggleSection={toggleSection}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant={transmission === 'manual' ? 'default' : 'outline'}
            className={transmission === 'manual' ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : ''}
            onClick={() => form.setValue('transmission', 'manual', { shouldDirty: true, shouldValidate: true })}
          >
            Manual (Mexanika)
          </Button>
          <Button
            type="button"
            variant={transmission === 'automatic' ? 'default' : 'outline'}
            className={transmission === 'automatic' ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : ''}
            onClick={() => form.setValue('transmission', 'automatic', { shouldDirty: true, shouldValidate: true })}
          >
            Automatic (Avtomat)
          </Button>
        </div>
        <Input placeholder="Mashina modeli" {...form.register('carModel')} />
        {errors.carModel ? <p className="text-xs text-red-300">{errors.carModel.message}</p> : null}
        <Controller
          control={form.control}
          name="yearsExperience"
          render={({ field }) => (
            <div>
              <label className="mb-1 block text-xs text-slate-400">Tajriba (yil)</label>
              <Input
                type="number"
                min={0}
                max={60}
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value || 0))}
              />
            </div>
          )}
        />
      </SectionCard>

      <SectionCard title="Narx va dars vaqti" sectionKey="pricing" openSections={openSections} toggleSection={toggleSection}>
        <Controller
          control={form.control}
          name="hourlyPriceUsd"
          render={({ field }) => (
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Soatlik narx (USD)</label>
              <input
                type="range"
                min={1}
                max={100}
                step={0.5}
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value))}
                className="w-full accent-cyan-400"
              />
              <Input
                type="number"
                min={0.1}
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value || 0))}
              />
            </div>
          )}
        />
        {errors.hourlyPriceUsd ? <p className="text-xs text-red-300">{errors.hourlyPriceUsd.message}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="minLessonMinutes"
            render={({ field }) => (
              <Input
                type="number"
                min={15}
                max={240}
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value || 15))}
                placeholder="Minimal dars (daq)"
              />
            )}
          />
          <Controller
            control={form.control}
            name="maxLessonMinutes"
            render={({ field }) => (
              <Input
                type="number"
                min={15}
                max={360}
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value || 15))}
                placeholder="Maksimal dars (daq)"
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Mavjud vaqtlar</label>
          <div className="flex gap-2">
            <Input
              value={slotInput}
              placeholder="Masalan: 09:00-11:00"
              onChange={(event) => setSlotInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addSlot(slotInput);
                  setSlotInput('');
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                addSlot(slotInput);
                setSlotInput('');
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <Badge key={slot.id} className="border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                {slot.label}
                <button
                  type="button"
                  className="ml-2 rounded px-1 text-cyan-50 hover:bg-cyan-500/30"
                  onClick={() => removeSlot(slot.id)}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          {errors.availableSlots ? <p className="text-xs text-red-300">{errors.availableSlots.message as string}</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Bio va teglar" sectionKey="bio" openSections={openSections} toggleSection={toggleSection}>
        <textarea
          rows={5}
          className="w-full rounded-md border border-input bg-slate-950/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400/40"
          placeholder="Instruktor haqida qisqacha bio..."
          {...form.register('bio')}
        />
        {errors.bio ? <p className="text-xs text-red-300">{errors.bio.message}</p> : null}
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Teglar</label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              placeholder="Masalan: imtihon oldi"
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addTag(tagInput);
                  setTagInput('');
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                addTag(tagInput);
                setTagInput('');
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} className="border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                {tag}
                <button
                  type="button"
                  className="ml-2 rounded px-1 text-cyan-50 hover:bg-cyan-500/30"
                  onClick={() => removeTag(tag)}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          {errors.tags ? <p className="text-xs text-red-300">{errors.tags.message as string}</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Media manager" sectionKey="media" openSections={openSections} toggleSection={toggleSection}>
        <MediaManager
          media={media}
          uploadProgress={uploadProgress}
          uploadErrors={uploadErrorByMediaId}
          onUploadFiles={uploadFiles}
          onRetry={retryUpload}
          onRemove={removeMedia}
          onMove={moveMedia}
          onSetPrimary={setPrimaryMedia}
          onCaptionChange={updateMediaCaption}
        />
      </SectionCard>

      <SectionCard title="Lokatsiya" sectionKey="location" openSections={openSections} toggleSection={toggleSection}>
        <LocationPicker
          value={form.watch('location')}
          query={locationQuery}
          loading={locationLoading}
          results={locationResults}
          mapOpen={locationPanelOpen}
          error={errors.location?.message}
          onMapOpenChange={setLocationPanelOpen}
          onSearch={searchLocations}
          onSelectResult={applyLocation}
          onSetFromMap={setLocationFromMap}
          onAddressChange={(address) =>
            form.setValue('location.address', address, { shouldDirty: true, shouldValidate: true })
          }
        />
      </SectionCard>

      <SectionCard title="Status (faqat ko'rish)" sectionKey="status" openSections={openSections} toggleSection={toggleSection}>
        <div className="flex flex-wrap gap-2">
          {statusChips.map((chip) => (
            <Badge key={chip.label} className={chip.className}>
              {chip.label}
            </Badge>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}




