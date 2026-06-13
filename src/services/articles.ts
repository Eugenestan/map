import { v4 as uuid } from "uuid";
import { assertDatabaseConfigured, execute, isDatabaseConfigured, normalizeTimestamp, withTransaction } from "@/lib/db";
import {
  deleteDevArticle,
  getDevArticleById,
  insertDevArticle,
  listDevArticles,
  listDevPlaces,
  updateDevArticle,
  updateDevPlace,
} from "@/lib/dev-store";
import { deleteObjectsByUrls, isS3Configured } from "@/lib/s3";
import type { Article } from "@/types";

async function safeDeleteRemovedPhotos(previous: string[], next: string[]): Promise<void> {
  if (!isS3Configured()) return;
  const removed = previous.filter((url) => !next.includes(url));
  if (removed.length === 0) return;
  try {
    await deleteObjectsByUrls(removed);
  } catch (error) {
    console.error("articles: failed to delete removed photos from S3", error);
  }
}

export interface ArticleFilters {
  search?: string;
  placeId?: string;
  categoryId?: string;
  tagIds?: string[];
  limit?: number;
  offset?: number;
}

const RU_TO_LAT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function transliterateRu(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((char) => RU_TO_LAT[char] ?? char)
    .join("");
}

function slugifyArticleTitle(title: string): string {
  const transliterated = transliterateRu(title);
  const words = transliterated
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 7);
  return words.join("-").replace(/-+/g, "-");
}

async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return listDevArticles().some((article) => article.slug === slug && article.id !== excludeId);
  }
  const rows = await execute<{ id: string }>(
    "SELECT id FROM articles WHERE slug = $1 AND ($2::text IS NULL OR id <> $2) LIMIT 1",
    [slug, excludeId || null],
  );
  return rows.length > 0;
}

async function createUniqueArticleSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugifyArticleTitle(title) || "article";
  let candidate = base;
  let index = 2;
  while (await slugExists(candidate, excludeId)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function appendInfoLink(existing: string | null | undefined, url: string): string {
  const trimmed = (existing || "").trim();
  if (!trimmed) return url;
  if (trimmed.includes(url)) return trimmed;
  return `${trimmed}\n${url}`;
}

function removeInfoLink(existing: string | null | undefined, url: string): string | null {
  const tokens = (existing || "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item !== url);
  return tokens.length ? tokens.join("\n") : null;
}

interface ArticleRow {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  created_by: string | null;
  title: string;
  slug: string;
  description: string;
  tag_ids: string[] | null;
  photo_urls: string[] | null;
  lat: number;
  lng: number;
  place_id: string | null;
}

function mapArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    created_at: normalizeTimestamp(row.created_at) || new Date(0).toISOString(),
    updated_at: normalizeTimestamp(row.updated_at) || new Date(0).toISOString(),
    created_by: row.created_by,
    title: row.title,
    slug: row.slug,
    description: row.description,
    tag_ids: row.tag_ids || [],
    photo_urls: row.photo_urls || [],
    lat: Number(row.lat),
    lng: Number(row.lng),
    place_id: row.place_id,
  };
}

function normalizeArticleFilters(filters: ArticleFilters): Required<Pick<ArticleFilters, "tagIds">> &
  Pick<ArticleFilters, "search" | "placeId" | "categoryId" | "limit" | "offset"> {
  return {
    search: filters.search?.trim() || undefined,
    placeId: filters.placeId?.trim() || undefined,
    categoryId: filters.categoryId?.trim() || undefined,
    tagIds: [...new Set(filters.tagIds?.map((tagId) => tagId.trim()).filter(Boolean) || [])],
    limit: filters.limit,
    offset: filters.offset,
  };
}

function filterDevArticles(articles: Article[], filters: ArticleFilters): Article[] {
  const normalized = normalizeArticleFilters(filters);
  let items = [...articles];

  if (normalized.search) {
    const search = normalized.search.toLowerCase();
    items = items.filter((article) =>
      [article.title, article.description].some((value) => value.toLowerCase().includes(search)),
    );
  }

  if (normalized.placeId) {
    items = items.filter((article) => article.place_id === normalized.placeId);
  }

  if (normalized.categoryId) {
    const placeCategoryMap = new Map(listDevPlaces().map((place) => [place.id, place.category_id]));
    items = items.filter(
      (article) => article.place_id && placeCategoryMap.get(article.place_id) === normalized.categoryId,
    );
  }

  if (normalized.tagIds.length > 0) {
    items = items.filter((article) => normalized.tagIds.every((tagId) => article.tag_ids.includes(tagId)));
  }

  items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return items;
}

function applyDevArticleFilters(articles: Article[], filters: ArticleFilters): Article[] {
  const normalized = normalizeArticleFilters(filters);
  const items = filterDevArticles(articles, normalized);
  const offset = normalized.offset || 0;
  const limit = normalized.limit || 100;
  return items.slice(offset, offset + limit);
}

