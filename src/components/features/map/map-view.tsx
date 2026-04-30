"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import type { PlaceWithDetails, BBox } from "@/types";
import { cn } from "@/lib/cn";

import "leaflet/dist/leaflet.css";

const NHATRANG_CENTER: [number, number] = [12.2451, 109.1943];
const DEFAULT_ZOOM = 14;

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
};

function createIcon(categoryId: string, icon: string) {
  const color = CATEGORY_COLORS[categoryId] || "#6b7280";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;">${icon}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
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

interface MapViewProps {
  places: PlaceWithDetails[];
  onBoundsChange?: (bbox: BBox) => void;
  onPlaceClick?: (place: PlaceWithDetails) => void;
  pickMode?: boolean;
  onPick?: (lat: number, lng: number) => void;
  pickedLocation?: [number, number] | null;
  flyTo?: [number, number] | null;
  className?: string;
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
}: MapViewProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) {
    return (
      <div className={cn("flex items-center justify-center bg-zinc-100", className)}>
        <div className="text-sm text-zinc-500">Загрузка карты...</div>
      </div>
    );
  }

  return (
    <MapContainer
      center={NHATRANG_CENTER}
      zoom={DEFAULT_ZOOM}
      className={cn("w-full h-full z-0", className)}
      style={{ minHeight: "300px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AttributionPrefixCleaner />

      {onBoundsChange && <MapEvents onBoundsChange={onBoundsChange} />}
      {pickMode && onPick && <PickLocation onPick={onPick} />}
      {flyToCenter && <FlyTo center={flyToCenter} />}

      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={createIcon(place.category_id, place.category.icon)}
          eventHandlers={{
            click: () => onPlaceClick?.(place),
          }}
        >
          <Popup>
            <div className="min-w-[180px]">
              <p className="font-semibold text-sm">{place.title}</p>
              <p className="text-xs text-zinc-500">{place.category.name_ru}</p>
              {place.address_text && <p className="text-xs text-zinc-500 mt-1">{place.address_text}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

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
  );
}
