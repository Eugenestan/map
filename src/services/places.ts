import { assertDatabaseConfigured, buildInClause, execute, isDatabaseConfigured, normalizeBoolean, normalizeTimestamp, withTransaction } from "@/lib/db";
import { CATEGORIES, MOCK_PLACES, MOCK_REVIEWS, TAGS } from "@/data/seed";
import { getDevPlaceById, insertDevPlace, listDevPlaces, listDevReviews, updateDevPlace } from "@/lib/dev-store";
import { slugifyPlaceTitle } from "@/lib/place-url";
import type { Place, PlaceListItem, PlaceWithDetails, PlacesFilter, PlaceTagAggregate, Category, Tag } from "@/types";
import { v4 as uuid } from "uuid";

function slugify(text: string): string {
  return slugifyPlaceTitle(text);
}

interface PlaceBaseRow extends Omit<Place, "is_verified" | "last_verified_at" | "created_at" | "updated_at" | "admin_recommended"> {
  created_at: string | Date;
  updated_at: string | Date;
  is_verified: boolean;
  last_verified_at: string | Date | null;
  admin_recommended: boolean;
  cat_id: string;
  cat_slug: string;
  cat_name: string;
  cat_icon: string;
  cat_sort: number;
  cat_active: boolean;
}

interface PlaceTagRow {
  id: string;
  place_id: string;
  tag_id: string;
  confirm_count: number;
  dispute_count: number;
  score: number;
  status: string;
  last_confirmed_at: string | Date | null;
  last_disputed_at: string | Date | null;
  t_slug: string;
  t_name: string;
  t_type: Tag["tag_type"];
  t_active: boolean;
  t_sort: number;
}

interface PlaceReviewCountRow {
  place_id: string;
  cnt: number;
}

function mapPlaceCategory(row: PlaceBaseRow): Category {
  return {
    id: row.cat_id,
    slug: row.cat_slug,
    name_ru: row.cat_name,
    icon: row.cat_icon,
    sort_order: row.cat_sort,
    is_active: normalizeBoolean(row.cat_active),
  };
}

function mapPlaceTag(row: PlaceTagRow): PlaceTagAggregate {
  return {
    id: row.id,
    place_id: row.place_id,
    tag_id: row.tag_id,
    tag: {
      id: row.tag_id,
      slug: row.t_slug,
      name_ru: row.t_name,
      tag_type: row.t_type,
      is_active: normalizeBoolean(row.t_active),
      sort_order: row.t_sort,
    },
    confirm_count: row.confirm_count,
    dispute_count: row.dispute_count,
    score: Number(row.score),
    status: row.status,
    last_confirmed_at: normalizeTimestamp(row.last_confirmed_at),
    last_disputed_at: normalizeTimestamp(row.last_disputed_at),
  };
}

function getMockTimestamp(value?: string | null): string {
  return value || "2026-01-01T00:00:00.000Z";
}

function getMockCategory(categoryId: string): Category {
  return CATEGORIES.find((category) => category.id === categoryId) ?? {
    id: categoryId,
    slug: categoryId,
    name_ru: "Без категории",
    icon: "📍",
    sort_order: 999,
    is_active: true,
  };
}

function getMockTagAggregates(tagIds: string[], placeId: string, lastVerifiedAt?: string | null): PlaceTagAggregate[] {
  const tagMap = new Map(TAGS.map((tag) => [tag.id, tag]));

  return tagIds
    .map((tagId) => {
      const tag = tagMap.get(tagId);
      if (!tag) {
        return null;
      }

      return {
        id: `pt-${placeId}-${tagId}`,
        place_id: placeId,
        tag_id: tagId,
        tag,
        confirm_count: 3,
        dispute_count: 0,
        score: 3,
        status: "active",
        last_confirmed_at: getMockTimestamp(lastVerifiedAt),
        last_disputed_at: null,
      } as PlaceTagAggregate;
    })
    .filter((tag): tag is PlaceTagAggregate => Boolean(tag))
    .sort((a, b) => a.tag.sort_order - b.tag.sort_order);
}

