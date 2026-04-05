"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";

import { createMySchoolMedia, deleteMySchoolMedia, uploadMySchoolMedia } from "@/api/schools";
import type { SchoolAdminProfile } from "@/types/school";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

export function SchoolMediaManager({
  school,
  onSaved,
}: {
  school: SchoolAdminProfile;
  onSaved: () => void;
}) {
  const [caption, setCaption] = useState("");
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
      const uploaded = await uploadMySchoolMedia(file);
      await createMySchoolMedia({
        media_type: "image",
        url: uploaded.url,
        caption: caption.trim() || undefined,
        is_active: true,
        sort_order: 0,
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
      await deleteMySchoolMedia(mediaId);
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
        <div className="flex flex-col gap-3 md:flex-row">
          <Input placeholder="Rasm sarlavhasi" value={caption} onChange={(event) => setCaption(event.target.value)} />
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted)]">
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Yuklanmoqda..." : "Rasm qo'shish"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>
        {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {school.media_items.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Hozircha media qo'shilmagan.</p>
          ) : (
            school.media_items.map((media) => (
              <div key={media.id} className="overflow-hidden rounded-2xl border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.url} alt={media.caption ?? school.name} className="h-32 w-full object-cover" />
                <div className="flex items-center justify-between gap-3 p-3">
                  <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">{media.caption ?? "Sarlavha yo'q"}</p>
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
