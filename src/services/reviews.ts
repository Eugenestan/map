import { assertDatabaseConfigured, buildInClause, execute, isDatabaseConfigured, normalizeBoolean, normalizeTimestamp, withTransaction } from "@/lib/db";
import { MOCK_REVIEWS, TAGS } from "@/data/seed";
import { getDevReviewsByPlace, insertDevReview, listDevReviews, updateDevReview } from "@/lib/dev-store";
import type { ReviewWithTags, Tag } from "@/types";
import { v4 as uuid } from "uuid";

interface ReviewRow extends Omit<ReviewWithTags, "tags" | "created_at" | "updated_at"> {
  created_at: string | Date;
  updated_at: string | Date;
}

async function getReviewTagsMap(reviewIds: string[]): Promise<Map<string, Tag[]>> {
  if (reviewIds.length === 0) {
    return new Map();
  }

  const { placeholders, params } = buildInClause(reviewIds);
  const rows = await execute<Tag & { review_id: string; is_active: boolean }>(`
    SELECT
      rt.review_id,
      t.id,
      t.slug,
      t.name_ru,
      t.tag_type,
      t.is_active,
      t.sort_order
    FROM review_tags rt
    JOIN tags t ON rt.tag_id = t.id
    WHERE rt.review_id IN (${placeholders})
    ORDER BY t.sort_order ASC
  `, params);

  const map = new Map<string, Tag[]>();
  for (const row of rows) {
    const tags = map.get(row.review_id) || [];
    tags.push({
      id: row.id,
      slug: row.slug,
      name_ru: row.name_ru,
      tag_type: row.tag_type,
      is_active: normalizeBoolean(row.is_active),
      sort_order: row.sort_order,
    });
    map.set(row.review_id, tags);
  }

  return map;
}

async function hydrateReviews(rows: ReviewRow[]): Promise<ReviewWithTags[]> {
  const tagsMap = await getReviewTagsMap(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    created_at: normalizeTimestamp(row.created_at) || new Date(0).toISOString(),
    updated_at: normalizeTimestamp(row.updated_at) || new Date(0).toISOString(),
    likes_count: Number(row.likes_count),
    tags: tagsMap.get(row.id) || [],
  }));
}

function getMockTagsForReview(tagIds: string[]): Tag[] {
  const tagMap = new Map(TAGS.map((tag) => [tag.id, tag]));
  return tagIds.map((tagId) => tagMap.get(tagId)).filter((tag): tag is Tag => Boolean(tag));
}