function getMockPlacesCollection(includeAllReviewStatuses = false): PlaceWithDetails[] {
  const sourcePlaces = isDatabaseConfigured() ? MOCK_PLACES : listDevPlaces();
  const sourceReviews = isDatabaseConfigured() ? MOCK_REVIEWS : listDevReviews();

  return sourcePlaces.map((place) => {
    const category = getMockCategory(place.category_id);
    const matchingReviews = sourceReviews.filter(
      (review) => review.place_id === place.id && (includeAllReviewStatuses || review.status === "approved"),
    );

    return {
      id: place.id,
      created_at: getMockTimestamp(place.last_verified_at),
      updated_at: getMockTimestamp(place.last_verified_at),
      created_by: null,
      status: place.status,
      title: place.title,
      slug: place.slug,
      category_id: place.category_id,
      description: place.description,
      address_text: place.address_text,
      lat: place.lat,
      lng: place.lng,
      google_maps_url: null,
      phone: place.phone,
      website: place.website,
      telegram: place.telegram,
      working_hours: place.working_hours,
      is_verified: place.is_verified,
      last_verified_at: place.last_verified_at,
      admin_recommended: !!(place as { admin_recommended?: boolean }).admin_recommended,
      place_info: (place as { place_info?: string | null }).place_info ?? null,
      source_type: null,
      duplicate_of: null,
      category,
      tags: getMockTagAggregates(place.tags, place.id, place.last_verified_at),
      reviews_count: matchingReviews.length,
    };
  });
}

