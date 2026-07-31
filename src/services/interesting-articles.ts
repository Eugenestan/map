import { v4 as uuid } from "uuid";
import sanitizeHtml from "sanitize-html";
import { execute, isDatabaseConfigured, normalizeBoolean, normalizeTimestamp, withTransaction } from "@/lib/db";
import {
  deleteDevInterestingArticle,
  getDevInterestingArticleCategoryById,
  getDevPlaceById,
  getDevInterestingArticleById,
  insertDevInterestingArticle,
  listDevInterestingArticleCategories,
  listDevInterestingArticles,
  updateDevInterestingArticle,
} from "@/lib/dev-store";
import { deleteObjectsByUrls, isS3Configured } from "@/lib/s3";
import type { CreateInterestingArticleInput, UpdateInterestingArticleInput } from "@/schemas";
import type {
  InterestingArticle,
  InterestingArticleCategory,
  InterestingArticleStatus,
  InterestingArticleWithCategory,
  PaginatedResult,
} from "@/types";

export interface InterestingArticleFilters {
  search?: string;
  categoryId?: string;
  placeId?: string;
  status?: InterestingArticleStatus;
  limit?: number;
  offset?: number;
}

export class InterestingArticleReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterestingArticleReferenceError";
  }
}

interface ArticleRow {
  id: string;
  category_id: string;
  status: InterestingArticleStatus;
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  cover_image_url: string | null;
  media_urls: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  published_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  place_ids: string[] | null;
  category_slug: string;
  category_name_ru: string;
  category_description: string | null;
  category_sort_order: number;
  category_is_active: boolean | number | string;
  category_created_at: string | Date;
  category_updated_at: string | Date;
}

const ARTICLE_SELECT = `
  SELECT a.*,
    COALESCE(ARRAY(
      SELECT iap.place_id FROM interesting_article_places iap
      WHERE iap.article_id = a.id ORDER BY iap.place_id
    ), '{}') AS place_ids,
    c.slug AS category_slug,
    c.name_ru AS category_name_ru,
    c.description AS category_description,
    c.sort_order AS category_sort_order,
    c.is_active AS category_is_active,
    c.created_at AS category_created_at,
    c.updated_at AS category_updated_at
  FROM interesting_articles a
  JOIN interesting_article_categories c ON c.id = a.category_id
`;

function mapRow(row: ArticleRow): InterestingArticleWithCategory {
  const category: InterestingArticleCategory = {
    id: row.category_id,
    slug: row.category_slug,
    name_ru: row.category_name_ru,
    description: row.category_description,
    sort_order: Number(row.category_sort_order),
    is_active: normalizeBoolean(row.category_is_active),
    created_at: normalizeTimestamp(row.category_created_at) || new Date(0).toISOString(),
    updated_at: normalizeTimestamp(row.category_updated_at) || new Date(0).toISOString(),
  };
  return {
    id: row.id,
    category_id: row.category_id,
    status: row.status,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content_html: row.content_html,
    cover_image_url: row.cover_image_url,
    media_urls: row.media_urls || [],
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    seo_keywords: row.seo_keywords || [],
    published_at: normalizeTimestamp(row.published_at),
    created_at: normalizeTimestamp(row.created_at) || new Date(0).toISOString(),
    updated_at: normalizeTimestamp(row.updated_at) || new Date(0).toISOString(),
    place_ids: row.place_ids || [],
    category,
  };
}

function attachDevCategory(article: InterestingArticle): InterestingArticleWithCategory | null {
  const category = listDevInterestingArticleCategories().find((item) => item.id === article.category_id);
  return category ? { ...article, category } : null;
}

