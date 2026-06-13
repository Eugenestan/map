"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Modal } from "@/components/ui/modal";
import { ArticleTextEditor } from "@/components/features/admin/article-text-editor";
import { MAX_ARTICLE_PHOTOS, MAX_PHOTO_FILE_BYTES, uploadArticlePhoto } from "@/lib/upload-article-photo";
import type { PlaceWithDetails, Tag } from "@/types";

const MapView = dynamic(
  () => import("@/components/features/map/map-view").then((m) => m.MapView),
  { ssr: false, loading: () => <div className="h-[280px] rounded-xl bg-zinc-100" /> },
);

interface AddArticleModalProps {
  isOpen: boolean;
  tags: Tag[];
  places: PlaceWithDetails[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onUnauthorized: () => void;
}

const MAX_FILE_MB = Math.round(MAX_PHOTO_FILE_BYTES / (1024 * 1024));

export function AddArticleModal({ isOpen, tags, places, onClose, onSaved, onUnauthorized }: AddArticleModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [pickedLocation, setPickedLocation] = useState<[number, number] | null>(null);
  const [placeId, setPlaceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === placeId) ?? null,
    [placeId, places],
  );

  const handlePhotosChange = async (files: FileList | null, inputElement?: HTMLInputElement | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = Math.max(0, MAX_ARTICLE_PHOTOS - photoUrls.length);
    if (remainingSlots === 0) {
      setError(`Можно загрузить не более ${MAX_ARTICLE_PHOTOS} фото`);
      if (inputElement) inputElement.value = "";
      return;
    }
    const list = Array.from(files).slice(0, remainingSlots);

    setError("");
    setUploading(true);
    setUploadProgress({ done: 0, total: list.length });
    const uploaded: string[] = [];
    try {
      for (let index = 0; index < list.length; index += 1) {
        const url = await uploadArticlePhoto(list[index]);
        uploaded.push(url);
        setUploadProgress({ done: index + 1, total: list.length });
      }
      setPhotoUrls((prev) => [...prev, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить фото");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (inputElement) inputElement.value = "";
    }
  };

  const toggleTag = (tagId: string) => {
    setTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setTagIds([]);
    setPhotoUrls([]);
    setPickedLocation(null);
    setPlaceId("");
    setError("");
    setCreatedUrl(null);
    setUploading(false);
    setUploadProgress(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Добавить место"
      size="lg"
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setCreatedUrl(null);
          if (!pickedLocation) {
            setError("Выберите место на карте");
            return;
          }

          setSaving(true);
          try {
            const response = await fetch("/api/admin/articles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: title.trim(),
                description: description.trim(),
                tag_ids: tagIds,
                photo_urls: photoUrls,
                lat: pickedLocation[0],
                lng: pickedLocation[1],
                place_id: placeId || undefined,
              }),
            });

            if (response.status === 401) {
              onUnauthorized();
              return;
            }
            const body = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(body?.error || "Не удалось создать место");
            }
            setCreatedUrl(body?.data?.url || null);
            await onSaved();
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Не удалось создать место");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Заголовок *</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="Например: Где оформить страховку в Нячанге"
            required
          />
        </div>

        <ArticleTextEditor
          label="Описание *"
          value={description}
          onChange={setDescription}
          placeholder="Текст места..."
          required
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Теги для добавления</label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  tagIds.includes(tag.id)
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-600"
                }`}
              >
                {tag.name_ru}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Фото (до {MAX_ARTICLE_PHOTOS}, максимум {MAX_FILE_MB} МБ на файл)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading || photoUrls.length >= MAX_ARTICLE_PHOTOS}
            onChange={(event) => void handlePhotosChange(event.target.files, event.target)}
            className="w-full text-sm text-zinc-600 disabled:opacity-50"
          />
          {uploading && uploadProgress && (
            <p className="mt-1 text-xs text-blue-600">
              Загрузка {uploadProgress.done}/{uploadProgress.total}...
            </p>
          )}
          {photoUrls.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-zinc-500">
                Загружено: {photoUrls.length}/{MAX_ARTICLE_PHOTOS}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photoUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border border-zinc-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Фото ${index + 1}`} className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrls((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
                    >
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPhotoUrls([])}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Очистить все фото
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Привязать к месту (опционально)</label>
          <select
            value={placeId}
            onChange={(event) => {
              const value = event.target.value;
              setPlaceId(value);
              const place = places.find((item) => item.id === value);
              if (place) {
                setPickedLocation([place.lat, place.lng]);
              }
            }}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Не выбрано</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.title}
              </option>
            ))}
          </select>
          {selectedPlace && <p className="mt-1 text-xs text-zinc-500">Место будет добавлено в «Информация о месте».</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Место на карте *</label>
          <div className="h-[280px] overflow-hidden rounded-xl border border-zinc-200">
            <MapView
              places={[]}
              pickMode
              onPick={(lat, lng) => setPickedLocation([lat, lng])}
              pickedLocation={pickedLocation}
              className="h-full w-full"
            />
          </div>
          {pickedLocation && (
            <p className="mt-1 text-xs text-zinc-500">
              Выбрано: {pickedLocation[0].toFixed(7)}, {pickedLocation[1].toFixed(7)}
            </p>
          )}
        </div>

        {createdUrl && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Место создано: <a className="underline" href={createdUrl} target="_blank" rel="noreferrer">{createdUrl}</a>
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || uploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : uploading ? "Загрузка фото..." : "Создать место"}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Закрыть
          </button>
        </div>
      </form>
    </Modal>
  );
}
