"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { MessageCircle, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";
import { feedbackSchema, type FeedbackInput } from "@/schemas";

const FEEDBACK_TYPES: { value: FeedbackInput["feedbackType"]; label: string }[] = [
  { value: "suggestion", label: "Предложение" },
  { value: "bug_report", label: "Сообщить об ошибке" },
  { value: "complaint", label: "Пожаловаться" },
];

type FeedbackFormValues = FeedbackInput & { website_url?: string };

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    defaultValues: {
      name: "",
      email: "",
      feedbackType: "suggestion",
      message: "",
      website_url: "",
    },
  });

  const handleClose = () => {
    setOpen(false);
    setSuccess(false);
    setSubmitError("");
    setTurnstileToken(null);
    reset();
  };

  const onValid = async (data: FeedbackFormValues) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
        throw new Error("Подтвердите, что вы не бот");
      }

      const payload = {
        name: data.name,
        email: data.email,
        feedbackType: data.feedbackType,
        message: data.message,
      };
      const parsed = feedbackSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Проверьте корректность заполнения формы");
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          website_url: data.website_url || "",
          turnstileToken,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error || "Не удалось отправить сообщение");
      }

      setSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось отправить сообщение");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Обратная связь"
        onClick={() => setOpen(true)}
        className="fixed bottom-28 left-4 z-[1100] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 md:bottom-6 md:left-auto md:right-6"
      >
        <MessageCircle className="h-7 w-7" aria-hidden />
      </button>

      <Modal isOpen={open} onClose={handleClose} title="Обратная связь" size="sm">
        {success ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-3 rounded-full bg-green-100 p-3">
              <Check className="h-6 w-6 text-green-600" aria-hidden />
            </div>
            <h3 className="text-base font-semibold text-zinc-900">Спасибо! Сообщение отправлено.</h3>
            <p className="mt-1 text-sm text-zinc-500">Мы свяжемся с вами при необходимости.</p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onValid)} className="space-y-4">
            <div>
              <label htmlFor="feedback-name" className="mb-1 block text-sm font-medium text-zinc-700">
                Имя *
              </label>
              <input
                id="feedback-name"
                type="text"
                autoComplete="name"
                {...register("name", { required: "Укажите имя" })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="feedback-email" className="mb-1 block text-sm font-medium text-zinc-700">
                Почта для обратной связи *
              </label>
              <input
                id="feedback-email"
                type="email"
                autoComplete="email"
                {...register("email", { required: "Укажите почту" })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="feedback-type" className="mb-1 block text-sm font-medium text-zinc-700">
                Тип обращения *
              </label>
              <select
                id="feedback-type"
                {...register("feedbackType", { required: "Выберите тип обращения" })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {FEEDBACK_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {errors.feedbackType && <p className="mt-1 text-xs text-red-500">{errors.feedbackType.message}</p>}
            </div>

            <div>
              <label htmlFor="feedback-message" className="mb-1 block text-sm font-medium text-zinc-700">
                Сообщение *
              </label>
              <textarea
                id="feedback-message"
                rows={4}
                {...register("message", { required: "Опишите обращение" })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Опишите ситуацию подробнее"
              />
              {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>}
            </div>

            <div className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden opacity-0" aria-hidden>
              <label htmlFor="feedback-honeypot">Сайт</label>
              <input
                id="feedback-honeypot"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                {...register("website_url")}
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

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
