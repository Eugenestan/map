"use client";

import { useMemo, useState, useEffect } from "react";
import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import type { PlaceWithDetails, ReviewWithTags } from "@/types";
import { TagBadge } from "@/components/ui/tag-badge";
import { TrustBadge } from "@/components/ui/trust-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PlacePhotoGallery } from "@/components/features/places/place-photo-gallery";
import { getPlaceMapPath, getPlacePath } from "@/lib/place-url";
import { computePlaceTrust } from "@/lib/trust";
import { trackAction } from "@/lib/analytics-client";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Copy,
  Globe,
  Mail,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Send,
  Share2,
  Signpost,
  ThumbsUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

const REVIEW_LIKES_SESSION_KEY = "nhatrang_review_likes_v1";
const MOBILE_DESCRIPTION_LIMIT = 200;
const MOBILE_REVIEW_TEXT_LIMIT = 200;

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
  showViewOnMapLink?: boolean;
}

function formatCoordinate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(7) : String(value);
}

function formatReviewDate(review: ReviewWithTags): string {
  if (review.visit_period) return review.visit_period;

  const date = new Date(review.created_at);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function telegramUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://t.me/${value.replace(/^@/, "")}`;
}

function SectionDivider() {
  return <div className="h-px bg-zinc-200" />;
}

interface InfoRowProps {
  icon: ElementType;
  label: string;
  value: ReactNode;
  action?: ReactNode;
}

function InfoRow({ icon: Icon, label, value, action }: InfoRowProps) {
  return (
    <div className="grid grid-cols-[24px_210px_minmax(0,1fr)_auto] items-center gap-3 text-sm max-sm:grid-cols-[24px_minmax(0,1fr)_auto] max-sm:gap-x-2 max-sm:gap-y-1">
      <Icon className="h-5 w-5 text-blue-500" />
      <span className="font-medium text-slate-700 max-sm:text-xs">{label}</span>
      <div className="min-w-0 font-medium text-slate-900 max-sm:col-span-2 max-sm:col-start-2 max-sm:row-start-2">{value}</div>
      {action && <div className="justify-self-end max-sm:col-start-3 max-sm:row-start-1">{action}</div>}
    </div>
  );
}

interface ActionButtonProps {
  children: ReactNode;
  icon: ElementType;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "blueOutline" | "danger";
  compact?: boolean;
}

function ActionButton({ children, icon: Icon, onClick, variant = "secondary", compact }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors",
        compact ? "px-3 py-2" : "px-4 py-2.5",
        variant === "primary" && "border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700",
        variant === "secondary" && "border-zinc-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50",
        variant === "blueOutline" && "border-blue-200 bg-white text-blue-600 hover:bg-blue-50",
        variant === "danger" && "border-red-200 bg-white text-red-600 hover:bg-red-50",
      )}
    >
      <Icon className={cn("h-4 w-4", variant === "primary" && "text-white")} />
      {children}
    </button>
  );
}

interface ReviewCardProps {
  review: ReviewWithTags;
  liked: boolean;
  onLike: (reviewId: string) => void;
  collapseLongText?: boolean;
  onOpenText?: (review: ReviewWithTags) => void;
}

