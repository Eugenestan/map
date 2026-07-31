"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import type { InterestingArticleCategory } from "@/types";

interface InterestingArticleCategoriesModalProps {
  isOpen: boolean;
  categories: InterestingArticleCategory[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onUnauthorized: () => void;
}

const fieldClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export function InterestingArticleCategoriesModal({
  isOpen,
  categories,
  onClose,
  onChanged,
  onUnauthorized,
}: InterestingArticleCategoriesModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setSortOrder(0);
    setIsActive(true);
    setError("");
  };

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]);

  const edit = (category: InterestingArticleCategory) => {
    setEditingId(category.id);
    setName(category.name_ru);
    setSlug(category.slug);
    setDescription(category.description || "");
    setSortOrder(category.sort_order);
    setIsActive(category.is_active);
    setError("");
  };

  const request = async (url: string, method: string, payload?: object) => {
    const response = await fetch(url, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (response.status === 401) {
      onUnauthorized();
      return false;
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || "Не удалось изменить категорию");
    return true;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Категории интересных статей" size="lg">
      <div className="space-y-5">
        <form
          className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setError("");
            try {
              const url = editingId
                ? `/api/admin/interesting-article-categories/${editingId}`
                : "/api/admin/interesting-article-categories";
              const ok = await request(url, editingId ? "PATCH" : "POST", {
                name_ru: name.trim(),
                slug: slug.trim() || undefined,
                description: description.trim() || null,
                sort_order: sortOrder,
                is_active: isActive,
              });
              if (ok) {
                await onChanged();
                reset();
              }
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить категорию");
            } finally {
              setSaving(false);
            }
          }}
        >
          <h3 className="text-sm font-semibold text-zinc-800">{editingId ? "Редактирование категории" : "Новая категория"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Название *</label>
              <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} minLength={2} maxLength={100} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Slug</label>
              <input value={slug} onChange={(event) => setSlug(event.target.value)} className={fieldClass} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="Автоматически из названия" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">Описание</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className={fieldClass} rows={2} maxLength={1000} />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Порядок</label>
              <input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} className="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm" min={0} max={100000} />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-zinc-700">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Активна
            </label>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Сохранение..." : editingId ? "Сохранить" : "Добавить"}
            </button>
            {editingId && (
              <button type="button" onClick={reset} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
                Отмена
              </button>
            )}
          </div>
        </form>

        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">Категорий пока нет</p>
          ) : categories.map((category) => (
            <div key={category.id} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-zinc-900">{category.name_ru}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${category.is_active ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {category.is_active ? "Активна" : "Скрыта"}
                  </span>
                  <span className="text-xs text-zinc-400">#{category.sort_order}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">/{category.slug}</p>
                {category.description && <p className="mt-1 text-sm text-zinc-600">{category.description}</p>}
              </div>
              <div className="flex flex-shrink-0 flex-wrap justify-end gap-1.5">
                <button type="button" onClick={() => edit(category)} className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50">
                  Изменить
                </button>
                <button
                  type="button"
                  disabled={busyId === category.id}
                  onClick={async () => {
                    setBusyId(category.id);
                    setError("");
                    try {
                      if (await request(`/api/admin/interesting-article-categories/${category.id}`, "PATCH", { is_active: !category.is_active })) {
                        await onChanged();
                      }
                    } catch (toggleError) {
                      setError(toggleError instanceof Error ? toggleError.message : "Не удалось изменить категорию");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {category.is_active ? "Скрыть" : "Показать"}
                </button>
                <button
                  type="button"
                  disabled={busyId === category.id}
                  onClick={async () => {
                    if (!confirm(`Удалить категорию «${category.name_ru}»?`)) return;
                    setBusyId(category.id);
                    setError("");
                    try {
                      if (await request(`/api/admin/interesting-article-categories/${category.id}`, "DELETE")) {
                        await onChanged();
                        if (editingId === category.id) reset();
                      }
                    } catch (deleteError) {
                      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить категорию");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