function getMockReviewsByPlace(placeId: string, includeAllStatuses = false): ReviewWithTags[] {
  const sourceReviews = isDatabaseConfigured() ? MOCK_REVIEWS : getDevReviewsByPlace(placeId);

  return sourceReviews
    .filter((review) => review.place_id === placeId && (includeAllStatuses || review.status === "approved"))
    .map((review) => ({
      id: review.id,
      place_id: review.place_id,
      user_id: null,
      session_id: null,
      status: review.status,
      text: review.text,
      visit_period: review.visit_period,
      created_at: review.created_at,
      updated_at: review.created_at,
      likes_count: review.likes_count,
      author_name: review.author_name,
      tags: getMockTagsForReview(review.tags),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getReviewsByPlace(placeId: string, includeAllStatuses = false): Promise<ReviewWithTags[]> {
  if (!isDatabaseConfigured()) {
    return getMockReviewsByPlace(placeId, includeAllStatuses);
  }

  const rows = await execute<ReviewRow>(`
    SELECT *
    FROM reviews
    WHERE place_id = $1
      AND ($2::boolean = TRUE OR status = 'approved')
    ORDER BY created_at DESC
  `, [placeId, includeAllStatuses]);

  return hydrateReviews(rows);
}

export async function createReview(data: {
  place_id: string;
  text: string;
  tags?: string[];
  visit_period?: string;
  author_name?: string;
}): Promise<{ id: string }> {
  const id = uuid();

  if (!isDatabaseConfigured()) {
    const now = new Date().toISOString();
    insertDevReview({
      id,
      place_id: data.place_id,
      text: data.text,
      author_name: data.author_name || null,
      visit_period: data.visit_period || null,
      status: "pending",
      likes_count: 0,
      tags: [...(data.tags || [])],
      created_at: now,
      updated_at: now,
    });

    return { id };
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to save reviews.");

  await withTransaction(async (sql) => {
    await sql.unsafe(`
      INSERT INTO reviews (id, place_id, author_name, status, text, visit_period)
      VALUES ($1, $2, $3, 'pending', $4, $5)
    `, [id, data.place_id, data.author_name || null, data.text, data.visit_period || null]);

    if (data.tags?.length) {
      for (const tagId of data.tags) {
        await sql.unsafe(`
          INSERT INTO review_tags (id, review_id, tag_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (review_id, tag_id) DO NOTHING
        `, [`rt-${id}-${tagId}`, id, tagId]);
      }
    }
  });

  return { id };
}

export async function likeReview(reviewId: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    const updated = updateDevReview(reviewId, (review) => ({
      ...review,
      likes_count: review.likes_count + 1,
      updated_at: new Date().toISOString(),
    }));
    if (!updated) {
      throw new Error("Отзыв не найден");
    }
    return;
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to save likes.");
  await execute("UPDATE reviews SET likes_count = likes_count + 1 WHERE id = $1", [reviewId]);
}

export async function updateReviewStatus(id: string, status: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    const updated = updateDevReview(id, (review) => ({
      ...review,
      status: status as ReviewRow["status"],
      updated_at: new Date().toISOString(),
    }));
    if (!updated) {
      throw new Error("Отзыв не найден");
    }
    return;
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to moderate reviews.");
  await execute("UPDATE reviews SET status = $1, updated_at = NOW() WHERE id = $2", [status, id]);
}

export async function updateReview(id: string, data: {
  text: string;
  tags?: string[];
  visit_period?: string;
  author_name?: string;
  status: "approved" | "hidden" | "rejected" | "pending";
}): Promise<void> {
  if (!isDatabaseConfigured()) {
    const updated = updateDevReview(id, (review) => ({
      ...review,
      text: data.text,
      visit_period: data.visit_period || null,
      author_name: data.author_name || null,
      status: data.status,
      tags: [...(data.tags || [])],
      updated_at: new Date().toISOString(),
    }));
    if (!updated) {
      throw new Error("Отзыв не найден");
    }
    return;
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to edit reviews.");
  await withTransaction(async (sql) => {
    await sql.unsafe(`
      UPDATE reviews
      SET text = $1, visit_period = $2, author_name = $3, status = $4, updated_at = NOW()
      WHERE id = $5
    `, [
      data.text,
      data.visit_period || null,
      data.author_name || null,
      data.status,
      id,
    ]);

    await sql.unsafe("DELETE FROM review_tags WHERE review_id = $1", [id]);
    if (data.tags?.length) {
      for (const tagId of data.tags) {
        await sql.unsafe(`
          INSERT INTO review_tags (id, review_id, tag_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (review_id, tag_id) DO NOTHING
        `, [`rt-${id}-${tagId}`, id, tagId]);
      }
    }
  });
}

export async function getPendingReviews(): Promise<ReviewWithTags[]> {
  if (!isDatabaseConfigured()) {
    return listDevReviews()
      .filter((review) => review.status === "pending")
      .map((review) => ({
        id: review.id,
        place_id: review.place_id,
        user_id: null,
        session_id: null,
        status: review.status,
        text: review.text,
        visit_period: review.visit_period,
        created_at: review.created_at,
        updated_at: review.updated_at,
        likes_count: review.likes_count,
        author_name: review.author_name,
        tags: getMockTagsForReview(review.tags),
      }));
  }

  const rows = await execute<ReviewRow>("SELECT * FROM reviews WHERE status = 'pending' ORDER BY created_at DESC");
  return hydrateReviews(rows);
}
