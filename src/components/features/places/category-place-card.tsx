"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlaceWithDetails } from "@/types";
import { TagBadge } from "@/components/ui/tag-badge";
import { getPlaceMapPath } from "@/lib/place-url";
import { MapPin, Pencil } from "lucide-react";

interface CategoryPlaceCardProps {
  place: PlaceWithDetails;
}

function formatCoordinate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(7) : String(value);
}

export function CategoryPlaceCard({ place }: CategoryPlaceCardProps) {
  const router = useRouter();
  const coordinates = `${formatCoordinate(place.lat)}, ${formatCoordinate(place.lng)}`;
  const mapPath = getPlaceMapPath(place, { focus: true });
  const cardMapPath = getPlaceMapPath(place);
  const reviewPath = getPlaceMapPath(place, { action: "review" });
  const previewPhoto = place.photo_urls[0] ?? null;

  const openOnMap = () => {
    router.push(cardMapPath);
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openOnMap}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openOnMap();
        }
      }}
      className="cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-zinc-900">{place.title}</h3>
            {place.is_verified && (
              <span className="shrink-0 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Проверено</span>
            )}
          </div>

          {place.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {place.tags.slice(0, 5).map((tag) => (
                <TagBadge key={tag.id} label={tag.tag.name_ru} type={tag.tag.tag_type} />
              ))}
            </div>
          )}
        </div>

        {previewPhoto && (
          <div className="h-[150px] w-[150px] shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto}
              alt={place.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {place.description && (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">{place.description}</p>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="font-medium text-zinc-700">Координаты:</dt>
          <dd className="mt-0.5 text-zinc-600">{coordinates}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-700">Адрес/ориентир:</dt>
          <dd className="mt-0.5 text-zinc-600">{place.address_text || "Не указан"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={mapPath}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <MapPin className="h-4 w-4" />
          Посмотреть на карте
        </Link>
        <Link
          href={reviewPath}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
        >
          <Pencil className="h-4 w-4" />
          Добавить отзыв
        </Link>
      </div>
    </article>
  );
}
