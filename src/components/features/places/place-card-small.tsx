"use client";

import type { PlaceWithDetails } from "@/types";
import { TagBadge } from "@/components/ui/tag-badge";
import { MapPin, MessageSquare } from "lucide-react";
import { cn } from "@/lib/cn";

interface PlaceCardSmallProps {
  place: PlaceWithDetails;
  onClick?: () => void;
  active?: boolean;
}

export function PlaceCardSmall({ place, onClick, active }: PlaceCardSmallProps) {
  const isDanger = place.category_id === "cat-10";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-3.5 transition-all hover:shadow-md",
        active ? "border-blue-400 bg-blue-50/50 shadow-md" : "border-zinc-200 bg-white hover:border-zinc-300",
        isDanger && "border-red-200 hover:border-red-300",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{place.category.icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className={cn("font-semibold text-sm leading-tight truncate", isDanger ? "text-red-800" : "text-zinc-900")}>
            {place.admin_recommended && <span className="mr-1" title="Рекомендуют">⭐</span>}
            {place.title}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">{place.category.name_ru}</p>

          {place.address_text && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-zinc-500">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{place.address_text}</span>
            </div>
          )}

          {place.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {place.tags.slice(0, 3).map((pt) => (
                <TagBadge key={pt.tag_id} label={pt.tag.name_ru} type={pt.tag.tag_type} />
              ))}
            </div>
          )}

          {place.reviews_count > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
              <MessageSquare className="h-3 w-3" />
              <span>{place.reviews_count} отз.</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