async function validateReferences(categoryId: string, placeIds: string[]) {
  const uniquePlaceIds = [...new Set(placeIds)];
  if (!isDatabaseConfigured()) {
    if (!getDevInterestingArticleCategoryById(categoryId)) {
      throw new InterestingArticleReferenceError("Категория интересной статьи не найдена");
    }
    const missingPlaceIds = uniquePlaceIds.filter((id) => !getDevPlaceById(id));
    if (missingPlaceIds.length) {
      throw new InterestingArticleReferenceError(`Места не найдены: ${missingPlaceIds.join(", ")}`);
    }
    return;
  }

  const categories = await execute<{ id: string }>(
    "SELECT id FROM interesting_article_categories WHERE id = $1 LIMIT 1",
    [categoryId],
  );
  if (!categories.length) {
    throw new InterestingArticleReferenceError("Категория интересной статьи не найдена");
  }
  if (!uniquePlaceIds.length) return;

  const places = await execute<{ id: string }>(
    "SELECT id FROM places WHERE id = ANY($1::text[])",
    [uniquePlaceIds],
  );
  const foundIds = new Set(places.map((place) => place.id));
  const missingPlaceIds = uniquePlaceIds.filter((id) => !foundIds.has(id));
  if (missingPlaceIds.length) {
    throw new InterestingArticleReferenceError(`Места не найдены: ${missingPlaceIds.join(", ")}`);
  }
}

const ARTICLE_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "h4", "blockquote", "ul", "ol", "li", "strong", "em", "b", "i", "u",
    "s", "a", "img", "figure", "figcaption", "code", "pre", "hr",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  transformTags: {
    a: (_tagName, attributes) => ({
      tagName: "a",
      attribs: {
        ...attributes,
        ...(attributes.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
      },
    }),
  },
};

export function sanitizeInterestingArticleHtml(html: string): string {
  return sanitizeHtml(html, ARTICLE_HTML_OPTIONS).trim();
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

async function articleSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return listDevInterestingArticles().some((item) => item.slug === slug && item.id !== excludeId);
  }
  const rows = await execute<{ id: string }>(
    "SELECT id FROM interesting_articles WHERE slug = $1 AND ($2::text IS NULL OR id <> $2) LIMIT 1",
    [slug, excludeId || null],
  );
  return rows.length > 0;
}

async function uniqueArticleSlug(value: string, excludeId?: string): Promise<string> {
  const base = slugify(value) || "article";
  let candidate = base;
  let suffix = 2;
  while (await articleSlugExists(candidate, excludeId)) candidate = `${base}-${suffix++}`;
  return candidate;
}

function normalizeFilters(filters: InterestingArticleFilters) {
  return {
    search: filters.search?.trim() || undefined,
    categoryId: filters.categoryId?.trim() || undefined,
    placeId: filters.placeId?.trim() || undefined,
    status: filters.status,
    limit: Math.min(Math.max(filters.limit || 20, 1), 100),
    offset: Math.max(filters.offset || 0, 0),
  };
}

function filterDev(filters: InterestingArticleFilters, publicOnly: boolean) {
  const normalized = normalizeFilters(filters);
  let items = listDevInterestingArticles()
    .map(attachDevCategory)
    .filter((item): item is InterestingArticleWithCategory => Boolean(item));
  if (publicOnly) items = items.filter((item) => item.status === "published" && item.category.is_active);
  else if (normalized.status) items = items.filter((item) => item.status === normalized.status);
  if (normalized.categoryId) items = items.filter((item) => item.category_id === normalized.categoryId);
  if (normalized.placeId) items = items.filter((item) => item.place_ids.includes(normalized.placeId!));
  if (normalized.search) {
    const query = normalized.search.toLowerCase();
    items = items.filter((item) =>
      [item.title, item.excerpt, item.content_html].some((value) => value.toLowerCase().includes(query)),
    );
  }
  return items.sort((a, b) =>
    (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at),
  );
}

function buildWhere(filters: InterestingArticleFilters, publicOnly: boolean) {
  const normalized = normalizeFilters(filters);
  const conditions: string[] = [];
  const params: unknown[] = [];
  const add = (condition: (index: number) => string, value: unknown) => {
    params.push(value);
    conditions.push(condition(params.length));
  };
  if (publicOnly) {
    conditions.push("a.status = 'published'");
    conditions.push("c.is_active = TRUE");
  } else if (normalized.status) {
    add((index) => `a.status = $${index}`, normalized.status);
  }
  if (normalized.categoryId) add((index) => `a.category_id = $${index}`, normalized.categoryId);
  if (normalized.placeId) {
    add(
      (index) => `EXISTS (
        SELECT 1 FROM interesting_article_places filter_iap
        WHERE filter_iap.article_id = a.id AND filter_iap.place_id = $${index}
      )`,
      normalized.placeId,
    );
  }
  if (normalized.search) {
    add(
      (index) => `(a.title ILIKE $${index} OR a.excerpt ILIKE $${index} OR a.content_html ILIKE $${index})`,
      `%${normalized.search}%`,
    );
  }
  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
    normalized,
  };
}

