'use client';
/* eslint-disable react/no-unescaped-entities */

import dynamic from 'next/dynamic';
import { MapPin, Navigation, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { BuilderLocation, LocationResolveResult } from '@/schemas/instructorProfileBuilder.schema';

type LocationPickerProps = {
  value: BuilderLocation;
  query: string;
  loading: boolean;
  results: LocationResolveResult[];
  mapOpen: boolean;
  error?: string;
  onMapOpenChange: (open: boolean) => void;
  onSearch: (query: string) => Promise<void> | void;
  onSelectResult: (location: LocationResolveResult) => void;
  onSetFromMap: (lat: number, lng: number) => void;
  onAddressChange: (address: string) => void;
};

const MapPickerCanvas = dynamic(
  () =>
    import('@/components/instructor-profile-builder/MapPickerCanvas').then(
      (module) => module.MapPickerCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center rounded-xl border border-cyan-400/40 bg-slate-900/70 text-sm text-slate-300">
        Xarita yuklanmoqda...
      </div>
    ),
  }
);

export function LocationPicker({
  value,
  query,
  loading,
  results,
  mapOpen,
  error,
  onMapOpenChange,
  onSearch,
  onSelectResult,
  onSetFromMap,
  onAddressChange,
}: LocationPickerProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          placeholder="Hudud yoki manzil qidiring"
          className="pl-9"
          onChange={(event) => void onSearch(event.target.value)}
        />
      </div>

      {loading ? <p className="text-xs text-slate-400">Qidirilmoqda...</p> : null}
      {!loading && results.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-white/10 bg-slate-950/70 p-2">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectResult(item)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition hover:bg-white/5"
            >
              <MapPin className="mt-0.5 h-4 w-4 text-cyan-300" />
              <span className="text-sm text-slate-200">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      <Input
        value={value.address}
        onChange={(event) => onAddressChange(event.target.value)}
        placeholder="Yozma manzil (mo'ljal)"
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-100">Tanlangan nuqta</p>
          <p className="mt-1">Lat: {value.latitude != null ? value.latitude.toFixed(6) : '-'}</p>
          <p>Lng: {value.longitude != null ? value.longitude.toFixed(6) : '-'}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => onMapOpenChange(true)}>
          <Navigation className="h-4 w-4" />
          Xaritadan tanlash
        </Button>
      </div>

      {value.latitude != null && value.longitude != null ? (
        <MapPickerCanvas
          key={`mini-map-${value.latitude}-${value.longitude}`}
          latitude={value.latitude}
          longitude={value.longitude}
          isOpen
          readOnly
          onPick={() => {}}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/60 p-4 text-xs text-slate-400">
          Lokatsiya tanlanmagan. Preview uchun qidiruv yoki xaritadan pin qo'ying.
        </div>
      )}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <Dialog open={mapOpen} onOpenChange={onMapOpenChange}>
        <DialogContent className="max-w-2xl bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Xaritadan lokatsiya tanlash</DialogTitle>
            <DialogDescription className="text-slate-400">
              Xarita ustiga bosing, pin qo'yiladi va koordinata avtomatik yoziladi.
            </DialogDescription>
          </DialogHeader>

          <MapPickerCanvas
            key={`map-${mapOpen ? 'open' : 'closed'}-${value.latitude ?? 'na'}-${value.longitude ?? 'na'}`}
            latitude={value.latitude}
            longitude={value.longitude}
            isOpen={mapOpen}
            onPick={onSetFromMap}
          />

          <div className="rounded-md border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
            Tanlangan: {value.latitude != null ? value.latitude.toFixed(6) : '-'} /{' '}
            {value.longitude != null ? value.longitude.toFixed(6) : '-'}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onMapOpenChange(false)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


