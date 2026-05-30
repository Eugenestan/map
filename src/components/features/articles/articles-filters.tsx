"use client";

import Link from "next/link";
import { useRef } from "react";
import type { PlaceListItem, Tag } from "@/types";

interface ArticlesFiltersProps {
  search: string;
  selectedPlace: string;
  selectedTags: string[];
  places: PlaceListItem[];
  tags: Tag[];
  articlesCount: number;
  hasFilters: boolean;
}

export function ArticlesFilters({
  search,
  selectedPlace,
  selectedTags,
  places,
  tags,
  articlesCount,
  hasFilters,
}: ArticlesFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action="/articles" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Поиск</span>
          <input
            name="q"
            defaultValue={search}
            placeholder="Название или текст места"
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Место</span>
          <select
            name="place"
            defaultValue={selectedPlace}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Все места</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Найти
        </button>
      </div>

      <div className="mt-5 border-t border-zinc-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Теги</p>
        <div className="mt-2 flex flex-col gap-2">
          {tags.map((tag) => {
            const checked = selectedTags.includes(tag.id);
            return (
              <label key={tag.id} className="block cursor-pointer">
                <input
                  type="checkbox"
                  name="tags"
                  value={tag.id}
                  defaultChecked={checked}
                  onChange={() => formRef.current?.requestSubmit()}
                  className="peer sr-only"
                />
                <span className="block rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 peer-checked:border-blue-300 peer-checked:bg-blue-50 peer-checked:text-blue-700 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-100">
                  {tag.name_ru}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
          <span className="block text-zinc-500">Найдено мест: {articlesCount}</span>
          <Link href="/articles" className="font-medium text-blue-600 hover:text-blue-700">
            Сбросить фильтры
          </Link>
        </div>
      )}
    </form>
  );
}
