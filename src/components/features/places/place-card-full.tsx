"use client";

import { useState, useEffect } from "react";
import type { PlaceWithDetails, ReviewWithTags } from "@/types";
import { TagBadge } from "@/components/ui/tag-badge";
import { TrustBadge } from "@/components/ui/trust-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { computePlaceTrust } from "@/lib/trust";
import { MapPin, Phone, Globe, Clock, MessageSquare, Flag, Navigation, Share2, ThumbsUp, Send } from "lucide-react";
import { cn } from "@/lib/cn";

const REVIEW_LIKES_SESSION_KEY = "nhatrang_review_likes_v1";

function readLikedReviewIdsFromSession(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(REVIEW_LIKES_SESSION_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function persistLikedReviewId(reviewId: string) {
  const next = readLikedReviewIdsFromSession();
  next.add(reviewId);
  sessionStorage.setItem(REVIEW_LIKES_SESSION_KEY, JSON.stringify([...next]));
}

interface PlaceCardFullProps {
  place: PlaceWithDetails;
  onReport?: () => void;
  onAddReview?: () => void;
}

export function PlaceCardFull({ place, onReport, onAddReview }: PlaceCardFullProps) {
  const [reviews, setReviews] = useState<ReviewWithTags[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [likedReviewIds, setLikedReviewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLikedReviewIds(readLikedReviewIdsFromSession());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch(`/api/places/${place.id}/reviews`)
      .then((r) => r.json())
      .then((d) => setReviews(d.data || []))
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false));
  }, [place.id]);

  const totalConfirm = place.tags.reduce((s, t) => s + t.confirm_count, 0);
  const totalDispute = place.tags.reduce((s, t) => s + t.dispute_count, 0);
  const trust = computePlaceTrust(place.is_verified, place.last_verified_at, totalConfirm, totalDispute);
  const isDanger = place.category_id === "cat-10";
  const infoLinks = (place.place_info || "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.startsWith("http://") || item.startsWith("https://") || item.startsWith("/"));

  const handleLike = async (reviewId: string) => {
    if (likedReviewIds.has(reviewId)) return;
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, { method: "POST" });
      if (res.status === 409) {
        persistLikedReviewId(reviewId);
        setLikedReviewIds(readLikedReviewIdsFromSession());
        return;
      }
      if (!res.ok) return;
      persistLikedReviewId(reviewId);
      setLikedReviewIds((prev) => new Set(prev).add(reviewId));
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, likes_count: r.likes_count + 1 } : r)));
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    const placeUrl = `${window.location.origin}/place/${place.id}`;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
    const shareText = [
      `Место: ${place.title}`,
      `Координаты: ${place.lat}, ${place.lng}`,
      `Карта: ${mapUrl}`,
      `В NhaTrang Map: ${placeUrl}`,
    ].join("\n");
    const shareData = {
      title: place.title,
      text: shareText,
      url: placeUrl,
    };

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareText);
      window.alert("Ссылка и координаты скопированы. Вставьте в нужный мессенджер.");
    } catch {
      const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(placeUrl)}&text=${encodeURIComponent(shareText)}`;
      window.open(telegramUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleRoute = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{place.category.icon}</span>
              <span className="text-xs font-medium text-zinc-500">{place.category.name_ru}</span>
            </div>
            <h2 className={cn("text-xl font-bold", isDanger ? "text-red-800" : "text-zinc-900")}>{place.title}</h2>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <TrustBadge trust={trust} />
          {place.admin_recommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200/80">
              ⭐ Рекомендуют
            </span>
          )}
        </div>

        {place.address_text && (
          <div className="flex items-center gap-1.5 mt-3 text-sm text-zinc-600">
            <MapPin className="h-4 w-4 flex-shrink-0 text-zinc-400" />
            {place.address_text}
          </div>
        )}
        {place.phone && (
          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-zinc-600">
            <Phone className="h-4 w-4 flex-shrink-0 text-zinc-400" />
            <a href={`tel:${place.phone}`} className="hover:text-blue-600">{place.phone}</a>
          </div>
        )}
        {place.working_hours && (
          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-zinc-600">
            <Clock className="h-4 w-4 flex-shrink-0 text-zinc-400" />
            {place.working_hours}
          </div>
        )}
        {place.website && (
          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-zinc-600">
            <Globe className="h-4 w-4 flex-shrink-0 text-zinc-400" />
            <a href={place.website} target="_blank" rel="noopener" className="hover:text-blue-600 truncate">{place.website}</a>
          </div>
        )}
        {place.telegram && (
          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-zinc-600">
            <Send className="h-4 w-4 flex-shrink-0 text-zinc-400" />
            <span>{place.telegram}</span>
          </div>
        )}
      </div>

      {place.tags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 mb-2">Теги</h3>
          <div className="flex flex-wrap gap-1.5">
            {place.tags.map((pt) => (
              <TagBadge key={pt.tag_id} label={pt.tag.name_ru} type={pt.tag.tag_type} size="md" />
            ))}
          </div>
        </div>
      )}

      {place.description && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 mb-1">Описание</h3>
          <p className="text-sm text-zinc-600 leading-relaxed">{place.description}</p>
        </div>
      )}

      {place.place_info && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 mb-1">Информация о месте</h3>
          {infoLinks.length > 0 ? (
            <div className="flex flex-col gap-1">
              {infoLinks.map((link, index) => (
                <a
                  key={`${link}-${index}`}
                  href={link}
                  className="text-sm text-blue-600 underline-offset-2 hover:underline"
                  target={link.startsWith("/") ? undefined : "_blank"}
                  rel={link.startsWith("/") ? undefined : "noreferrer"}
                >
                  {link}
                </a>
              ))}
            </div>
          ) : (
            <p className="whitespace-pre-line text-sm text-zinc-600">{place.place_info}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={handleRoute} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Navigation className="h-4 w-4" /> Маршрут
        </button>
        <button type="button" onClick={onAddReview} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
          <MessageSquare className="h-4 w-4" /> Отзыв
        </button>
        <button type="button" onClick={handleShare} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
          <Share2 className="h-4 w-4" /> Поделиться
        </button>
        <button type="button" onClick={onReport} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
          <Flag className="h-4 w-4" /> Жалоба
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">
          Отзывы {reviews.length > 0 && <span className="text-zinc-400 font-normal">({reviews.length})</span>}
        </h3>
        {loadingReviews ? (
          <div className="text-sm text-zinc-400 py-4 text-center">Загрузка отзывов...</div>
        ) : reviews.length === 0 ? (
          <EmptyState type="no-reviews" onAction={onAddReview} />
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-zinc-800">{review.author_name || "Аноним"}</span>
                  <span className="text-xs text-zinc-400">
                    {review.visit_period || new Date(review.created_at).toLocaleDateString("ru")}
                  </span>
                </div>
                {review.text?.trim() ? (
                  <p className="text-sm text-zinc-600 leading-relaxed">{review.text}</p>
                ) : null}
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {review.tags.map((t) => (
                      <TagBadge key={t.id} label={t.name_ru} type={t.tag_type} />
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleLike(review.id)}
                  disabled={likedReviewIds.has(review.id)}
                  className={cn(
                    "flex items-center gap-1 mt-2 text-xs transition-colors cursor-pointer",
                    likedReviewIds.has(review.id)
                      ? "text-zinc-300 cursor-not-allowed"
                      : "text-zinc-400 hover:text-blue-600",
                  )}
                >
                  <ThumbsUp className="h-3 w-3" />
                  <span>{likedReviewIds.has(review.id) ? "Вы отметили" : "Полезно"} ({review.likes_count})</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