function applyMockPlacesFilter(places: PlaceWithDetails[], filter: PlacesFilter): PlaceWithDetails[] {
  let items = [...places];

  if (!filter.search) {
    items = items.filter((place) => place.status === "approved");
  }

  if (filter.category) {
    items = items.filter((place) => place.category_id === filter.category);
  }

  if (filter.verifiedOnly) {
    items = items.filter((place) => place.is_verified);
  }

  if (filter.bbox) {
    items = items.filter((place) =>
      place.lat >= filter.bbox!.south &&
      place.lat <= filter.bbox!.north &&
      place.lng >= filter.bbox!.west &&
      place.lng <= filter.bbox!.east,
    );
  }

  if (filter.search) {
    const search = filter.search.toLowerCase();
    items = items.filter((place) =>
      place.status === "approved" &&
      [place.title, place.description || "", place.address_text || ""].some((value) => value.toLowerCase().includes(search)),
    );
  }

  if (filter.tags?.length) {
    items = items.filter((place) => filter.tags!.some((tagId) => place.tags.some((tag) => tag.tag_id === tagId)));
  }

  if (filter.hasReviewsOnly) {
    items = items.filter((place) => place.reviews_count > 0);
  }

  if (filter.sort === "popularity") {
    items.sort((a, b) => b.reviews_count - a.reviews_count);
  } else if (filter.sort === "confirmations") {
    items.sort((a, b) => Number(b.is_verified) - Number(a.is_verified));
  } else {
    items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const offset = filter.offset || 0;
  const limit = filter.limit || 50;
  return items.slice(offset, offset + limit);
}

async function getPlaceTagsMap(placeIds: string[]): Promise<Map<string, PlaceTagAggregate[]>> {
  if (placeIds.length === 0) {
    return new Map();
  }

  const { placeholders, params } = buildInClause(placeIds);
  const rows = await execute<PlaceTagRow>(`
    SELECT
      pt.*,
      t.slug as t_slug,
      t.name_ru as t_name,
      t.tag_type as t_type,
      t.is_active as t_active,
      t.sort_order as t_sort
    FROM place_tags pt
    JOIN tags t ON pt.tag_id = t.id
    WHERE pt.place_id IN (${placeholders})
    ORDER BY t.sort_order ASC
  `, params);

  const map = new Map<string, PlaceTagAggregate[]>();
  for (const row of rows) {
    const tags = map.get(row.place_id) || [];
    tags.push(mapPlaceTag(row));
    map.set(row.place_id, tags);
  }

  return map;
}

async function getPlaceReviewCountsMap(placeIds: string[], includeAllStatuses = false): Promise<Map<string, number>> {
  if (placeIds.length === 0) {
    return new Map();
  }

  const { placeholders, params } = buildInClause(placeIds);
  const statusClause = includeAllStatuses ? "" : "AND status = 'approved'";
  const rows = await execute<PlaceReviewCountRow>(`
    SELECT place_id, COUNT(*)::int as cnt
    FROM reviews
    WHERE place_id IN (${placeholders})
      ${statusClause}
    GROUP BY place_id
  `, params);

  return new Map(rows.map((row) => [row.place_id, Number(row.cnt)]));
}

async function hydratePlaces(rows: PlaceBaseRow[], includeAllReviewStatuses = false): Promise<PlaceWithDetails[]> {
  const placeIds = rows.map((row) => row.id);
  const [tagsMap, reviewCountsMap] = await Promise.all([
    getPlaceTagsMap(placeIds),
    getPlaceReviewCountsMap(placeIds, includeAllReviewStatuses),
  ]);

  return rows.map((row) => ({
    id: row.id,
    created_at: normalizeTimestamp(row.created_at) || new Date(0).toISOString(),
    updated_at: normalizeTimestamp(row.updated_at) || new Date(0).toISOString(),
    created_by: row.created_by,
    status: row.status,
    title: row.title,
    slug: row.slug,
    category_id: row.category_id,
    description: row.description,
    address_text: row.address_text,
    lat: Number(row.lat),
    lng: Number(row.lng),
    google_maps_url: row.google_maps_url,
    phone: row.phone,
    website: row.website,
    telegram: row.telegram,
    working_hours: row.working_hours,
    is_verified: normalizeBoolean(row.is_verified),
    last_verified_at: normalizeTimestamp(row.last_verified_at),
    admin_recommended: normalizeBoolean(row.admin_recommended),
    place_info: row.place_info ?? null,
    source_type: row.source_type,
    duplicate_of: row.duplicate_of,
    category: mapPlaceCategory(row),
    tags: tagsMap.get(row.id) || [],
    reviews_count: reviewCountsMap.get(row.id) || 0,
  }));
}

export async function getPlaces(filter: PlacesFilter = {}): Promise<PlaceWithDetails[]> {
  if (!isDatabaseConfigured()) {
    return applyMockPlacesFilter(getMockPlacesCollection(), filter);
  }

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let parameterIndex = 1;

  if (!filter.search) {
    conditions.push("p.status = 'approved'");
  }

  if (filter.category) {
    conditions.push(`p.category_id = $${parameterIndex}`);
    params.push(filter.category);
    parameterIndex += 1;
  }

  if (filter.verifiedOnly) {
    conditions.push("p.is_verified = TRUE");
  }

  if (filter.bbox) {
    conditions.push(`p.lat BETWEEN $${parameterIndex} AND $${parameterIndex + 1} AND p.lng BETWEEN $${parameterIndex + 2} AND $${parameterIndex + 3}`);
    params.push(filter.bbox.south, filter.bbox.north, filter.bbox.west, filter.bbox.east);
    parameterIndex += 4;
  }

  if (filter.search) {
    conditions.push(`(p.title ILIKE $${parameterIndex} OR p.description ILIKE $${parameterIndex + 1} OR p.address_text ILIKE $${parameterIndex + 2}) AND p.status = 'approved'`);
    const s = `%${filter.search}%`;
    params.push(s, s, s);
    parameterIndex += 3;
  }

  if (filter.tags && filter.tags.length > 0) {
    const { placeholders, params: tagParams } = buildInClause(filter.tags, parameterIndex);
    conditions.push(`p.id IN (SELECT place_id FROM place_tags WHERE tag_id IN (${placeholders}))`);
    params.push(...tagParams);
    parameterIndex += filter.tags.length;
  }

  if (filter.hasReviewsOnly) {
    conditions.push("(SELECT COUNT(*) FROM reviews r WHERE r.place_id = p.id AND r.status = 'approved') > 0");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy = "ORDER BY p.created_at DESC";
  if (filter.sort === "newest") orderBy = "ORDER BY p.created_at DESC";
  if (filter.sort === "popularity") orderBy = "ORDER BY (SELECT COUNT(*) FROM reviews WHERE place_id = p.id) DESC";
  if (filter.sort === "confirmations") orderBy = "ORDER BY p.is_verified DESC, p.last_verified_at DESC NULLS LAST";

  const limit = filter.limit || 50;
  const offset = filter.offset || 0;

  const sql = `
    SELECT p.*, c.id as cat_id, c.slug as cat_slug, c.name_ru as cat_name, c.icon as cat_icon, c.sort_order as cat_sort, c.is_active as cat_active
    FROM places p
    JOIN categories c ON p.category_id = c.id
    ${where}
    ${orderBy}
    LIMIT $${parameterIndex} OFFSET $${parameterIndex + 1}
  `;
  params.push(limit, offset);

  const rows = await execute<PlaceBaseRow>(sql, params);
  return hydratePlaces(rows);
}

export async function getPlaceListItems(limit = 500): Promise<PlaceListItem[]> {
  if (!isDatabaseConfigured()) {
    return applyMockPlacesFilter(getMockPlacesCollection(), { limit })
      .map(({ id, title }) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));
  }

  return execute<PlaceListItem>(
    `
    SELECT id, title
    FROM places
    WHERE status = 'approved'
    ORDER BY title ASC
    LIMIT $1
  `,
    [limit],
  );
}

export async function getPlaceById(id: string): Promise<PlaceWithDetails | null> {
  if (!isDatabaseConfigured()) {
    const devPlace =
      getDevPlaceById(id) ||
      listDevPlaces().find((place) => place.slug === id || slugifyPlaceTitle(place.title) === id) ||
      null;
    if (!devPlace) {
      return null;
    }

    return getMockPlacesCollection(true).find((place) => place.id === devPlace.id) ?? null;
  }

  const rows = await execute<PlaceBaseRow>(`
    SELECT p.*, c.id as cat_id, c.slug as cat_slug, c.name_ru as cat_name, c.icon as cat_icon, c.sort_order as cat_sort, c.is_active as cat_active
    FROM places p JOIN categories c ON p.category_id = c.id
    WHERE p.id = $1 OR p.slug = $1
    ORDER BY p.updated_at DESC, p.created_at DESC
    LIMIT 1
  `, [id]);

  if (rows.length > 0) {
    const [place] = await hydratePlaces(rows);
    return place ?? null;
  }

  const fallbackRows = await execute<PlaceBaseRow>(`
    SELECT p.*, c.id as cat_id, c.slug as cat_slug, c.name_ru as cat_name, c.icon as cat_icon, c.sort_order as cat_sort, c.is_active as cat_active
    FROM places p JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'approved'
    ORDER BY p.updated_at DESC, p.created_at DESC
    LIMIT 1000
  `);
  const matchedRow = fallbackRows.find((row) => slugifyPlaceTitle(row.title) === id);
  if (!matchedRow) return null;

  const [place] = await hydratePlaces([matchedRow]);
  return place ?? null;
}

export async function createPlace(data: {
  title: string;
  category_id: string;
  lat: number;
  lng: number;
  address_text?: string;
  description?: string;
  tags?: string[];
  phone?: string;
  website?: string;
  telegram?: string;
  working_hours?: string;
}): Promise<{ id: string }> {
  const id = uuid();
  const slug = slugify(data.title) || id;

  if (!isDatabaseConfigured()) {
    const now = new Date().toISOString();
    insertDevPlace({
      id,
      title: data.title,
      slug,
      category_id: data.category_id,
      status: "pending",
      description: data.description || null,
      address_text: data.address_text || null,
      lat: data.lat,
      lng: data.lng,
      phone: data.phone || null,
      website: data.website || null,
      telegram: data.telegram || null,
      working_hours: data.working_hours || null,
      is_verified: false,
      last_verified_at: null,
      admin_recommended: false,
      place_info: null,
      tags: [...(data.tags || [])],
      created_at: now,
      updated_at: now,
    });

    return { id };
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to save places.");

  await withTransaction(async (sql) => {
    await sql.unsafe(`
      INSERT INTO places (id, title, slug, category_id, status, description, address_text, lat, lng, phone, website, telegram, working_hours, is_verified)
      VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, FALSE)
    `, [
      id,
      data.title,
      slug,
      data.category_id,
      data.description || null,
      data.address_text || null,
      data.lat,
      data.lng,
      data.phone || null,
      data.website || null,
      data.telegram || null,
      data.working_hours || null,
    ]);

    if (data.tags?.length) {
      for (const tagId of data.tags) {
        await sql.unsafe(`
          INSERT INTO place_tags (id, place_id, tag_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (place_id, tag_id) DO NOTHING
        `, [`pt-${id}-${tagId}`, id, tagId]);
      }
    }
  });

  return { id };
}

export async function updatePlaceStatus(id: string, status: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    const updated = updateDevPlace(id, (place) => ({
      ...place,
      status: status as Place["status"],
      updated_at: new Date().toISOString(),
    }));
    if (!updated) {
      throw new Error("Место не найдено");
    }
    return;
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to moderate places.");
  await execute("UPDATE places SET status = $1, updated_at = NOW() WHERE id = $2", [status, id]);
}

export async function getApprovedPlacesForAdmin(): Promise<PlaceWithDetails[]> {
  if (!isDatabaseConfigured()) {
    return getMockPlacesCollection(true).filter((place) => place.status === "approved");
  }

  const rows = await execute<PlaceBaseRow>(`
    SELECT p.*, c.id as cat_id, c.slug as cat_slug, c.name_ru as cat_name, c.icon as cat_icon, c.sort_order as cat_sort, c.is_active as cat_active
    FROM places p
    JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'approved'
    ORDER BY p.updated_at DESC, p.created_at DESC
  `);

  return hydratePlaces(rows, true);
}

export async function updatePlace(id: string, data: {
  title: string;
  category_id: string;
  lat: number;
  lng: number;
  address_text?: string;
  description?: string;
  tags?: string[];
  phone?: string;
  website?: string;
  telegram?: string;
  working_hours?: string;
  status: "approved" | "hidden" | "archived";
  is_verified?: boolean;
  admin_recommended?: boolean;
  place_info?: string;
}): Promise<void> {
  const slug = slugify(data.title) || id;

  if (!isDatabaseConfigured()) {
    const updated = updateDevPlace(id, (place) => ({
      ...place,
      title: data.title,
      slug,
      category_id: data.category_id,
      status: data.status,
      description: data.description || null,
      address_text: data.address_text || null,
      lat: data.lat,
      lng: data.lng,
      phone: data.phone || null,
      website: data.website || null,
      telegram: data.telegram || null,
      working_hours: data.working_hours || null,
      is_verified: !!data.is_verified,
      last_verified_at: data.is_verified ? new Date().toISOString() : null,
      admin_recommended: data.admin_recommended !== undefined ? !!data.admin_recommended : place.admin_recommended,
      place_info: data.place_info?.trim() || null,
      tags: [...(data.tags || [])],
      updated_at: new Date().toISOString(),
    }));

    if (!updated) {
      throw new Error("Место не найдено");
    }
    return;
  }

  assertDatabaseConfigured("DATABASE_URL is not configured. Configure Postgres to edit places.");

  await withTransaction(async (sql) => {
    await sql.unsafe(`
      UPDATE places
      SET title = $1, slug = $2, category_id = $3, status = $4, description = $5, address_text = $6, lat = $7, lng = $8,
          phone = $9, website = $10, telegram = $11, working_hours = $12, is_verified = $13,
          admin_recommended = COALESCE($14, admin_recommended), place_info = $15, updated_at = NOW()
      WHERE id = $16
    `, [
      data.title,
      slug,
      data.category_id,
      data.status,
      data.description || null,
      data.address_text || null,
      data.lat,
      data.lng,
      data.phone || null,
      data.website || null,
      data.telegram || null,
      data.working_hours || null,
      !!data.is_verified,
      data.admin_recommended !== undefined ? !!data.admin_recommended : null,
      data.place_info?.trim() || null,
      id,
    ]);

    await sql.unsafe("DELETE FROM place_tags WHERE place_id = $1", [id]);
    if (data.tags?.length) {
      for (const tagId of data.tags) {
        await sql.unsafe(`
          INSERT INTO place_tags (id, place_id, tag_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (place_id, tag_id) DO NOTHING
        `, [`pt-${id}-${tagId}`, id, tagId]);
      }
    }
  });
}

export async function getPendingPlaces(): Promise<PlaceWithDetails[]> {
  if (!isDatabaseConfigured()) {
    return getMockPlacesCollection(true).filter((place) => place.status === "pending");
  }

  const rows = await execute<PlaceBaseRow>(`
    SELECT p.*, c.id as cat_id, c.slug as cat_slug, c.name_ru as cat_name, c.icon as cat_icon, c.sort_order as cat_sort, c.is_active as cat_active
    FROM places p
    JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'pending'
    ORDER BY p.created_at DESC
  `);

  return hydratePlaces(rows, true);
}
