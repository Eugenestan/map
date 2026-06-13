"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { Category, PlaceListItem, Tag, TagType } from "@/types";
import { cn } from "@/lib/cn";

interface ArticlesFiltersProps {
  search: string;
  selectedPlace: string;
  selectedCategory: string;
  selectedTags: string[];
  places: PlaceListItem[];
  categories: Category[];
  tags: Tag[];
  totalCount: number;
  hasFilters: boolean;
}

const TAG_GROUPS: Array<{ key: TagType; title: string }> = [
  { key: "language", title: "Русскоязычность" },
  { key: "useful", title: "Полезность" },
  { key: "food", title: "Еда" },
  { key: "service", title: "Сервис" },
  { key: "warning", title: "Предупреждения" },
];

export function ArticlesFilters({
  search,
  selectedPlace,
  selectedCategory,
  selectedTags,
  places,
  categories,
  tags,
  totalCount,
  hasFilters,
}: ArticlesFiltersProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localPlace, setLocalPlace] = useState<string>(selectedPlace);
  const [localCategory, setLocalCategory] = useState<string>(selectedCategory);
  const [localTags, setLocalTags] = useState<string[]>(selectedTags);
  const formRef = useRef<HTMLFormElement>(null);

  const groupedTags = useMemo(
    () =>
      TAG_GROUPS.map((group) => ({
        ...group,
        tags: tags.filter((tag) => tag.tag_type === group.key),
      })).filter((group) => group.tags.length > 0),
    [tags],
  );

  const toggleTag = (tagId: string) => {
    setLocalTags((prev) => (prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]));
  };

  const handleResetInModal = () => {
    setLocalPlace("");
    setLocalCategory("");
    setLocalTags([]);
  };

  const activeFilterCount =
    (localPlace ? 1 : 0) + (localCategory ? 1 : 0) + localTags.length;

  return (
    <>
      <form ref={formRef} action="/articles" className="space-y-2">
        {/* Hidden inputs sync filter state from the modal into the form */}
        {localPlace && <input type="hidden" name="place" value={localPlace} />}
        {localCategory && <input type="hidden" name="category" value={localCategory} />}
        {localTags.map((tagId) => (
          <input key={tagId} type="hidden" name="tags" value={tagId} />
        ))}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              name="q"
              defaultValue={search}
              placeholder="Поиск по всем местам..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex flex-row gap-2 sm:w-36 sm:flex-col">
            <button
              type="submit"
              className="h-11 flex-1 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:flex-none"
            >
              Найти
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors sm:flex-none",
                activeFilterCount > 0
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Фильтры
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
            <span className="text-zinc-500">Найдено: {totalCount}</span>
            <Link
              href="/articles"
              className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-700"
            >
              <X className="h-4 w-4" />
              Сбросить фильтры
            </Link>
          </div>
        )}
      </form>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Фильтры"
        size="lg"
      >
        <div className="space-y-5">
          {categories.length > 0 && (
            <FilterSection title="Категории">
              <div className="flex flex-wrap gap-1.5">
                {categories.map((category) => {
                  const checked = localCategory === category.id;
                  const isDanger = category.slug === "danger";
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setLocalCategory(checked ? "" : category.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        checked
                          ? isDanger
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
                      )}
                    >
                      <span aria-hidden="true">{category.icon}</span>
                      {category.name_ru}
                    </button>
                  );
                })}
              </div>
            </FilterSection>
          )}

          <FilterSection title="Место">
            <select
              value={localPlace}
              onChange={(event) => setLocalPlace(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Все места</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.title}
                </option>
              ))}
            </select>
          </FilterSection>

          {groupedTags.map((group) => (
            <FilterSection key={group.key} title={group.title}>
              <div className="flex flex-wrap gap-1.5">
                {group.tags.map((tag) => {
                  const checked = localTags.includes(tag.id);
                  const isWarning = tag.tag_type === "warning";
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        checked
                          ? isWarning
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
                      )}
                    >
                      {tag.name_ru}
                    </button>
                  );
                })}
              </div>
            </FilterSection>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={() => {
              setIsModalOpen(false);
              formRef.current?.requestSubmit();
            }}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Применить
          </button>
          <button
            type="button"
            onClick={handleResetInModal}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Сбросить
          </button>
          {activeFilterCount > 0 && (
            <span className="ml-auto text-sm text-zinc-500">Выбрано: {activeFilterCount}</span>
          )}
        </div>
      </Modal>
    </>
  );
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
