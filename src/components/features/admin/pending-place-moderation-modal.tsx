"use client";

import { useState } from "react";
import { AddPlaceForm } from "@/components/features/forms/add-place-form";
import { Modal } from "@/components/ui/modal";
import type { PlaceWithDetails } from "@/types";

interface PendingPlaceModerationModalProps {
  place: PlaceWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onUnauthorized: () => void;
}

export function PendingPlaceModerationModal({
  place,
  isOpen,
  onClose,
  onSaved,
  onUnauthorized,
}: PendingPlaceModerationModalProps) {
  const [placeInfo, setPlaceInfo] = useState(place?.place_info || "");

  if (!place) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Модерация: ${place.title}`} size="lg">
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
        submitLabel="Одобрить"
        showSuccessState={false}
        infoField={(
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Информация о месте</label>
            <textarea
              value={placeInfo}
              onChange={(event) => setPlaceInfo(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Добавьте ссылку(и) на места"
            />
          </div>
        )}
        secondaryAction={(
          <button
            type="button"
            onClick={async () => {
              const response = await fetch(`/api/places/${place.id}/reject`, { method: "POST" });
              if (response.status === 401) {
                onUnauthorized();
                return;
              }
              await onSaved();
              onClose();
            }}
            className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Отклонить
          </button>
        )}
        onSubmit={async (data) => {
          const response = await fetch(`/api/admin/places/${place.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, status: "approved", place_info: placeInfo }),
          });
          if (response.status === 401) {
            onUnauthorized();
            return;
          }
          if (!response.ok) {
            const responseData = await response.json().catch(() => null);
            throw new Error(responseData?.error || "Не удалось сохранить место");
          }
          await onSaved();
          onClose();
        }}
      />
    </Modal>
  );
}
