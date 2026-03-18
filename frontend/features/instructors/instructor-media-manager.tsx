"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";

import { createMyInstructorMedia, deleteMyInstructorMedia, uploadInstructorMedia } from "@/api/instructors";
import type { InstructorAdminProfile } from "@/types/instructor";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";

export function InstructorMediaManager({
  instructor,
  onSaved,
}: {
  instructor: InstructorAdminProfile;
  onSaved: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadInstructorMedia(file);
      await createMyInstructorMedia({
        media_type: mediaType,
        url: uploaded.url,
        caption: caption.trim() || undefined,
        sort_order: 0,
        is_active: true,
      });
      setCaption("");
      onSaved();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Media yuklanmadi.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (mediaId: string) => {
    setError(null);
    try {
      await deleteMyInstructorMedia(mediaId);
      onSaved();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Media o'chirilmadi.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Galereya boshqaruvi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]">
          <Input placeholder="Caption" value={caption} onChange={(event) => setCaption(event.target.value)} />
          <Select value={mediaType} onChange={(event) => setMediaType(event.target.value)}>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </Select>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted)]">
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Yuklanmoqda..." : "Media qo'shish"}
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>
        {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {instructor.media_items.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Hozircha media yo'q.</p>
          ) : (
            instructor.media_items.map((media) => (
              <div key={media.id} className="overflow-hidden rounded-2xl border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.url} alt={media.caption ?? instructor.full_name} className="h-32 w-full object-cover" />
                <div className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{media.media_type}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{media.caption ?? "Caption yo'q"}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => void handleDelete(media.id)}>
                    <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
