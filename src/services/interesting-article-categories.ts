import { v4 as uuid } from "uuid";
import { execute, isDatabaseConfigured, normalizeBoolean, normalizeTimestamp } from "@/lib/db";
import {
  deleteDevInterestingArticleCategory,
  getDevInterestingArticleCategoryById,
  insertDevInterestingArticleCategory,
  listDevInterestingArticleCategories,
  listDevInterestingArticles,
  updateDevInterestingArticleCategory,
} from "@/lib/dev-store";
import type { CreateInterestingArticleCategoryInput, UpdateInterestingArticleCategoryInput } from "@/schemas";
import type { InterestingArticleCategory } from "@/types";

interface CategoryRow {
  id: string;
  slug: string;
  name_ru: string;
  description: string | null;
  sort_order: number;
  is_active: boolean | number | string;
  created_at: string | Date;
  updated_at: string | Date;
}

function mapCategory(row: CategoryRow): InterestingArticleCategory {
  return {
    ...row,
    sort_order: Number(row.sort_order),
    is_active: normalizeBoolean(row.is_active),
    created_at: normalizeTimestamp(row.created_at) || new Date(0).toISOString(),
    updated_at: normalizeTimestamp(row.updated_at) || new Date(0).toISOString(),
  };
}

const RU_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((char) => RU_TO_LAT[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

async function categorySlugExists(slug: string, excludeId?: string): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return listDevInterestingArticleCategories().some((item) => item.slug === slug && item.id !== excludeId);
  }
  const rows = await execute<{ id: string }>(
    "SELECT id FROM interesting_article_categories WHERE slug = $1 AND ($2::text IS NULL OR id <> $2) LIMIT 1",
    [slug, excludeId || null],
  );
  return rows.length > 0;
}

async function uniqueCategorySlug(value: string, excludeId?: string): Promise<string> {
  const base = slugify(value) || "category";
  let candidate = base;
  let suffix = 2;
  while (await categorySlugExists(candidate, excludeId)) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

export async function getInterestingArticleCategories(options: { includeInactive?: boolean } = {}) {
  if (!isDatabaseConfigured()) {
    return [...listDevInterestingArticleCategories()]
      .filter((item) => options.includeInactive || item.is_active)
      .sort((a, b) => a.sort_order - b.sort_order || a.name_ru.localeCompare(b.name_ru));
  }
  const where = options.includeInactive ? "" : "WHERE is_active = TRUE";
  const rows = await execute<CategoryRow>(
    `SELECT * FROM interesting_article_categories ${where} ORDER BY sort_order, name_ru`,
  );
  return rows.map(mapCategory);
}

export async function getInterestingArticleCategoryById(id: string) {
  if (!isDatabaseConfigured()) return getDevInterestingArticleCategoryById(id);
  const rows = await execute<CategoryRow>("SELECT * FROM interesting_article_categories WHERE id = $1 LIMIT 1", [id]);
  return rows[0] ? mapCategory(rows[0]) : null;
}

export async function createInterestingArticleCategory(data: CreateInterestingArticleCategoryInput) {
  const id = uuid();
  const slug = await uniqueCategorySlug(data.slug || data.name_ru);
  const now = new Date().toISOString();
  const category: InterestingArticleCategory = {
    id,
    slug,
    name_ru: data.name_ru,
    description: data.description || null,
    sort_order: data.sort_order,
    is_active: data.is_active,
    created_at: now,
    updated_at: now,
  };

  if (!isDatabaseConfigured()) {
    insertDevInterestingArticleCategory(category);
    return category;
  }
  const rows = await execute<CategoryRow>(
    `INSERT INTO interesting_article_categories
      (id, slug, name_ru, description, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, slug, data.name_ru, data.description || null, data.sort_order, data.is_active],
  );
  return mapCategory(rows[0]);
}

export async function updateInterestingArticleCategory(id: string, data: UpdateInterestingArticleCategoryInput) {
  const existing = await getInterestingArticleCategoryById(id);
  if (!existing) return null;
  const slug = data.slug ? await uniqueCategorySlug(data.slug, id) : existing.slug;
  const updated: InterestingArticleCategory = {
    ...existing,
    ...data,
    slug,
    description: data.description === undefined ? existing.description : data.description || null,
    updated_at: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    updateDevInterestingArticleCategory(id, () => updated);
    return updated;
  }
  const rows = await execute<CategoryRow>(
    `UPDATE interesting_article_categories
     SET slug = $1, name_ru = $2, description = $3, sort_order = $4, is_active = $5, updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [updated.slug, updated.name_ru, updated.description, updated.sort_order, updated.is_active, id],
  );
  return rows[0] ? mapCategory(rows[0]) : null;
}

export async function deleteInterestingArticleCategory(id: string): Promise<"deleted" | "not_found" | "in_use"> {
  const existing = await getInterestingArticleCategoryById(id);
  if (!existing) return "not_found";
  if (!isDatabaseConfigured()) {
    if (listDevInterestingArticles().some((article) => article.category_id === id)) return "in_use";
    deleteDevInterestingArticleCategory(id);
    return "deleted";
  }
  const usage = await execute<{ total: string | number }>(
    "SELECT COUNT(*)::bigint AS total FROM interesting_articles WHERE category_id = $1",
    [id],
  );
  if (Number(usage[0]?.total) > 0) return "in_use";
  await execute("DELETE FROM interesting_article_categories WHERE id = $1", [id]);
  return "deleted";
}
