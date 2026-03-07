'use client';
/* eslint-disable react/no-unescaped-entities */

import { MapPin, MessageCircle, Phone, ShieldCheck, Star, TriangleAlert, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolvePublicMediaUrl } from '@/lib/media';
import type { InstructorProfileBuilderFormData } from '@/schemas/instructorProfileBuilder.schema';

type LivePreviewProps = {
  profile: InstructorProfileBuilderFormData;
  mode: 'desktop' | 'mobile';
};

function buildMiniMapEmbedUrl(latitude: number | null, longitude: number | null): string | null {
  if (latitude == null || longitude == null) return null;
  const delta = 0.01;
  const left = longitude - delta;
  const right = longitude + delta;
  const top = latitude + delta;
  const bottom = latitude - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export function LivePreview({ profile, mode }: LivePreviewProps) {
  const heroImage = profile.media.find((item) => item.isPrimary) ?? profile.media[0] ?? null;
  const heroImageUrl = resolvePublicMediaUrl(heroImage?.url);
  const mapUrl = buildMiniMapEmbedUrl(profile.location.latitude, profile.location.longitude);
  const warningMessages: string[] = [];
  if (!heroImage) warningMessages.push("Asosiy rasm qo'shilmagan");
  if (profile.location.latitude == null || profile.location.longitude == null) warningMessages.push('Lokatsiya tanlanmagan');

  return (
    <div
      className={`mx-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-[0_0_40px_rgba(10,17,33,0.55)] ${
        mode === 'mobile' ? 'max-w-sm' : ''
      }`}
    >
      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950">
        <div className="relative h-48 w-full bg-slate-800">
          {heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImageUrl} alt={profile.fullName || 'Instructor'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Asosiy rasm yo'q
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xl font-extrabold text-white">
                {profile.fullName || 'Instruktor ismi'}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-200">
                <MapPin className="h-3.5 w-3.5" />
                <span>{[profile.city, profile.region].filter(Boolean).join(', ') || 'Hudud belgilanmagan'}</span>
              </div>
            </div>
            <Badge className="border-amber-400/30 bg-amber-400/15 text-amber-200">
              <Star className="mr-1 h-3.5 w-3.5 fill-current" />
              {profile.status.ratingAvg.toFixed(1)} ({profile.status.reviewCount})
            </Badge>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-cyan-400/30 bg-cyan-500/15 text-cyan-200">
              ${profile.hourlyPriceUsd.toFixed(2)}/soat
            </Badge>
            <Badge variant="outline" className="border-white/20 text-slate-200">
              {profile.transmission === 'manual' ? 'Mexanika' : 'Avtomat'}
            </Badge>
            <Badge variant="outline" className="border-white/20 text-slate-200">
              {profile.carModel || 'Model kiritilmagan'}
            </Badge>
            <Badge variant="outline" className="border-white/20 text-slate-200">
              {profile.yearsExperience} yil tajriba
            </Badge>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Bio</p>
            <p className="mt-2 text-sm text-slate-200">
              {profile.bio || "Instruktor haqida ma'lumot hali to'ldirilmagan."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.tags.length === 0 ? (
                <span className="text-xs text-slate-500">Teglar yo'q</span>
              ) : (
                profile.tags.map((tag) => (
                  <Badge key={tag} className="border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                    {tag}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Galereya</p>
            {profile.media.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Media qo'shilmagan</p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {profile.media.slice(0, 6).map((item) => (
                  (() => {
                    const mediaUrl = resolvePublicMediaUrl(item.url);
                    return (
                      <div key={item.id} className="aspect-video overflow-hidden rounded-md border border-white/10">
                        {mediaUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl} alt={item.caption || 'Gallery'} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                    );
                  })()
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              Lokatsiya
            </div>
            {mapUrl ? (
              <iframe title="Map preview" src={mapUrl} className="h-44 w-full rounded-md border border-white/10" loading="lazy" />
            ) : (
              <div className="rounded-md border border-dashed border-white/15 p-3 text-xs text-slate-500">
                Lokatsiya tanlanmagan
              </div>
            )}
            <p className="mt-2 text-xs text-slate-300">{profile.location.address || 'Manzil kiritilmagan'}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
              <Phone className="h-4 w-4" />
              Bog'lanish
            </Button>
            <Button variant="outline" className="border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/10">
              <MessageCircle className="h-4 w-4" />
              So'rov yuborish
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-300" />
                <span>{profile.status.viewCount} marta ko'rilgan</span>
              </div>
              <div className="mt-2 text-slate-400">24 soatda: {profile.status.viewsLast24h}</div>
            </div>
            <div className="rounded-md border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                <span>{profile.status.verified ? 'Tasdiqlangan profil' : 'Tasdiqlanmagan profil'}</span>
              </div>
              <div className="mt-2 text-slate-400">{profile.status.active ? 'Faol' : 'Nofaol'}</div>
            </div>
          </div>

          {warningMessages.length > 0 ? (
            <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                <TriangleAlert className="h-4 w-4" />
                Preview ogohlantirishlari
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-100">
                {warningMessages.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}




