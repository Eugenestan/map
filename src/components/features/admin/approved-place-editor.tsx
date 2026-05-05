"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { AddPlaceForm } from "@/components/features/forms/add-place-form";
import { Modal } from "@/components/ui/modal";
import { TagBadge } from "@/components/ui/tag-badge";
import type { PlaceStatus, PlaceWithDetails, ReviewWithTags } from "@/types";
import { AdminReviewEditor } from "@/components/features/admin/admin-review-editor";

interface ApprovedPlaceEditorProps {
  place: PlaceWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onUnauthorized: () => void;
}

export function ApprovedPlaceEditor({
  place,
  isOpen,
  onClose,
  onSaved,
  onUnauthorized,
}: ApprovedPlaceEditorProps) {
  const [status, setStatus] = useState<PlaceStatus>("approved");
  const [isVerified, setIsVerified] = useState(false);
  const [adminRecommended, setAdminRecommended] = useState(false);
  const [reviews, setReviews] = useState<ReviewWithTags[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewWithTags | null>(null);
  const [placeInfo, setPlaceInfo] = useState("");

  const loadReviews = useCallback(async () => {
    if (!place) {
      return;
    }

    setLoadingReviews(true);
    try {
      const response = await fetch(`/api/admin/places/${place.id}/reviews`);
      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await response.json();
      setReviews(data.data || []);
    } finally {
      setLoadingReviews(false);
    }
  }, [onUnauthorized, place]);

  useEffect(() => {
    if (place) {
      setStatus(place.status);
      setIsVerified(place.is_verified);
      setAdminRecommended(place.admin_recommended);
      setPlaceInfo(place.place_info || "");
      void loadReviews();
    }
  }, [loadReviews, place]);

  if (!place) {
    return null;
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Редактировать: ${place.title}`} size="lg">
        <div className="space-y-6">
          <div className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Статус места</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as PlaceStatus)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="approved">Одобрено</option>
                <option value="hidden">Скрыто</option>
                <option value="archived">В архиве</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 self-end md:items-end">
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={isVerified}
                  onChange={(event) => setIsVerified(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600"
                />
                Подтверждено модератором
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={adminRecommended}
                  onChange={(event) => setAdminRecommended(event.target.checked)}
                  className="h-4 w-4 rounded border-amber-400 text-amber-600"
                />
                ⭐ Рекомендуют (подсветка на карте)
              </label>
            </div>
          </div>

          <AddPlaceForm
            key={`${place.id}-${place.updated_at}`}
            lat={place.lat}
            lng={place.lng}
            requireBotProtection={false}
            initialValues={{
              title: place.title,
              category_id: place.category_id,
              address_text: place.address_text || "",
              description: place.description || "",
              tags: place.tags.map((tag) => tag.tag_id),
              phone: place.phone || "",
              website: place.website || "",
              telegram: place.telegram || "",
              working_hours: place.working_hours || "",
            }}
            submitLabel="Сохранить место"
            showSuccessState={false}
            onSubmit={async (data) => {
              const response = await fetch(`/api/admin/places/${place.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...data,
                  status,
                  is_verified: isVerified,
                  admin_recommended: adminRecommended,
                  place_info: placeInfo,
                }),
              });

              if (response.status === 401) {
                onUnauthorized();
                return;
              }

              if (!response.ok) {
                const responseData = await response.json().catch(() => null);
                throw new Error(responseData?.error || "Не удалось обновить место");
              }

              await onSaved();
              onClose();
            }}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Информация о месте</label>
            <textarea
              value={placeInfo}
              onChange={(event) => setPlaceInfo(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Ссылки на статьи по месту"
            />
          </div>

          <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-zinc-500" />
              <h3 className="text-sm font-semibold text-zinc-900">Отзывы по месту</h3>
            </div>

            {loadingReviews ? (
              <p className="text-sm text-zinc-500">Загрузка отзывов...</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-zinc-500">У этого места пока нет отзывов.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-zinc-200 p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{review.author_name || "Аноним"}</p>
                        <p className="text-xs text-zinc-500">
                          Статус: {review.status} {review.visit_period ? `· ${review.visit_period}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedReview(review)}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        Редактировать
                      </button>
                    </div>
                    {review.text?.trim() ? <p className="text-sm text-zinc-700">{review.text}</p> : null}
                    {review.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {review.tags.map((tag) => (
                          <TagBadge key={tag.id} label={tag.name_ru} type={tag.tag_type} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <AdminReviewEditor
        key={selectedReview ? `${selectedReview.id}-${selectedReview.updated_at}` : "review-editor"}
        review={selectedReview}
        placeName={place.title}
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        onUnauthorized={onUnauthorized}
        onSaved={async () => {
          await loadReviews();
          await onSaved();
        }}
      />
    </>
  );
}
