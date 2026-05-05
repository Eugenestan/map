import { v4 as uuid } from "uuid";
import { assertDatabaseConfigured, execute, isDatabaseConfigured, normalizeTimestamp, withTransaction } from "@/lib/db";
import { insertDevArticle, listDevArticles, updateDevPlace } from "@/lib/dev-store";
import type { Article } from "@/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function appendInfoLink(existing: string | null | undefined, url: string): string {
  const trimmed = (existing || "").trim();
  if (!trimmed) return url;
  if (trimmed.includes(url)) return trimmed;
  return `${trimmed}\n${url}`;
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
  const slug = `${slugify(data.title) || "article"}-${id.slice(0, 8)}`;
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
