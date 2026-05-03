"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { FilterChip } from "@/components/ui/filter-chip";
import type { Category, Tag, TagType } from "@/types";
import { cn } from "@/lib/cn";

interface FiltersPanelProps {
  categories: Category[];
  tags: Tag[];
  selectedCategory: string | null;
  selectedTags: string[];
  verifiedOnly: boolean;
  hasReviewsOnly: boolean;
  onCategoryChange: (id: string | null) => void;
  onTagToggle: (id: string) => void;
  onVerifiedToggle: () => void;
  onHasReviewsToggle: () => void;
  onReset: () => void;
  className?: string;
}

export function FiltersPanel({
  categories,
  tags,
  selectedCategory,
  selectedTags,
  verifiedOnly,
  hasReviewsOnly,
  onCategoryChange,
  onTagToggle,
  onVerifiedToggle,
  onHasReviewsToggle,
  onReset,
  className,
}: FiltersPanelProps) {
  const hasActiveFilters = selectedCategory || selectedTags.length > 0 || verifiedOnly || hasReviewsOnly;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    language: true,
    useful: true,
    food: true,
    service: false,
    warning: false,
    verified: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const tagGroups: Array<{ key: TagType; title: string; tags: Tag[] }> = [
    { key: "language", title: "Русскоязычность", tags: tags.filter((tag) => tag.tag_type === "language") },
    { key: "useful", title: "Полезность", tags: tags.filter((tag) => tag.tag_type === "useful") },
    { key: "food", title: "Еда", tags: tags.filter((tag) => tag.tag_type === "food") },
    { key: "service", title: "Сервис", tags: tags.filter((tag) => tag.tag_type === "service") },
    { key: "warning", title: "Предупреждения", tags: tags.filter((tag) => tag.tag_type === "warning") },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700">Фильтры</h3>
        {hasActiveFilters && (
          <button onClick={onReset} className="text-xs text-blue-600 hover:text-blue-700">
            Сбросить
          </button>
        )}
      </div>

      <AccordionSection
        title="Категории"
        isOpen={openSections.categories}
        onToggle={() => toggleSection("categories")}
      >
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <FilterChip
              key={cat.id}
              label={cat.name_ru}
              icon={cat.icon}
              active={selectedCategory === cat.id}
              onClick={() => onCategoryChange(selectedCategory === cat.id ? null : cat.id)}
              variant={cat.slug === "danger" ? "warning" : "default"}
            />
          ))}
        </div>
      </AccordionSection>

      {tagGroups.map(
        (group) =>
          group.tags.length > 0 && (
            <AccordionSection
              key={group.key}
              title={group.title}
              isOpen={!!openSections[group.key]}
              onToggle={() => toggleSection(group.key)}
            >
              <div className="flex flex-wrap gap-1.5">
                {group.tags.map((tag) => (
                  <FilterChip
                    key={tag.id}
                    label={tag.name_ru}
                    active={selectedTags.includes(tag.id)}
                    onClick={() => onTagToggle(tag.id)}
                    variant={tag.tag_type === "warning" ? "warning" : "default"}
                  />
                ))}
              </div>
            </AccordionSection>
          ),
      )}

      <AccordionSection
        title="Проверка"
        isOpen={openSections.verified}
        onToggle={() => toggleSection("verified")}
      >
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Только проверенные" active={verifiedOnly} onClick={onVerifiedToggle} />
          <FilterChip label="Только с отзывами" active={hasReviewsOnly} onClick={onHasReviewsToggle} />
        </div>
      </AccordionSection>
    </div>
  );
}

interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function AccordionSection({ title, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-zinc-700">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && <div className="border-t border-zinc-100 px-4 py-3">{children}</div>}
    </div>
  );
}
