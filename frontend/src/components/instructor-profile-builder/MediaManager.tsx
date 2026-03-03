'use client';
/* eslint-disable react/no-unescaped-entities */

import { ChangeEvent, DragEvent, useRef } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, RefreshCcw, Star, Trash2, UploadCloud, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BuilderMediaItem } from '@/schemas/instructorProfileBuilder.schema';

type MediaManagerProps = {
  media: BuilderMediaItem[];
  uploadProgress: Record<string, number>;
  uploadErrors: Record<string, string>;
  onUploadFiles: (files: File[]) => Promise<void>;
  onRetry: (mediaId: string) => Promise<void>;
  onRemove: (mediaId: string) => void;
  onMove: (mediaId: string, direction: 'up' | 'down') => void;
  onSetPrimary: (mediaId: string) => void;
  onCaptionChange: (mediaId: string, caption: string) => void;
};

export function MediaManager({
  media,
  uploadProgress,
  uploadErrors,
  onUploadFiles,
  onRetry,
  onRemove,
  onMove,
  onSetPrimary,
  onCaptionChange,
}: MediaManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    await onUploadFiles(Array.from(fileList));
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFiles(event.target.files);
    event.target.value = '';
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    void handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
        className="cursor-pointer rounded-xl border border-dashed border-cyan-400/40 bg-cyan-500/5 p-5 text-center transition hover:border-cyan-300 hover:bg-cyan-500/10"
      >
        <UploadCloud className="mx-auto h-7 w-7 text-cyan-300" />
        <p className="mt-2 text-sm font-medium text-slate-100">Rasmni tashlang yoki tanlang</p>
        <p className="mt-1 text-xs text-slate-400">PNG/JPG/WebP, bir nechta faylni bir vaqtda yuklash mumkin</p>
        <Button type="button" variant="outline" size="sm" className="mt-3 border-cyan-400/50 text-cyan-200">
          <ImagePlus className="h-4 w-4" />
          Media tanlash
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {media.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">
          Hozircha rasm yo'q. Kamida bitta rasm qo'shing.
        </div>
      ) : null}

      <div className="space-y-3">
        {media.map((item, index) => {
          const progress = uploadProgress[item.id];
          const error = uploadErrors[item.id];
          return (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 bg-slate-950/70 p-3"
            >
              <div className="grid gap-3 md:grid-cols-[96px_minmax(0,1fr)]">
                <div className="relative h-24 w-24 overflow-hidden rounded-md border border-white/10 bg-slate-900">
                  {item.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.caption || 'Media'} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={item.isPrimary ? 'default' : 'outline'}
                      onClick={() => onSetPrimary(item.id)}
                      className={item.isPrimary ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : ''}
                    >
                      <Star className="h-4 w-4" />
                      {item.isPrimary ? 'Asosiy' : 'Asosiy qilish'}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={index === 0}
                      onClick={() => onMove(item.id, 'up')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={index === media.length - 1}
                      onClick={() => onMove(item.id, 'down')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="border-red-500/50 text-red-300 hover:bg-red-500/20"
                      onClick={() => onRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Input
                    value={item.caption}
                    onChange={(event) => onCaptionChange(item.id, event.target.value)}
                    placeholder="Rasm taglavhasi (ixtiyoriy)"
                    className="bg-slate-900/70"
                  />

                  {item.status === 'uploading' ? (
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-cyan-400 transition-all"
                          style={{ width: `${progress || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">Yuklanmoqda: {progress || 0}%</p>
                    </div>
                  ) : null}

                  {item.status === 'failed' || error ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      <XCircle className="h-4 w-4" />
                      <span>{error || 'Yuklash muvaffaqiyatsiz tugadi.'}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-auto border-red-400/50 text-red-100 hover:bg-red-500/20"
                        onClick={() => void onRetry(item.id)}
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



