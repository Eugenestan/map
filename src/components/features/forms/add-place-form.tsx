"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { addPlaceSchema, type AddPlaceInput } from "@/schemas";
import type { Category, Tag } from "@/types";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";
import { MapPin, Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface AddPlaceFormProps {
  lat?: number;
  lng?: number;
  onSubmit: (data: AddPlaceInput, meta?: { turnstileToken?: string | null }) => Promise<void>;
  onPickLocation?: () => void;
  /** Сохранить введённые данные перед выбором точки на карте (родитель подставит их в initialValues). */
  onBeforePickLocation?: (snapshot: Partial<AddPlaceInput>) => void;
  initialValues?: Partial<AddPlaceInput>;
  submitLabel?: string;
  successTitle?: string;
  successDescription?: string;
  showSuccessState?: boolean;
  requireBotProtection?: boolean;
}

export function AddPlaceForm({
  lat,
  lng,
  onSubmit,
  onPickLocation,
  onBeforePickLocation,
  initialValues,
  submitLabel = "Отправить на модерацию",
  successTitle = "Место отправлено!",
  successDescription = "После модерации оно появится на карте.",
  showSuccessState = true,
  requireBotProtection = true,
}: AddPlaceFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialValues?.tags || []);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<AddPlaceInput>({
    defaultValues: {
      lat,
      lng,
      title: initialValues?.title || "",
      category_id: initialValues?.category_id || "",
      address_text: initialValues?.address_text || "",
      description: initialValues?.description || "",
      tags: initialValues?.tags || [],
      phone: initialValues?.phone || "",
      website: initialValues?.website || "",
      telegram: initialValues?.telegram || "",
      working_hours: initialValues?.working_hours || "",
    },
  });

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.data || []));
    fetch("/api/tags").then((r) => r.json()).then((d) => setTags(d.data || []));
  }, []);

  useEffect(() => {
    if (typeof lat === "number" && Number.isFinite(lat)) setValue("lat", lat);
    if (typeof lng === "number" && Number.isFinite(lng)) setValue("lng", lng);
  }, [lat, lng, setValue]);

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    setSelectedTags(initialValues.tags || []);
    setValue("title", initialValues.title || "");
    setValue("category_id", initialValues.category_id || "");
    setValue("address_text", initialValues.address_text || "");
    setValue("description", initialValues.description || "");
    setValue("tags", initialValues.tags || []);
    setValue("phone", initialValues.phone || "");
    setValue("website", initialValues.website || "");
    setValue("telegram", initialValues.telegram || "");
    setValue("working_hours", initialValues.working_hours || "");
    if (typeof initialValues.lat === "number" && Number.isFinite(initialValues.lat)) {
      setValue("lat", initialValues.lat);
    }
    if (typeof initialValues.lng === "number" && Number.isFinite(initialValues.lng)) {
      setValue("lng", initialValues.lng);
    }
  }, [initialValues, setValue]);

  const descriptionLen = (watch("description") || "").length;
  const DESC_MAX = 400;

  const openLocationPicker = () => {
    const snap = getValues();
    const safe: Partial<AddPlaceInput> = { ...snap };
    if (typeof snap.lat !== "number" || !Number.isFinite(snap.lat)) delete safe.lat;
    if (typeof snap.lng !== "number" || !Number.isFinite(snap.lng)) delete safe.lng;
    onBeforePickLocation?.(safe);
    onPickLocation?.();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId];
      setValue("tags", next);
      return next;
    });
  };

  const onValid = async (data: AddPlaceInput) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      if (requireBotProtection && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
        throw new Error("Подтвердите, что вы не бот");
      }

      const merged = { ...data };
      if ((typeof merged.lat !== "number" || !Number.isFinite(merged.lat)) && typeof lat === "number" && Number.isFinite(lat)) {
        merged.lat = lat;
      }
      if ((typeof merged.lng !== "number" || !Number.isFinite(merged.lng)) && typeof lng === "number" && Number.isFinite(lng)) {
        merged.lng = lng;
      }

      // Validate with zod manually for safety
      const parsed = addPlaceSchema.safeParse(merged);
      if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => e.message).join(" ");
        setSubmitError(msg || "Проверьте поля формы");
        return;
      }
      await onSubmit(parsed.data, { turnstileToken });
      if (showSuccessState) {
        setSuccess(true);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось сохранить место");
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccessState && success) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-4 rounded-full bg-green-100 p-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900">{successTitle}</h3>
        <p className="mt-1 text-sm text-zinc-500">{successDescription}</p>
      </div>
    );
  }

  const groupedTags = {
    language: tags.filter((t) => t.tag_type === "language"),
    useful: tags.filter((t) => t.tag_type === "useful"),
    food: tags.filter((t) => t.tag_type === "food"),
    warning: tags.filter((t) => t.tag_type === "warning"),
    service: tags.filter((t) => t.tag_type === "service"),
  };

  const groupNames: Record<string, string> = {
    language: "Русскоязычность",
    useful: "Полезность",
    food: "Еда",
    warning: "Предупреждения",
    service: "Сервис",
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Название *</label>
        <input
          {...register("title", { required: "Введите название" })}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Например: Клиника доктора Иванова"
        />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Категория *</label>
        <select
          {...register("category_id", { required: "Выберите категорию" })}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
        >
          <option value="">Выберите категорию</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name_ru}</option>
          ))}
        </select>
        {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Точка на карте *</label>
        {typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng) ? (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
            <MapPin className="h-4 w-4" />
            <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
            <button
              type="button"
              onClick={openLocationPicker}
              className="ml-auto text-xs underline text-green-700 cursor-pointer"
            >
              Изменить
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openLocationPicker}
            className="w-full rounded-lg border-2 border-dashed border-zinc-300 px-3 py-4 text-sm text-zinc-500 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <MapPin className="h-5 w-5 mx-auto mb-1" />
            Нажмите, чтобы указать точку на карте
          </button>
        )}
        <input type="hidden" {...register("lat", { required: true, valueAsNumber: true })} />
        <input type="hidden" {...register("lng", { required: true, valueAsNumber: true })} />
        {(errors.lat || errors.lng) && <p className="text-xs text-red-500 mt-1">Укажите точку на карте</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Адрес / ориентир</label>
        <input
          {...register("address_text")}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="ул. Нгуен Тхиен Тхуат, 52"
        />
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="block text-sm font-medium text-zinc-700">Описание</label>
          <span className={cn("text-xs tabular-nums", descriptionLen > DESC_MAX ? "text-red-500" : "text-zinc-400")}>
            {descriptionLen}/{DESC_MAX}
          </span>
        </div>
        <textarea
          {...register("description", { maxLength: { value: DESC_MAX, message: `Максимум ${DESC_MAX} символов` } })}
          rows={3}
          maxLength={DESC_MAX}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
          placeholder="Краткое описание места"
        />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Теги</label>
        {Object.entries(groupedTags).map(([type, groupTags]) => (
          groupTags.length > 0 && (
            <div key={type} className="mb-3">
              <p className="text-xs font-medium text-zinc-500 mb-1.5">{groupNames[type]}</p>
              <div className="flex flex-wrap gap-1.5">
                {groupTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                      selectedTags.includes(tag.id)
                        ? type === "warning"
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                    )}
                  >
                    {tag.name_ru}
                  </button>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Телефон</label>
          <input {...register("phone")} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="+84..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Telegram</label>
          <input {...register("telegram")} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="@username" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Сайт</label>
        <input
          {...register("website")}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="https://example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Часы работы</label>
        <input {...register("working_hours")} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Пн-Сб 9:00-18:00" />
      </div>

      {requireBotProtection && (
        <TurnstileWidget
          onSuccess={(token) => {
            setTurnstileToken(token);
            setSubmitError("");
          }}
          onExpire={() => setTurnstileToken(null)}
        />
      )}

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Сохранение..." : submitLabel}
      </button>
    </form>
  );
}
