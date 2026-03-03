'use client';
/* eslint-disable react/no-unescaped-entities */

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, LayoutPanelLeft, MonitorSmartphone, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EditPanel } from '@/components/instructor-profile-builder/EditPanel';
import { LivePreview } from '@/components/instructor-profile-builder/LivePreview';
import { useProfileBuilder } from '@/hooks/useProfileBuilder';
import { useAuth } from '@/store/useAuth';

export function ProfileBuilderPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const builder = useProfileBuilder();

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push('/login?redirect=/instructor/profile-builder');
    }
  }, [hydrated, token, router]);

  useEffect(() => {
    if (builder.globalError) {
      toast.error(builder.globalError);
    }
  }, [builder.globalError]);

  if (!hydrated || !token || builder.loading) {
    return (
      <section className="container-app py-8">
        <div className="h-[72vh] animate-pulse rounded-2xl border border-white/10 bg-slate-900/60" />
      </section>
    );
  }

  return (
    <section className="container-app flex min-h-[calc(100dvh-72px)] flex-col gap-3 py-3">
      <Card className="shrink-0 border-cyan-400/20 bg-gradient-to-r from-slate-900/95 to-slate-950">
        <CardHeader className="gap-2 py-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg text-white">Instruktor profil builder</CardTitle>
              <CardDescription className="text-[13px] text-slate-300">
                Chapda tahrirlang, o'ngda public profilning real preview ko'rinishini kuzating.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/instructor/dashboard">Kabinetga qaytish</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/driving-instructors/${builder.profile.slug || ''}`}>Public profil</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5">
            <div className="flex items-center gap-2 text-sm text-slate-200">
              {builder.unsavedChanges ? (
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              ) : (
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              )}
              {builder.unsavedChanges ? "Saqlanmagan o'zgarishlar bor" : "O'zgarishlar saqlangan"}
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <Button
                type="button"
                size="sm"
                variant={builder.previewMode === 'desktop' ? 'default' : 'outline'}
                className={builder.previewMode === 'desktop' ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : ''}
                onClick={() => builder.setPreviewMode('desktop')}
              >
                <MonitorSmartphone className="h-4 w-4" />
                Desktop preview
              </Button>
              <Button
                type="button"
                size="sm"
                variant={builder.previewMode === 'mobile' ? 'default' : 'outline'}
                className={builder.previewMode === 'mobile' ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : ''}
                onClick={() => builder.setPreviewMode('mobile')}
              >
                <Smartphone className="h-4 w-4" />
                Mobile preview
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-2">
          <Button
            type="button"
            variant={builder.panelMode === 'edit' ? 'default' : 'outline'}
            className={builder.panelMode === 'edit' ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : ''}
            onClick={() => builder.setPanelMode('edit')}
          >
            <LayoutPanelLeft className="h-4 w-4" />
            Tahrirlash
          </Button>
          <Button
            type="button"
            variant={builder.panelMode === 'preview' ? 'default' : 'outline'}
            className={builder.panelMode === 'preview' ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400' : ''}
            onClick={() => builder.setPanelMode('preview')}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:h-[calc(100dvh-176px)] lg:min-h-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div
          className={`${builder.panelMode === 'preview' ? 'hidden md:block' : ''} lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1`}
        >
          <EditPanel builder={builder} />
        </div>
        <div
          className={`${builder.panelMode === 'edit' ? 'hidden md:block' : ''} lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pl-1`}
        >
          <LivePreview profile={builder.profile} mode={builder.previewMode} />
        </div>
      </div>
    </section>
  );
}