export async function createArticle(data: {
  title: string;
  description: string;
  tag_ids: string[];
  photo_urls: string[];
  lat: number;
  lng: number;
  place_id?: string;
}): Promise<{ id: string; slug: string; url: string }> {
  const id = uuid();
  const slug = await createUniqueArticleSlug(data.title);
  const url = `/articles/${slug}`;

  if (!isDatabaseConfigured()) {
    const now = new Date().toISOString();
    insertDevArticle({
      id,
      created_at: now,
      updated_at: now,
      created_by: null,
      title: data.title,
      slug,
      description: data.description,
      tag_ids: [...data.tag_ids],
      photo_urls: [...data.photo_urls],
      lat: data.lat,
      lng: data.lng,
      place_id: data.place_id || null,
    });

    if (data.place_id) {
      updateDevPlace(data.place_id, (place) => ({
        ...place,
        place_info: appendInfoLink(place.place_info, url),
        updated_at: now,
      }));
    }

    return { id, slug, url };
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to create articles.");
  await withTransaction(async (sql) => {
    await sql.unsafe(
      `
      INSERT INTO articles (id, title, slug, description, tag_ids, photo_urls, lat, lng, place_id)
      VALUES ($1, $2, $3, $4, $5::text[], $6::text[], $7, $8, $9)
    `,
      [id, data.title, slug, data.description, data.tag_ids, data.photo_urls, data.lat, data.lng, data.place_id || null],
    );

    if (data.place_id) {
      await sql.unsafe(
        `
        UPDATE places
        SET place_info = CASE
          WHEN place_info IS NULL OR place_info = '' THEN $1
          WHEN position($1 in place_info) > 0 THEN place_info
          ELSE place_info || E'\n' || $1
        END,
        updated_at = NOW()
        WHERE id = $2
      `,
        [url, data.place_id],
      );
    }
  });

  return { id, slug, url };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (!isDatabaseConfigured()) {
    return listDevArticles().find((article) => article.slug === slug) ?? null;
  }
  const rows = await execute<ArticleRow>("SELECT * FROM articles WHERE slug = $1 LIMIT 1", [slug]);
  if (!rows.length) return null;
  return mapArticle(rows[0]);
}

export async function getArticleById(id: string): Promise<Article | null> {
  if (!isDatabaseConfigured()) {
    return getDevArticleById(id);
  }
  const rows = await execute<ArticleRow>("SELECT * FROM articles WHERE id = $1 LIMIT 1", [id]);
  if (!rows.length) return null;
  return mapArticle(rows[0]);
}

function buildArticleWhereClause(filters: ArticleFilters): {
  where: string;
  params: (string | string[])[];
  nextIndex: number;
} {
  const normalized = normalizeArticleFilters(filters);
  const conditions: string[] = [];
  const params: (string | string[])[] = [];
  let parameterIndex = 1;

  if (normalized.search) {
    conditions.push(`(title ILIKE $${parameterIndex} OR description ILIKE $${parameterIndex})`);
    params.push(`%${normalized.search}%`);
    parameterIndex += 1;
  }

  if (normalized.placeId) {
    conditions.push(`place_id = $${parameterIndex}`);
    params.push(normalized.placeId);
    parameterIndex += 1;
  }

  if (normalized.categoryId) {
    conditions.push(
      `place_id IN (SELECT id FROM places WHERE category_id = $${parameterIndex})`,
    );
    params.push(normalized.categoryId);
    parameterIndex += 1;
  }

  if (normalized.tagIds.length > 0) {
    conditions.push(`tag_ids @> $${parameterIndex}::text[]`);
    params.push(normalized.tagIds);
    parameterIndex += 1;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params, nextIndex: parameterIndex };
}

export async function getArticles(filters: ArticleFilters = {}): Promise<Article[]> {
  const normalized = normalizeArticleFilters(filters);

  if (!isDatabaseConfigured()) {
    return applyDevArticleFilters(listDevArticles(), normalized);
  }

  const { where, params, nextIndex } = buildArticleWhereClause(normalized);
  const limit = normalized.limit || 100;
  const offset = normalized.offset || 0;

  const finalParams: (string | number | string[])[] = [...params, limit, offset];
  const rows = await execute<ArticleRow>(
    `
    SELECT *
    FROM articles
    ${where}
    ORDER BY created_at DESC
    LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
  `,
    finalParams,
  );

  return rows.map(mapArticle);
}

export async function countArticles(filters: ArticleFilters = {}): Promise<number> {
  const normalized = normalizeArticleFilters(filters);

  if (!isDatabaseConfigured()) {
    return filterDevArticles(listDevArticles(), normalized).length;
  }

  const { where, params } = buildArticleWhereClause(normalized);
  const rows = await execute<{ total: string | number }>(
    `SELECT COUNT(*)::bigint AS total FROM articles ${where}`,
    params,
  );
  if (!rows.length) return 0;
  return Number(rows[0].total) || 0;
}

export async function getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
  const candidates = (await getArticles({ limit: 100 })).filter((item) => item.id !== article.id);
  const tagIds = new Set(article.tag_ids);

  const scored = candidates
    .map((candidate) => {
      const samePlaceScore = article.place_id && candidate.place_id === article.place_id ? 10 : 0;
      const tagScore = candidate.tag_ids.filter((tagId) => tagIds.has(tagId)).length;
      return { article: candidate, score: samePlaceScore + tagScore };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.article.created_at.localeCompare(a.article.created_at))
    .map((item) => item.article);

  if (scored.length >= limit) {
    return scored.slice(0, limit);
  }

  const fallback = candidates.filter((candidate) => !scored.some((item) => item.id === candidate.id));
  return [...scored, ...fallback].slice(0, limit);
}

export async function getArticlesForAdmin(): Promise<Article[]> {
  if (!isDatabaseConfigured()) {
    return [...listDevArticles()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const rows = await execute<ArticleRow>("SELECT * FROM articles ORDER BY created_at DESC");
  return rows.map(mapArticle);
}

export async function updateArticle(
  id: string,
  data: {
    title: string;
    description: string;
    tag_ids: string[];
    photo_urls: string[];
    lat: number;
    lng: number;
    place_id?: string;
  },
): Promise<void> {
  const existing = await getArticleById(id);
  if (!existing) {
    throw new Error("Место не найдено");
  }
  const url = `/articles/${existing.slug}`;

  if (!isDatabaseConfigured()) {
    const now = new Date().toISOString();
    const previousPlaceId = existing.place_id;
    const nextPlaceId = data.place_id || null;

    updateDevArticle(id, (article) => ({
      ...article,
      title: data.title,
      description: data.description,
      tag_ids: [...data.tag_ids],
      photo_urls: [...data.photo_urls],
      lat: data.lat,
      lng: data.lng,
      place_id: nextPlaceId,
      updated_at: now,
    }));

    if (previousPlaceId && previousPlaceId !== nextPlaceId) {
      updateDevPlace(previousPlaceId, (place) => ({
        ...place,
        place_info: removeInfoLink(place.place_info, url),
        updated_at: now,
      }));
    }
    if (nextPlaceId) {
      updateDevPlace(nextPlaceId, (place) => ({
        ...place,
        place_info: appendInfoLink(place.place_info, url),
        updated_at: now,
      }));
    }
    await safeDeleteRemovedPhotos(existing.photo_urls, data.photo_urls);
    return;
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to update articles.");
  await withTransaction(async (sql) => {
    await sql.unsafe(
      `
      UPDATE articles
      SET title = $1, description = $2, tag_ids = $3::text[], photo_urls = $4::text[], lat = $5, lng = $6, place_id = $7, updated_at = NOW()
      WHERE id = $8
    `,
      [data.title, data.description, data.tag_ids, data.photo_urls, data.lat, data.lng, data.place_id || null, id],
    );

    if (existing.place_id && existing.place_id !== data.place_id) {
      const rows = await sql.unsafe<{ place_info: string | null }[]>("SELECT place_info FROM places WHERE id = $1 LIMIT 1", [
        existing.place_id,
      ]);
      if (rows.length > 0) {
        await sql.unsafe("UPDATE places SET place_info = $1, updated_at = NOW() WHERE id = $2", [
          removeInfoLink(rows[0].place_info, url),
          existing.place_id,
        ]);
      }
    }

    if (data.place_id) {
      await sql.unsafe(
        `
        UPDATE places
        SET place_info = CASE
          WHEN place_info IS NULL OR place_info = '' THEN $1
          WHEN position($1 in place_info) > 0 THEN place_info
          ELSE place_info || E'\n' || $1
        END,
        updated_at = NOW()
        WHERE id = $2
      `,
        [url, data.place_id],
      );
    }
  });

  await safeDeleteRemovedPhotos(existing.photo_urls, data.photo_urls);
}

export async function deleteArticle(id: string): Promise<void> {
  const existing = await getArticleById(id);
  if (!existing) {
    throw new Error("Место не найдено");
  }
  const url = `/articles/${existing.slug}`;

  if (!isDatabaseConfigured()) {
    deleteDevArticle(id);
    const now = new Date().toISOString();
    for (const place of listDevPlaces()) {
      if ((place.place_info || "").includes(url)) {
        updateDevPlace(place.id, (item) => ({
          ...item,
          place_info: removeInfoLink(item.place_info, url),
          updated_at: now,
        }));
      }
    }
    await safeDeleteRemovedPhotos(existing.photo_urls, []);
    return;
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to delete articles.");
  await withTransaction(async (sql) => {
    const places = await sql.unsafe<{ id: string; place_info: string | null }[]>(
      "SELECT id, place_info FROM places WHERE place_info IS NOT NULL AND position($1 in place_info) > 0",
      [url],
    );
    for (const place of places) {
      await sql.unsafe("UPDATE places SET place_info = $1, updated_at = NOW() WHERE id = $2", [
        removeInfoLink(place.place_info, url),
        place.id,
      ]);
    }
    await sql.unsafe("DELETE FROM articles WHERE id = $1", [id]);
  });

  await safeDeleteRemovedPhotos(existing.photo_urls, []);
}
