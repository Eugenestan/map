"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { InterestingArticleEditor } from "@/components/features/admin/interesting-article-editor";
import { MAX_PHOTO_FILE_BYTES, uploadArticlePhoto } from "@/lib/upload-article-photo";
import type {
  InterestingArticleCategory,
  InterestingArticleStatus,
  InterestingArticleWithCategory,
  PlaceWithDetails,
} from "@/types";

interface InterestingArticleModalProps {
  article: InterestingArticleWithCategory | null;
  isOpen: boolean;
  categories: InterestingArticleCategory[];
  places: PlaceWithDetails[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  onDeleted: () => Promise<void> | void;
  onUnauthorized: () => void;
}

const MAX_MEDIA = 20;
const MAX_FILE_MB = Math.round(MAX_PHOTO_FILE_BYTES / (1024 * 1024));
const fieldClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export function InterestingArticleModal({
  article,
  isOpen,
  categories,
  places,
  onClose,
  onSaved,
  onDeleted,
  onUnauthorized,
}: InterestingArticleModalProps) {
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<InterestingArticleStatus>("draft");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContentHtml] = useState("<p></p>");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [placeIds, setPlaceIds] = useState<string[]>([]);
  const [placeSearch, setPlaceSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setCategoryId(article?.category_id || categories.find((category) => category.is_active)?.id || "");
    setStatus(article?.status || "draft");
    setTitle(article?.title || "");
    setSlug(article?.slug || "");
    setExcerpt(article?.excerpt || "");
    setContentHtml(article?.content_html || "<p></p>");
    setCoverImageUrl(article?.cover_image_url || "");
    setMediaUrls(article?.media_urls || []);
    setSeoTitle(article?.seo_title || "");
    setSeoDescription(article?.seo_description || "");
    setSeoKeywords(article?.seo_keywords.join(", ") || "");
    setPlaceIds(article?.place_ids || []);
    setPlaceSearch("");
    setError("");
    setUploading(false);
    setUploadProgress(null);
  }, [article, categories, isOpen]);

  const filteredPlaces = useMemo(() => {
    const query = placeSearch.trim().toLocaleLowerCase("ru");
    if (!query) return places;
    return places.filter((place) =>
      [place.title, place.address_text, place.category?.name_ru]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("ru").includes(query)),
    );
  }, [placeSearch, places]);

  const togglePlace = (id: string) => {
    setPlaceIds((current) => (current.includes(id) ? current.filter((placeId) => placeId !== id) : [...current, id]));
  };

  const uploadOne = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      return await uploadArticlePhoto(file);
    } finally {
      setUploading(false);
    }
  };

  const uploadInlineImage = async (file: File) => {
    if (mediaUrls.length >= MAX_MEDIA) throw new Error(`Можно добавить не более ${MAX_MEDIA} изображений`);
    const url = await uploadOne(file);
    setMediaUrls((current) => (current.includes(url) ? current : [...current, url]));
    return url;
  };

  const uploadCover = async (file: File | undefined, input: HTMLInputElement) => {
    if (!file) return;
    try {
      setCoverImageUrl(await uploadOne(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить обложку");
    } finally {
      input.value = "";
    }
  };

  const uploadMedia = async (files: FileList | null, input: HTMLInputElement) => {
    if (!files?.length) return;
    const remaining = MAX_MEDIA - mediaUrls.length;
    if (remaining <= 0) {
      setError(`Можно добавить не более ${MAX_MEDIA} изображений`);
      input.value = "";
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError("");
    setUploadProgress({ done: 0, total: list.length });
    const uploaded: string[] = [];
    try {
      for (let index = 0; index < list.length; index += 1) {
        uploaded.push(await uploadArticlePhoto(list[index]));
        setUploadProgress({ done: index + 1, total: list.length });
      }
      setMediaUrls((current) => [...current, ...uploaded.filter((url) => !current.includes(url))]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить изображения");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      input.value = "";
    }
  };

  const submit = async () => {
    if (!categoryId) throw new Error("Создайте и выберите категорию");
    const response = await fetch(
      article ? `/api/admin/interesting-articles/${article.id}` : "/api/admin/interesting-articles",
      {
        method: article ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          status,
          title: title.trim(),
          slug: slug.trim() || undefined,
          excerpt: excerpt.trim(),
          content_html: contentHtml,
          cover_image_url: coverImageUrl || null,
          media_urls: mediaUrls,
          seo_title: seoTitle.trim() || null,
          seo_description: seoDescription.trim() || null,
          seo_keywords: [...new Set(seoKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean))],
          place_ids: placeIds,
        }),
      },
    );
    if (response.status === 401) {
      onUnauthorized();
      return false;
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || "Не удалось сохранить статью");
    return true;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={article ? `Редактировать: ${article.title}` : "Новая интересная статья"}
      size="lg"
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError("");
          try {
            if (await submit()) {
              await onSaved();
              onClose();
            }
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить статью");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Категория *</label>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={fieldClass} required>
              <option value="">Выберите категорию</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_ru}{category.is_active ? "" : " (скрыта)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Статус *</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as InterestingArticleStatus)} className={fieldClass}>
              <option value="draft">Черновик</option>
              <option value="published">Опубликована</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Заголовок *</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} minLength={2} maxLength={200} required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Slug</label>
          <input value={slug} onChange={(event) => setSlug(event.target.value)} className={fieldClass} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="Оставьте пустым для автогенерации" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Краткий анонс *</label>
          <textarea value={excerpt} onChange={(event) => setExcerpt(event.target.value)} className={fieldClass} rows={3} minLength={10} maxLength={1000} required />
          <p className="mt-1 text-right text-xs text-zinc-400">{excerpt.length}/1000</p>
        </div>

        <InterestingArticleEditor
          value={contentHtml}
          onChange={setContentHtml}
          onUploadImage={uploadInlineImage}
          disabled={saving || deleting}
        />

        <section className="rounded-xl border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-800">Обложка</h3>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) => void uploadCover(event.target.files?.[0], event.target)}
            className="mt-2 w-full text-sm text-zinc-600 disabled:opacity-50"
          />
          {coverImageUrl && (
            <div className="mt-3 flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImageUrl} alt="Обложка" className="h-28 w-44 rounded-lg border border-zinc-200 object-cover" />
              <button type="button" onClick={() => setCoverImageUrl("")} className="text-xs font-medium text-red-600">
                Удалить обложку
              </button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-800">Медиагалерея</h3>
          <p className="mt-1 text-xs text-zinc-500">До {MAX_MEDIA} файлов, максимум {MAX_FILE_MB} МБ каждый. Изображения из текста также сохраняются здесь.</p>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading || mediaUrls.length >= MAX_MEDIA}
            onChange={(event) => void uploadMedia(event.target.files, event.target)}
            className="mt-2 w-full text-sm text-zinc-600 disabled:opacity-50"
          />
          {uploadProgress && <p className="mt-1 text-xs text-blue-600">Загрузка {uploadProgress.done}/{uploadProgress.total}...</p>}
          {mediaUrls.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {mediaUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Медиа ${index + 1}`} className="h-24 w-full object-cover" />
                  <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                    <button type="button" onClick={() => setCoverImageUrl(url)} className="rounded bg-black/70 px-1.5 py-1 text-[10px] text-white">В обложку</button>
                    <button type="button" onClick={() => setMediaUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded bg-red-700/90 px-1.5 py-1 text-[10px] text-white">Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-800">Связанные места</h3>
          <input value={placeSearch} onChange={(event) => setPlaceSearch(event.target.value)} className={`${fieldClass} mt-2`} placeholder="Найти место..." />
          <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-lg border border-zinc-100 p-2">
            {filteredPlaces.length === 0 ? (
              <p className="py-3 text-center text-xs text-zinc-400">Места не найдены</p>
            ) : filteredPlaces.map((place) => (
              <label key={place.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50">
                <input type="checkbox" checked={placeIds.includes(place.id)} onChange={() => togglePlace(place.id)} className="mt-0.5" />
                <span className="min-w-0 text-sm text-zinc-700">
                  <span className="block truncate font-medium">{place.title}</span>
                  {place.address_text && <span className="block truncate text-xs text-zinc-400">{place.address_text}</span>}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Выбрано: {placeIds.length}</p>
        </section>

        <section className="space-y-3 rounded-xl border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-800">SEO</h3>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">SEO-заголовок</label>
            <input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} className={fieldClass} maxLength={70} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">SEO-описание</label>
            <textarea value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} className={fieldClass} rows={2} maxLength={200} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Ключевые слова через запятую</label>
            <input value={seoKeywords} onChange={(event) => setSeoKeywords(event.target.value)} className={fieldClass} />
          </div>
        </section>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving || deleting || uploading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Сохранение..." : uploading ? "Загрузка..." : article ? "Сохранить" : "Создать статью"}
          </button>
          {article && (
            <button
              type="button"
              disabled={saving || deleting || uploading}
              onClick={async () => {
                if (!confirm("Удалить статью без возможности восстановления?")) return;
                setDeleting(true);
                setError("");
                try {
                  const response = await fetch(`/api/admin/interesting-articles/${article.id}`, { method: "DELETE" });
                  if (response.status === 401) {
                    onUnauthorized();
                    return;
                  }
                  const body = await response.json().catch(() => null);
                  if (!response.ok) throw new Error(body?.error || "Не удалось удалить статью");
                  await onDeleted();
                  onClose();
                } catch (deleteError) {
                  setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить статью");
                } finally {
                  setDeleting(false);
                }
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Удаление..." : "Удалить"}
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Закрыть
          </button>
        </div>
      </form>
    </Modal>
  );
}
