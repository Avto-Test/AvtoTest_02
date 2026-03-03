'use client';

import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

type MapPickerCanvasProps = {
  latitude: number | null;
  longitude: number | null;
  isOpen?: boolean;
  readOnly?: boolean;
  heightClass?: string;
  onPick: (lat: number, lng: number) => void;
};

const DEFAULT_CENTER: [number, number] = [41.2995, 69.2401];

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function MapViewportSync({ center, isOpen }: { center: [number, number]; isOpen: boolean }) {
  const map = useMap();

  useEffect(() => {
    const ensureVisible = () => map.invalidateSize(false);
    let ticks = 0;
    ensureVisible();
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(ensureVisible);
    });
    const timer1 = window.setTimeout(ensureVisible, 120);
    const timer2 = window.setTimeout(ensureVisible, 320);
    const interval = window.setInterval(() => {
      ensureVisible();
      ticks += 1;
      if (ticks >= 12) window.clearInterval(interval);
    }, 140);
    const onResize = () => ensureVisible();
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onResize);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => ensureVisible());
      observer.observe(map.getContainer());
    }
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      window.clearInterval(interval);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onResize);
      observer?.disconnect();
    };
  }, [isOpen, map]);

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: false });
  }, [center, map]);

  return null;
}

export function MapPickerCanvas({
  latitude,
  longitude,
  isOpen = false,
  readOnly = false,
  heightClass = 'h-80',
  onPick,
}: MapPickerCanvasProps) {
  const center = useMemo<[number, number]>(() => {
    if (latitude == null || longitude == null) return DEFAULT_CENTER;
    return [latitude, longitude];
  }, [latitude, longitude]);
  const [fallbackTile, setFallbackTile] = useState(false);

  return (
    <div className={`${heightClass} overflow-hidden rounded-xl border border-cyan-400/40`}>
      <MapContainer
        center={center}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          url={
            fallbackTile
              ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
          attribution={
            fallbackTile
              ? '&copy; OpenStreetMap contributors &copy; CARTO'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
          eventHandlers={{
            tileerror: () => setFallbackTile(true),
          }}
        />
        {!readOnly ? <MapClickHandler onPick={onPick} /> : null}
        <MapViewportSync center={center} isOpen={isOpen} />
        {latitude != null && longitude != null ? (
          <Marker position={[latitude, longitude]} icon={markerIcon} />
        ) : null}
      </MapContainer>
    </div>
  );
}

