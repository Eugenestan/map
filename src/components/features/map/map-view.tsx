"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Circle, MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { LoaderCircle, LocateFixed } from "lucide-react";
import type { PlaceWithDetails, BBox } from "@/types";
import { TagBadge } from "@/components/ui/tag-badge";
import { cn } from "@/lib/cn";

import "leaflet/dist/leaflet.css";

const NHATRANG_CENTER: [number, number] = [12.2451, 109.1943];
const DEFAULT_ZOOM = 14;
const TOOLTIP_DESCRIPTION_LIMIT = 20;

function truncate(text: string | null | undefined, limit = TOOLTIP_DESCRIPTION_LIMIT): string | null {
  if (!text) return null;
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

type UserLocation = {
  center: [number, number];
  accuracy: number | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  "cat-1": "#2563eb",
  "cat-2": "#16a34a",
  "cat-3": "#ea580c",
  "cat-4": "#7c3aed",
  "cat-5": "#0891b2",
  "cat-6": "#ca8a04",
  "cat-7": "#059669",
  "cat-8": "#6366f1",
  "cat-9": "#ec4899",
  "cat-10": "#dc2626",
  "cat-11": "#6b7280",
  "cat-12": "#0d9488",
  "cat-13": "#7c3aed",
  "cat-14": "#15803d",
  "cat-15": "#b45309",
  "cat-16": "#a855f7",
  "cat-17": "#be123c",
  "cat-18": "#2563eb",
  "cat-19": "#14b8a6",
};

function createIcon(categoryId: string, icon: string, options?: { recommendedGlow?: boolean }) {
  const color = CATEGORY_COLORS[categoryId] || "#6b7280";
  const inner = `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;">${icon}</div>`;

  if (!options?.recommendedGlow) {
    return L.divIcon({
      className: "custom-marker",
      html: inner,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  }

  const html = `
    <div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:1px;border-radius:50%;box-shadow:0 0 0 3px rgba(251,191,36,0.9),0 0 16px rgba(245,158,11,0.45);pointer-events:none;"></div>
      <div style="position:absolute;top:-8px;right:-6px;z-index:3;color:#f59e0b;font-size:18px;line-height:1;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff,0 1px 4px rgba(0,0,0,0.25);pointer-events:none;">★</div>
      <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:center;">${inner}</div>
    </div>`;

  return L.divIcon({
    className: "custom-marker",
    html,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -42],
  });
}

interface MapEventsProps {
  onBoundsChange: (bbox: BBox) => void;
}

function MapEvents({ onBoundsChange }: MapEventsProps) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
  });
  return null;
}

interface PickLocationProps {
  onPick: (lat: number, lng: number) => void;
}

function PickLocation({ onPick }: PickLocationProps) {
  useMapEvents({
    click: (e) => {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface FlyToProps {
  center: [number, number] | null;
}

function FlyTo({ center }: FlyToProps) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 0.5 });
    }
  }, [center, map]);
  return null;
}

function AttributionPrefixCleaner() {
  const map = useMap();

  useEffect(() => {
    map.attributionControl.setPrefix(false);
  }, [map]);

  return null;
}

interface MapRefBridgeProps {
  onReady: (map: L.Map | null) => void;
}

function MapRefBridge({ onReady }: MapRefBridgeProps) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
    return () => onReady(null);
  }, [map, onReady]);

  return null;
}

interface MapViewProps {
  places: PlaceWithDetails[];
  onBoundsChange?: (bbox: BBox) => void;
  onPlaceClick?: (place: PlaceWithDetails) => void;
  pickMode?: boolean;
  onPick?: (lat: number, lng: number) => void;
  pickedLocation?: [number, number] | null;
  flyTo?: [number, number] | null;
  /** Подсветка маркеров с флагом «Рекомендуют» от модератора. */
  highlightRecommended?: boolean;
  className?: string;
  locateButtonClassName?: string;
}

export function MapView({
  places,
  onBoundsChange,
  onPlaceClick,
  pickMode,
  onPick,
  pickedLocation,
  flyTo: flyToCenter,
  className,
  locateButtonClassName,
}: MapViewProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Геолокация не поддерживается этим браузером");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const center: [number, number] = [position.coords.latitude, position.coords.longitude];

        setUserLocation({
          center,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        });
        map?.flyTo(center, Math.max(map.getZoom(), 16), { duration: 0.6 });
        setIsLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Разрешите доступ к геолокации"
            : "Не удалось определить местоположение";

        setLocationError(message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  }, [map]);

  if (!isMounted) {
    return (
      <div className={cn("flex items-center justify-center bg-zinc-100", className)}>
        <div className="text-sm text-zinc-500">Загрузка карты...</div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)} style={{ minHeight: "300px" }}>
      <MapContainer center={NHATRANG_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AttributionPrefixCleaner />
        <MapRefBridge onReady={setMap} />

        {onBoundsChange && <MapEvents onBoundsChange={onBoundsChange} />}
        {pickMode && onPick && <PickLocation onPick={onPick} />}
        {flyToCenter && <FlyTo center={flyToCenter} />}

        {places.map((place) => {
          const truncatedDescription = truncate(place.description);
          return (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={createIcon(place.category_id, place.category.icon, {
                recommendedGlow: place.admin_recommended,
              })}
              eventHandlers={{
                click: () => onPlaceClick?.(place),
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -28]}
                opacity={1}
                className="vr-marker-tooltip"
              >
                <div className="min-w-[180px]">
                  <p className="font-semibold text-sm text-zinc-900">{place.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{place.category.name_ru}</p>
                  {place.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {place.tags.slice(0, 3).map((pt) => (
                        <TagBadge key={pt.tag_id} label={pt.tag.name_ru} type={pt.tag.tag_type} />
                      ))}
                    </div>
                  )}
                  {truncatedDescription && (
                    <p className="text-xs text-zinc-600 mt-1.5">{truncatedDescription}</p>
                  )}
                </div>
              </Tooltip>
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-semibold text-sm">{place.title}</p>
                  {place.admin_recommended && (
                    <p className="text-xs text-amber-700 font-medium mt-0.5">⭐ Рекомендуют</p>
                  )}
                  <p className="text-xs text-zinc-500">{place.category.name_ru}</p>
                  {place.address_text && <p className="text-xs text-zinc-500 mt-1">{place.address_text}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {userLocation && (
          <>
            <Marker
              position={userLocation.center}
              icon={L.divIcon({
                className: "custom-marker",
                html: `<div style="background:#2563eb;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(37,99,235,0.18),0 2px 8px rgba(0,0,0,0.3);"></div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              })}
            />
            {userLocation.accuracy && (
              <Circle
                center={userLocation.center}
                radius={userLocation.accuracy}
                pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.08, weight: 1 }}
              />
            )}
          </>
        )}

        {pickedLocation && (
          <Marker
            position={pickedLocation}
            icon={L.divIcon({
              className: "custom-marker",
              html: `<div style="background:#3b82f6;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 24],
            })}
          />
        )}
      </MapContainer>

      <div className={cn("absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-2", locateButtonClassName)}>
        {locationError && (
          <div className="max-w-56 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-red-600 shadow-lg ring-1 ring-red-100 backdrop-blur-sm">
            {locationError}
          </div>
        )}
        <button
          type="button"
          onClick={handleLocate}
          disabled={isLocating}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-blue-600 shadow-lg transition-colors hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70"
          aria-label="Определить моё местоположение"
          title="Определить моё местоположение"
        >
          {isLocating ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
