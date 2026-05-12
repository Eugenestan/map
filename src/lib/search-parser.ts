import { CATEGORIES, TAGS } from "@/data/seed";

export interface SearchIntent {
  categories: string[];
  tags: string[];
  keywords: string[];
}

const KEYWORD_MAP: Record<string, { categories?: string[]; tags?: string[] }> = {
  "врач": { categories: ["cat-1"], tags: ["tag-1"] },
  "доктор": { categories: ["cat-1"], tags: ["tag-1"] },
  "клиника": { categories: ["cat-1"] },
  "аптека": { categories: ["cat-2"] },
  "лекарства": { categories: ["cat-2"] },
  "еда": { categories: ["cat-3"] },
  "ресторан": { categories: ["cat-3"] },
  "кафе": { categories: ["cat-3"] },
  "магазин": { categories: ["cat-4"] },
  "гид": { categories: ["cat-5"], tags: ["tag-4"] },
  "экскурсия": { categories: ["cat-5"] },
  "экскурсии": { categories: ["cat-5"] },
  "отель": { categories: ["cat-6"] },
  "жильё": { categories: ["cat-6"] },
  "обмен": { categories: ["cat-7"] },
  "валюта": { categories: ["cat-7"] },
  "деньги": { categories: ["cat-7"] },
  "транспорт": { categories: ["cat-8"] },
  "байк": { categories: ["cat-8"] },
  "скутер": { categories: ["cat-8"] },
  "аренда": { categories: ["cat-8"] },
  "спортзал": { categories: ["cat-14"] },
  "спорт": { categories: ["cat-14"] },
  "фитнес": { categories: ["cat-14"] },
  "тренажерный": { categories: ["cat-14"] },
  "йога": { categories: ["cat-14"] },
  "красота": { categories: ["cat-9"] },
  "салон": { categories: ["cat-9"] },
  "маникюр": { categories: ["cat-9"] },
  "массаж": { categories: ["cat-9"] },
  "опасно": { categories: ["cat-10"], tags: ["tag-12"] },
  "опасная": { categories: ["cat-10"], tags: ["tag-12"] },
  "русский": { tags: ["tag-2"] },
  "русская": { tags: ["tag-2"] },
  "русское": { tags: ["tag-2"] },
  "по-русски": { tags: ["tag-2"] },
  "меню на русском": { tags: ["tag-3"] },
  "русский врач": { categories: ["cat-1"], tags: ["tag-1"] },
  "обман": { tags: ["tag-13"] },
  "мошенники": { tags: ["tag-13"] },
  "дорого": { tags: ["tag-14"] },
  "карта": { tags: ["tag-17"] },
  "наличка": { tags: ["tag-18"] },
  "доставка": { tags: ["tag-19"] },
  "дети": { tags: ["tag-11"] },
  "семья": { tags: ["tag-8"] },
};

export function parseSearchQuery(query: string): SearchIntent {
  const normalized = query.toLowerCase().trim();
  const categories = new Set<string>();
  const tags = new Set<string>();
  const keywords: string[] = [];

  // Multi-word matches first
  const sortedKeys = Object.keys(KEYWORD_MAP).sort((a, b) => b.length - a.length);
  let remaining = normalized;

  for (const key of sortedKeys) {
    if (remaining.includes(key)) {
      const map = KEYWORD_MAP[key];
      map.categories?.forEach((c) => categories.add(c));
      map.tags?.forEach((t) => tags.add(t));
      remaining = remaining.replace(key, " ").trim();
    }
  }

  // Match by category/tag name
  for (const cat of CATEGORIES) {
    if (normalized.includes(cat.name_ru.toLowerCase())) {
      categories.add(cat.id);
    }
  }
  for (const tag of TAGS) {
    if (normalized.includes(tag.name_ru.toLowerCase())) {
      tags.add(tag.id);
    }
  }

  if (remaining.trim()) {
    keywords.push(remaining.trim());
  }
  if (categories.size === 0 && tags.size === 0) {
    keywords.push(normalized);
  }

  return {
    categories: [...categories],
    tags: [...tags],
    keywords: [...new Set(keywords)],
  };
}
