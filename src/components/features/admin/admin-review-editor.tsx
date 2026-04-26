"use client";

import { useState } from "react";
import { AddReviewForm } from "@/components/features/forms/add-review-form";
import { Modal } from "@/components/ui/modal";
import type { ReviewStatus, ReviewWithTags } from "@/types";

interface AdminReviewEditorProps {
  review: ReviewWithTags | null;
  placeName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onUnauthorized: () => void;
}

export function AdminReviewEditor({
  review,
  placeName,
  isOpen,
  onClose,
  onSaved,
  onUnauthorized,
}: AdminReviewEditorProps) {
  const [status, setStatus] = useState<ReviewStatus>(review?.status ?? "approved");

  if (!review) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать отзыв" size="lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Статус</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ReviewStatus)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="approved">Одобрен</option>
            <option value="hidden">Скрыт</option>
            <option value="pending">На модерации</option>
            <option value="rejected">Отклонён</option>
          </select>
        </div>

        <AddReviewForm
          key={`${review.id}-${review.updated_at}`}
          placeId={review.place_id}
          placeName={placeName}
          requireBotProtection={false}
          initialValues={{
            text: review.text,
            tags: review.tags.map((tag) => tag.id),
            visit_period: review.visit_period || "",
            author_name: review.author_name || "",
          }}
          submitLabel="Сохранить отзыв"
          showSuccessState={false}
          onSuccess={async () => {
            await onSaved();
            onClose();
          }}
          onSubmit={async (data) => {
            const response = await fetch(`/api/admin/reviews/${review.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...data, status }),
            });

            if (response.status === 401) {
              onUnauthorized();
              return;
            }

            if (!response.ok) {
              const responseData = await response.json().catch(() => null);
              throw new Error(responseData?.error || "Не удалось обновить отзыв");
            }
          }}
        />
      </div>
    </Modal>
  );
}