function ReviewCard({ review, liked, onLike, collapseLongText, onOpenText }: ReviewCardProps) {
  const date = formatReviewDate(review);
  const text = review.text?.trim() || "";
  const shouldCollapseText = collapseLongText && text.length > MOBILE_REVIEW_TEXT_LIMIT;
  const visibleText = shouldCollapseText ? `${text.slice(0, MOBILE_REVIEW_TEXT_LIMIT).trimEnd()}...` : text;

  return (
    <div className="rounded-lg border border-zinc-100 bg-white p-3.5 shadow-sm">
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{review.author_name || "Аноним"}</span>
          {date && <span className="text-xs text-zinc-400">• {date}</span>}
        </div>
      </div>
      {text ? (
        <p className="text-sm leading-relaxed text-slate-800">
          {visibleText}
          {shouldCollapseText && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => onOpenText?.(review)}
                className="font-medium text-blue-600 underline-offset-2 hover:underline"
              >
                Показать полностью
              </button>
            </>
          )}
        </p>
      ) : null}
      {review.tags && review.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {review.tags.map((tag) => (
            <TagBadge key={tag.id} label={tag.name_ru} type={tag.tag_type} />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => onLike(review.id)}
        aria-pressed={liked}
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-500 transition-colors hover:text-blue-700"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        <span>Полезно ({review.likes_count})</span>
      </button>
    </div>
  );
}

export function PlaceCardFull({ place, onReport, onAddReview, showViewOnMapLink = false }: PlaceCardFullProps) {
  const [reviews, setReviews] = useState<ReviewWithTags[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [likedReviewIds, setLikedReviewIds] = useState<Set<string>>(new Set());
  const [mobileView, setMobileView] = useState<"details" | "reviews">("details");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [reviewTextOpen, setReviewTextOpen] = useState<ReviewWithTags | null>(null);

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
  const articleLink = infoLinks[0];
  const coordinates = useMemo(() => `${formatCoordinate(place.lat)}, ${formatCoordinate(place.lng)}`, [place.lat, place.lng]);
  const previewReview = reviews[0];
  const latestReview = useMemo(() => {
    return reviews.reduce<ReviewWithTags | undefined>((latest, review) => {
      if (!latest) return review;
      return new Date(review.created_at).getTime() > new Date(latest.created_at).getTime() ? review : latest;
    }, undefined);
  }, [reviews]);
  const description = place.description || "";
  const shouldCollapseDescription = description.length > MOBILE_DESCRIPTION_LIMIT;
  const mobileDescriptionPreview = shouldCollapseDescription
    ? `${description.slice(0, MOBILE_DESCRIPTION_LIMIT).trimEnd()}...`
    : description;

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
    trackAction("share", place.id);
    const placeUrl = `${window.location.origin}${getPlacePath(place)}`;
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
    trackAction("route", place.id);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`, "_blank");
  };

  const handleCopyCoordinates = async () => {
    try {
      await navigator.clipboard.writeText(coordinates);
      window.alert("Координаты скопированы.");
    } catch {
      /* ignore */
    }
  };

  const renderHeader = () => (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="text-2xl leading-none">{place.category.icon}</span>
          <span className="text-sm font-medium">{place.category.name_ru}</span>
        </div>
        {showViewOnMapLink && (
          <Link
            href={getPlaceMapPath(place, { focus: true })}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <MapPin className="h-4 w-4" />
            Посмотреть на карте
          </Link>
        )}
      </div>

      <h2 className={cn("text-4xl font-extrabold leading-tight tracking-tight max-sm:text-2xl", isDanger ? "text-red-800" : "text-[#071a49]")}>
        {place.title}
      </h2>

      <div className="mt-3 h-px bg-zinc-200" />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {trust && <TrustBadge trust={trust} />}
        {place.admin_recommended && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200/80">
            ⭐ Рекомендуют
          </span>
        )}
      </div>
    </div>
  );

  const renderArticleCard = () => {
    if (!place.place_info) return null;

    const content = (
      <div className="flex items-center gap-4 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <BookOpen className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">Интересная статья об этом месте</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            Узнайте историю, интересные факты и рекомендации перед посещением.
          </p>
        </div>
        {articleLink && (
          <span className="hidden items-center gap-2 text-sm font-medium text-blue-600 sm:inline-flex">
            Читать статью <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    );

    if (!articleLink) {
      return (
        <div className="space-y-2">
          {content}
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{place.place_info}</p>
        </div>
      );
    }

    return (
      <a
        href={articleLink}
        target={articleLink.startsWith("/") ? undefined : "_blank"}
        rel={articleLink.startsWith("/") ? undefined : "noreferrer"}
        className="block"
      >
        {content}
      </a>
    );
  };

  const renderDetails = () => (
    <>
      {renderHeader()}

      {description && (
        <section>
          <h3 className="mb-2 text-lg font-bold text-[#071a49] max-sm:text-base">Описание места:</h3>
          <p className="hidden text-sm leading-7 text-slate-900 md:block">{description}</p>
          <p className="text-sm leading-6 text-slate-900 md:hidden">
            {mobileDescriptionPreview}
            {shouldCollapseDescription && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setDescriptionOpen(true)}
                  className="font-medium text-blue-600 underline-offset-2 hover:underline"
                >
                  Показать полностью
                </button>
              </>
            )}
          </p>
        </section>
      )}

      <div>
        <ActionButton icon={Share2} onClick={handleShare}>Поделиться</ActionButton>
      </div>

      {renderArticleCard()}

      {place.tags.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#071a49]">Теги</h3>
          <div className="flex flex-wrap gap-1.5">
            {place.tags.map((placeTag) => (
              <TagBadge key={placeTag.tag_id} label={placeTag.tag.name_ru} type={placeTag.tag.tag_type} size="md" />
            ))}
          </div>
        </section>
      )}

      {place.photo_urls.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-[#071a49]">Фотографии</h3>
          <PlacePhotoGallery photos={place.photo_urls} title={place.title} />
        </section>
      )}

      <SectionDivider />

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-[#071a49] max-sm:text-base">Локация места:</h3>
        <div className="space-y-4">
          <InfoRow
            icon={MapPin}
            label="Координаты:"
            value={<span className="break-words">{coordinates}</span>}
            action={
              <button
                type="button"
                onClick={handleCopyCoordinates}
                className="rounded-md p-1.5 text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                aria-label="Скопировать координаты"
              >
                <Copy className="h-4 w-4" />
              </button>
            }
          />
          <InfoRow icon={Signpost} label="Адрес/ориентир:" value={place.address_text || "Не указан"} />
        </div>
        <div className="w-32 max-sm:w-full">
          <ActionButton icon={Navigation} onClick={handleRoute} variant="primary" compact>Маршрут</ActionButton>
        </div>
      </section>

      <SectionDivider />

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-[#071a49] max-sm:text-base">Контакты места:</h3>
        <div className="space-y-4">
          <InfoRow
            icon={Phone}
            label="Телефон:"
            value={
              place.phone ? (
                <a href={`tel:${place.phone}`} onClick={() => trackAction("phone", place.id)} className="hover:text-blue-600">
                  {place.phone}
                </a>
              ) : (
                "Не указан"
              )
            }
          />
          <InfoRow icon={Mail} label="Email:" value="Не указан" />
          <InfoRow
            icon={Globe}
            label="Сайт:"
            value={
              place.website ? (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener"
                  onClick={() => trackAction("website", place.id)}
                  className="block truncate hover:text-blue-600"
                >
                  {place.website}
                </a>
              ) : (
                "Не указан"
              )
            }
          />
          {place.telegram && (
            <InfoRow
              icon={Send}
              label="Telegram:"
              value={
                <a
                  href={telegramUrl(place.telegram)}
                  target="_blank"
                  rel="noopener"
                  onClick={() => trackAction("telegram", place.id)}
                  className="block break-words hover:text-blue-600"
                >
                  {place.telegram}
                </a>
              }
            />
          )}
        </div>
      </section>

      <SectionDivider />

      <section className="hidden space-y-3 md:block">
        <h3 className="text-lg font-bold text-[#071a49]">
          Отзывы {reviews.length > 0 && <span>({reviews.length})</span>}
        </h3>
        {loadingReviews ? (
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 py-6 text-center text-sm text-zinc-400">Загрузка отзывов...</div>
        ) : reviews.length === 0 ? (
          <EmptyState type="no-reviews" className="rounded-lg border border-zinc-100 bg-zinc-50 py-8" />
        ) : showAllReviews ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} liked={likedReviewIds.has(review.id)} onLike={handleLike} />
            ))}
          </div>
        ) : (
          <>
            {previewReview && <ReviewCard review={previewReview} liked={likedReviewIds.has(previewReview.id)} onLike={handleLike} />}
            <button
              type="button"
              onClick={() => setShowAllReviews(true)}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              Показать все отзывы <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </section>

      <section className="space-y-3 md:hidden">
        <h3 className="text-base font-bold text-[#071a49]">Отзывы о месте</h3>
        {loadingReviews ? (
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 py-6 text-center text-sm text-zinc-400">Загрузка отзывов...</div>
        ) : reviews.length === 0 ? (
          <EmptyState type="no-reviews" className="rounded-lg border border-zinc-100 bg-zinc-50 py-8" />
        ) : (
          <div className="space-y-3">
            {latestReview && (
              <ReviewCard
                review={latestReview}
                liked={likedReviewIds.has(latestReview.id)}
                onLike={handleLike}
                collapseLongText
                onOpenText={setReviewTextOpen}
              />
            )}
            <button
              type="button"
              onClick={() => setMobileView("reviews")}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              Показать все отзывы ({reviews.length}) <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      <div className="space-y-3 md:hidden">
        <ActionButton icon={Pencil} onClick={onAddReview} variant="blueOutline">Добавить отзыв</ActionButton>
        <ActionButton icon={AlertTriangle} onClick={onReport} variant="danger">Сообщить о проблеме с местом</ActionButton>
      </div>

      <div className="hidden space-y-3 md:block">
        <ActionButton icon={Pencil} onClick={onAddReview} variant="blueOutline">Добавить отзыв</ActionButton>
        <ActionButton icon={AlertTriangle} onClick={onReport} variant="danger">Сообщить о проблеме с местом</ActionButton>
      </div>
    </>
  );

  const renderReviews = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileView("details")}
          className="rounded-lg p-1.5 text-slate-700 transition-colors hover:bg-zinc-100"
          aria-label="Назад к описанию"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-slate-500">
          <span className="text-xl leading-none">{place.category.icon}</span>
          <span className="text-xs font-medium">{place.category.name_ru}</span>
        </div>
      </div>

      <h2 className={cn("text-2xl font-extrabold leading-tight tracking-tight", isDanger ? "text-red-800" : "text-[#071a49]")}>
        {place.title}
      </h2>

      <SectionDivider />

      <h3 className="text-base font-bold text-[#071a49]">Отзывы ({reviews.length})</h3>

      {loadingReviews ? (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 py-6 text-center text-sm text-zinc-400">Загрузка отзывов...</div>
      ) : reviews.length === 0 ? (
        <EmptyState type="no-reviews" className="rounded-lg border border-zinc-100 bg-zinc-50 py-8" />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              liked={likedReviewIds.has(review.id)}
              onLike={handleLike}
              collapseLongText
              onOpenText={setReviewTextOpen}
            />
          ))}
        </div>
      )}

      <ActionButton icon={Pencil} onClick={onAddReview} variant="primary">Добавить отзыв</ActionButton>
    </div>
  );

  return (
    <div className="space-y-5 text-slate-900 max-sm:space-y-4">
      <div className="space-y-3 md:hidden">{mobileView === "reviews" ? renderReviews() : renderDetails()}</div>
      <div className="hidden space-y-5 md:block">{renderDetails()}</div>
      {descriptionOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 md:hidden">
          <div className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setDescriptionOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-zinc-100 hover:text-slate-700"
              aria-label="Закрыть описание"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="pr-10 text-lg font-bold text-[#071a49]">Описание места</h3>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-900">{description}</p>
          </div>
        </div>
      )}
      {reviewTextOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 md:hidden">
          <div className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setReviewTextOpen(null)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-zinc-100 hover:text-slate-700"
              aria-label="Закрыть отзыв"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="pr-10 text-lg font-bold text-[#071a49]">Отзыв</h3>
            <div className="mt-2 text-sm font-bold text-slate-900">{reviewTextOpen.author_name || "Аноним"}</div>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-900">{reviewTextOpen.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
