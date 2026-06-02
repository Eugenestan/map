"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { AddPlaceInput } from "@/schemas";
import type { Category, Tag } from "@/types";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";
import { MapPin, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/** Поля формы без координат — lat/lng обрабатываются отдельным полем. */
type AddPlaceFormFields = Omit<AddPlaceInput, "lat" | "lng">;

const formatCoordinates = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

const parseCoordinate = (value: string) => {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseCoordinatesInput = (value: string): [number, number] | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const spaceParts = trimmed.split(/\s+/).filter(Boolean);
  const parts = spaceParts.length === 2 ? spaceParts : trimmed.split(/[;,]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2) {
    return null;
  }

  const lat = parseCoordinate(parts[0]);
  const lng = parseCoordinate(parts[1]);
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }

  return [lat, lng];
};

interface AddPlaceFormProps {
  lat?: number;
  lng?: number;
  onSubmit: (data: AddPlaceInput, meta?: { turnstileToken?: string | null }) => Promise<void>;
  onPickLocation?: () => void;
  onCoordinatesChange?: (lat: number, lng: number) => void;
  /** Сохранить введённые данные перед выбором точки на карте (родитель подставит их в initialValues). */
  onBeforePickLocation?: (snapshot: Partial<AddPlaceFormFields>) => void;
  initialValues?: Partial<AddPlaceFormFields>;
  submitLabel?: string;
  successTitle?: string;
  successDescription?: string;
  showSuccessState?: boolean;
  requireBotProtection?: boolean;
  infoField?: ReactNode;
  secondaryAction?: ReactNode;
}

export function AddPlaceForm({
  lat,
  lng,
  onSubmit,
  onPickLocation,
  onCoordinatesChange,
  onBeforePickLocation,
  initialValues,
  submitLabel = "Отправить на модерацию",
  successTitle = "Место отправлено!",
  successDescription = "После модерации оно появится на карте.",
  showSuccessState = true,
  requireBotProtection = true,
  infoField,
  secondaryAction,
}: AddPlaceFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialValues?.tags || []);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [coordinateInput, setCoordinateInput] = useState(() =>
    typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)
      ? formatCoordinates(lat, lng)
      : "",
  );
  const [coordinateError, setCoordinateError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<AddPlaceFormFields>({
    defaultValues: {
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
    if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
      setCoordinateInput(formatCoordinates(lat, lng));
      setCoordinateError("");
      return;
    }

    setCoordinateInput("");
    setCoordinateError("");
  }, [lat, lng]);

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
  }, [initialValues, setValue]);

  const descriptionLen = (watch("description") || "").length;
  const DESC_MAX = 400;

  const openLocationPicker = () => {
    onBeforePickLocation?.(getValues());
    onPickLocation?.();
  };

  const handleCoordinateInputChange = (value: string) => {
    setCoordinateInput(value);
    setSubmitError("");

    if (!value.trim()) {
      setCoordinateError("");
      return;
    }

    const parsed = parseCoordinatesInput(value);
    if (!parsed) {
      setCoordinateError("Введите координаты в формате 12.24646, 109.19218");
      return;
    }

    setCoordinateError("");
    onCoordinatesChange?.(parsed[0], parsed[1]);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId];
      setValue("tags", next);
      return next;
    });
  };

  const onValid = async (data: AddPlaceFormFields) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      if (requireBotProtection && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
        throw new Error("Подтвердите, что вы не бот");
      }

      const parsedCoordinates = parseCoordinatesInput(coordinateInput);
      if (!parsedCoordinates) {
        setCoordinateError("Введите координаты в формате 12.24646, 109.19218");
        setSubmitError("Укажите точку на карте или введите координаты вручную");
        return;
      }

      const title = (data.title ?? "").trim();
      if (title.length < 2) {
        setSubmitError("Название должно быть не менее 2 символов");
        return;
      }
      const category_id = (data.category_id ?? "").trim();
      if (!category_id) {
        setSubmitError("Выберите категорию");
        return;
      }
      const description = (data.description ?? "").trim();
      if (description.length > 400) {
        setSubmitError("Описание не длиннее 400 символов");
        return;
      }
      const tags = Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === "string") : [];
      const opt = (s: string | undefined) => {
        const t = (s ?? "").trim();
        return t.length > 0 ? t : undefined;
      };
      const payload: AddPlaceInput = {
        title,
        category_id,
        lat: parsedCoordinates[0],
        lng: parsedCoordinates[1],
        address_text: opt(data.address_text),
        description: description.length > 0 ? description : undefined,
        tags: tags.length > 0 ? tags : undefined,
        phone: opt(data.phone),
        website: opt(data.website),
        telegram: opt(data.telegram),
        working_hours: opt(data.working_hours),
      };
      await onSubmit(payload, { turnstileToken });
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
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
            coordinateError
              ? "border-red-300 bg-red-50 text-red-700"
              : parseCoordinatesInput(coordinateInput)
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-zinc-200 bg-white text-zinc-600",
          )}
        >
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <input
            value={coordinateInput}
            onChange={(event) => handleCoordinateInputChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-400"
            placeholder="12.24646, 109.19218"
            inputMode="decimal"
          />
          <button
            type="button"
            onClick={openLocationPicker}
            className={cn(
              "ml-auto flex-shrink-0 text-xs underline cursor-pointer",
              coordinateError ? "text-red-700" : "text-green-700",
            )}
          >
            {coordinateInput ? "Изменить" : "Выбрать"}
          </button>
        </div>
        {coordinateError && <p className="text-xs text-red-500 mt-1">{coordinateError}</p>}
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

      {infoField}

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
          <input
            {...register("telegram", {
              validate: (v) => {
                const t = (v ?? "").trim();
                if (t.length === 0) return true;
                return t.startsWith("@") || "Начните с @ (например @username)";
              },
            })}
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2",
              errors.telegram
                ? "border-red-500 bg-red-50/50 focus:border-red-500 focus:ring-red-100"
                : "border-zinc-200 focus:border-blue-400 focus:ring-blue-100",
            )}
            placeholder="@username"
          />
          {errors.telegram && <p className="mt-1 text-xs text-red-500">{errors.telegram.message}</p>}
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
      {secondaryAction}
    </form>
  );
}
