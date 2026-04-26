"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { reportSchema, type ReportInput } from "@/schemas";
import type { EntityType } from "@/types";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";
import { Check } from "lucide-react";

const REASONS = [
  { value: "wrong_info", label: "Неверная информация" },
  { value: "spam", label: "Спам" },
  { value: "offensive", label: "Оскорбление" },
  { value: "duplicate", label: "Дубликат" },
  { value: "nonexistent", label: "Несуществующее место" },
  { value: "other", label: "Другое" },
] as const;

interface ReportFormProps {
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  onSuccess?: () => void;
}

export function ReportForm({ entityType, entityId, entityName, onSuccess }: ReportFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportInput>({
    defaultValues: { entity_type: entityType, entity_id: entityId },
  });

  const onValid = async (data: ReportInput) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
        throw new Error("Подтвердите, что вы не бот");
      }

      const parsed = reportSchema.safeParse(data);
      if (!parsed.success) return;
      const url = entityType === "place"
        ? `/api/places/${entityId}/report`
        : `/api/reviews/${entityId}/report`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, turnstileToken }),
      });
      if (res.ok) {
        setSuccess(true);
        onSuccess?.();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось отправить жалобу");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <div className="mb-3 rounded-full bg-green-100 p-3">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900">Жалоба отправлена</h3>
        <p className="mt-1 text-sm text-zinc-500">Мы рассмотрим её в ближайшее время.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      {entityName && (
        <p className="text-sm text-zinc-500">
          Жалоба на: <span className="font-medium text-zinc-800">{entityName}</span>
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Причина *</label>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={r.value}
                {...register("reason", { required: "Выберите причину" })}
                className="h-4 w-4 text-blue-600"
              />
              <span className="text-sm text-zinc-700">{r.label}</span>
            </label>
          ))}
        </div>
        {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Комментарий</label>
        <textarea
          {...register("comment")}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
          placeholder="Опишите подробнее (необязательно)"
        />
      </div>

      <TurnstileWidget
        onSuccess={(token) => {
          setTurnstileToken(token);
          setSubmitError("");
        }}
        onExpire={() => setTurnstileToken(null)}
      />

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Отправка..." : "Отправить жалобу"}
      </button>
    </form>
  );
}
