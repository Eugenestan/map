"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { addReviewSchema, type AddReviewInput } from "@/schemas";
import type { Tag } from "@/types";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface AddReviewFormProps {
  placeId: string;
  placeName: string;
  onSuccess?: () => void;
  onSubmit?: (data: AddReviewInput, meta?: { turnstileToken?: string | null }) => Promise<void>;
  initialValues?: Partial<AddReviewInput>;
  submitLabel?: string;
  successTitle?: string;
  successDescription?: string;
  maxTags?: number;
  showSuccessState?: boolean;
  requireBotProtection?: boolean;
}

export function AddReviewForm({
  placeId,
  placeName,
  onSuccess,
  onSubmit,
  initialValues,
  submitLabel = "Отправить отзыв",
  successTitle = "Отзыв отправлен!",
  successDescription = "Спасибо! После модерации он появится на странице.",
  maxTags = 3,
  showSuccessState = true,
  requireBotProtection = true,
}: AddReviewFormProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialValues?.tags || []);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [charCount, setCharCount] = useState(initialValues?.text?.length || 0);
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AddReviewInput>({
    defaultValues: {
      place_id: placeId,
      text: initialValues?.text || "",
      tags: initialValues?.tags || [],
      visit_period: initialValues?.visit_period || "",
      author_name: initialValues?.author_name || "",
    },
  });

  useEffect(() => {
    fetch("/api/tags").then((r) => r.json()).then((d) => setTags(d.data || []));
  }, []);

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    setSelectedTags(initialValues.tags || []);
    setCharCount(initialValues.text?.length || 0);
    setValue("text", initialValues.text || "");
    setValue("tags", initialValues.tags || []);
    setValue("visit_period", initialValues.visit_period || "");
    setValue("author_name", initialValues.author_name || "");
  }, [initialValues, setValue]);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        const next = prev.filter((t) => t !== tagId);
        setValue("tags", next);
        return next;
      }
      if (prev.length >= maxTags) return prev;
      const next = [...prev, tagId];
      setValue("tags", next);
      return next;
    });
  };

  const onValid = async (data: AddReviewInput) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      if (requireBotProtection && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
        throw new Error("Подтвердите, что вы не бот");
      }

      const parsed = addReviewSchema.safeParse(data);
      if (!parsed.success) return;
      if (onSubmit) {
        await onSubmit(parsed.data, { turnstileToken });
        if (showSuccessState) {
          setSuccess(true);
        }
        onSuccess?.();
        return;
      }

      const response = await fetch(`/api/places/${placeId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, turnstileToken }),
      });
      if (response.ok) {
        if (showSuccessState) {
          setSuccess(true);
        }
        onSuccess?.();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось сохранить отзыв");
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccessState && success) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="mb-3 rounded-full bg-green-100 p-3">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900">{successTitle}</h3>
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
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <p className="text-sm text-zinc-500">Отзыв о: <span className="font-medium text-zinc-800">{placeName}</span></p>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Ваш отзыв *</label>
        <textarea
          {...register("text", {
            required: "Напишите отзыв",
            minLength: { value: 5, message: "Минимум 5 символов" },
            maxLength: { value: 500, message: "Максимум 500 символов" },
            onChange: (e) => setCharCount(e.target.value.length),
          })}
          rows={4}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
          placeholder="Поделитесь своим опытом..."
        />
        <div className="flex justify-between mt-1">
          {errors.text ? <p className="text-xs text-red-500">{errors.text.message}</p> : <span />}
          <span className={cn("text-xs", charCount > 450 ? "text-red-500" : "text-zinc-400")}>{charCount}/500</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Теги (до {maxTags})</label>
        <div className="space-y-3">
          {Object.entries(groupedTags).map(([type, groupTags]) => (
            groupTags.length > 0 && (
              <div key={type}>
                <p className="mb-1.5 text-xs font-medium text-zinc-500">{groupNames[type]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {groupTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                        selectedTags.includes(tag.id)
                          ? tag.tag_type === "warning"
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Период посещения</label>
          <input
            {...register("visit_period")}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
            placeholder="Март 2026"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Ваше имя</label>
          <input
            {...register("author_name")}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
            placeholder="Необязательно"
          />
        </div>
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