async function listArticles(
  filters: InterestingArticleFilters,
  publicOnly: boolean,
): Promise<PaginatedResult<InterestingArticleWithCategory>> {
  const normalized = normalizeFilters(filters);
  if (!isDatabaseConfigured()) {
    const all = filterDev(normalized, publicOnly);
    return {
      data: all.slice(normalized.offset, normalized.offset + normalized.limit),
      total: all.length,
      limit: normalized.limit,
      offset: normalized.offset,
    };
  }
  const { where, params } = buildWhere(normalized, publicOnly);
  const countRows = await execute<{ total: string | number }>(
    `SELECT COUNT(*)::bigint AS total
     FROM interesting_articles a
     JOIN interesting_article_categories c ON c.id = a.category_id
     ${where}`,
    params,
  );
  const rows = await execute<ArticleRow>(
    `${ARTICLE_SELECT} ${where}
     ORDER BY COALESCE(a.published_at, a.created_at) DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, normalized.limit, normalized.offset],
  );
  return {
    data: rows.map(mapRow),
    total: Number(countRows[0]?.total) || 0,
    limit: normalized.limit,
    offset: normalized.offset,
  };
}

export function getPublishedInterestingArticles(filters: InterestingArticleFilters = {}) {
  return listArticles(filters, true);
}

export function getInterestingArticlesForAdmin(filters: InterestingArticleFilters = {}) {
  return listArticles(filters, false);
}

export async function getPublishedInterestingArticleBySlug(slug: string) {
  if (!isDatabaseConfigured()) {
    const article = listDevInterestingArticles().find((item) => item.slug === slug && item.status === "published");
    const result = article ? attachDevCategory(article) : null;
    return result?.category.is_active ? result : null;
  }
  const rows = await execute<ArticleRow>(
    `${ARTICLE_SELECT} WHERE a.slug = $1 AND a.status = 'published' AND c.is_active = TRUE LIMIT 1`,
    [slug],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getInterestingArticleById(id: string) {
  if (!isDatabaseConfigured()) {
    const article = getDevInterestingArticleById(id);
    return article ? attachDevCategory(article) : null;
  }
  const rows = await execute<ArticleRow>(`${ARTICLE_SELECT} WHERE a.id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export function getPublishedInterestingArticlesByPlace(placeId: string, filters: Omit<InterestingArticleFilters, "placeId"> = {}) {
  return getPublishedInterestingArticles({ ...filters, placeId });
}

async function safeDeleteRemovedMedia(previous: string[], next: string[]) {
  if (!isS3Configured()) return;
  const removed = previous.filter((url) => !next.includes(url));
  if (!removed.length) return;
  try {
    await deleteObjectsByUrls(removed);
  } catch (error) {
    console.error("interesting-articles: failed to delete removed media", error);
  }
}

export async function createInterestingArticle(data: CreateInterestingArticleInput) {
  await validateReferences(data.category_id, data.place_ids);
  const id = uuid();
  const slug = await uniqueArticleSlug(data.slug || data.title);
  const now = new Date().toISOString();
  const article: InterestingArticle = {
    id,
    category_id: data.category_id,
    status: data.status,
    title: data.title,
    slug,
    excerpt: data.excerpt,
    content_html: sanitizeInterestingArticleHtml(data.content_html),
    cover_image_url: data.cover_image_url || null,
    media_urls: [...data.media_urls],
    seo_title: data.seo_title || null,
    seo_description: data.seo_description || null,
    seo_keywords: [...new Set(data.seo_keywords)],
    published_at: data.status === "published" ? now : null,
    created_at: now,
    updated_at: now,
    place_ids: [...new Set(data.place_ids)],
  };
  if (!isDatabaseConfigured()) {
    insertDevInterestingArticle(article);
    return attachDevCategory(article)!;
  }
  await withTransaction(async (sql) => {
    await sql.unsafe(
      `INSERT INTO interesting_articles
        (id, category_id, status, title, slug, excerpt, content_html, cover_image_url, media_urls,
         seo_title, seo_description, seo_keywords, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12::text[], $13)`,
      [
        id, article.category_id, article.status, article.title, article.slug, article.excerpt, article.content_html,
        article.cover_image_url, article.media_urls, article.seo_title, article.seo_description,
        article.seo_keywords, article.published_at,
      ],
    );
    for (const placeId of article.place_ids) {
      await sql.unsafe(
        "INSERT INTO interesting_article_places (article_id, place_id) VALUES ($1, $2)",
        [id, placeId],
      );
    }
  });
  return (await getInterestingArticleById(id))!;
}

export async function updateInterestingArticle(id: string, data: UpdateInterestingArticleInput) {
  const existing = await getInterestingArticleById(id);
  if (!existing) return null;
  const slug = data.slug ? await uniqueArticleSlug(data.slug, id) : existing.slug;
  const status = data.status ?? existing.status;
  const next: InterestingArticle = {
    ...existing,
    ...data,
    slug,
    status,
    content_html:
      data.content_html === undefined ? existing.content_html : sanitizeInterestingArticleHtml(data.content_html),
    cover_image_url:
      data.cover_image_url === undefined ? existing.cover_image_url : data.cover_image_url || null,
    media_urls: data.media_urls ? [...data.media_urls] : existing.media_urls,
    place_ids: data.place_ids ? [...new Set(data.place_ids)] : existing.place_ids,
    seo_title: data.seo_title === undefined ? existing.seo_title : data.seo_title || null,
    seo_description: data.seo_description === undefined ? existing.seo_description : data.seo_description || null,
    seo_keywords: data.seo_keywords ? [...new Set(data.seo_keywords)] : existing.seo_keywords,
    published_at: status === "published" ? existing.published_at || new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  await validateReferences(next.category_id, next.place_ids);
  if (!isDatabaseConfigured()) {
    updateDevInterestingArticle(id, () => next);
    await safeDeleteRemovedMedia(
      [existing.cover_image_url, ...existing.media_urls].filter((url): url is string => Boolean(url)),
      [next.cover_image_url, ...next.media_urls].filter((url): url is string => Boolean(url)),
    );
    return attachDevCategory(next);
  }
  await withTransaction(async (sql) => {
    await sql.unsafe(
      `UPDATE interesting_articles SET
        category_id = $1, status = $2, title = $3, slug = $4, excerpt = $5, content_html = $6,
        cover_image_url = $7, media_urls = $8::text[], seo_title = $9, seo_description = $10,
        seo_keywords = $11::text[], published_at = $12, updated_at = NOW()
       WHERE id = $13`,
      [
        next.category_id, next.status, next.title, next.slug, next.excerpt, next.content_html,
        next.cover_image_url, next.media_urls, next.seo_title, next.seo_description, next.seo_keywords,
        next.published_at, id,
      ],
    );
    await sql.unsafe("DELETE FROM interesting_article_places WHERE article_id = $1", [id]);
    for (const placeId of next.place_ids) {
      await sql.unsafe(
        "INSERT INTO interesting_article_places (article_id, place_id) VALUES ($1, $2)",
        [id, placeId],
      );
    }
  });
  await safeDeleteRemovedMedia(
    [existing.cover_image_url, ...existing.media_urls].filter((url): url is string => Boolean(url)),
    [next.cover_image_url, ...next.media_urls].filter((url): url is string => Boolean(url)),
  );
  return getInterestingArticleById(id);
}

export async function deleteInterestingArticle(id: string): Promise<boolean> {
  const existing = await getInterestingArticleById(id);
  if (!existing) return false;
  if (!isDatabaseConfigured()) deleteDevInterestingArticle(id);
  else await execute("DELETE FROM interesting_articles WHERE id = $1", [id]);
  await safeDeleteRemovedMedia(
    [existing.cover_image_url, ...existing.media_urls].filter((url): url is string => Boolean(url)),
    [],
  );
  return true;
}
