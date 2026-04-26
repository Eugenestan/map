import { loadEnvConfig } from "@next/env";
import { closeDb, withTransaction } from "../src/lib/db";
import { CATEGORIES, MOCK_PLACES, MOCK_REVIEWS, TAGS } from "../src/data/seed";

loadEnvConfig(process.cwd());

const seedDemoData = process.argv.includes("--demo") || process.env.SEED_DEMO_DATA === "true";

async function main() {
  await withTransaction(async (db) => {
    for (const category of CATEGORIES) {
      await db.unsafe(`
        INSERT INTO categories (id, slug, name_ru, icon, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          name_ru = EXCLUDED.name_ru,
          icon = EXCLUDED.icon,
          sort_order = EXCLUDED.sort_order,
          is_active = EXCLUDED.is_active
      `, [
        category.id,
        category.slug,
        category.name_ru,
        category.icon,
        category.sort_order,
        category.is_active,
      ]);
    }

    for (const tag of TAGS) {
      await db.unsafe(`
        INSERT INTO tags (id, slug, name_ru, tag_type, is_active, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          name_ru = EXCLUDED.name_ru,
          tag_type = EXCLUDED.tag_type,
          is_active = EXCLUDED.is_active,
          sort_order = EXCLUDED.sort_order
      `, [
        tag.id,
        tag.slug,
        tag.name_ru,
        tag.tag_type,
        tag.is_active,
        tag.sort_order,
      ]);
    }

    if (!seedDemoData) {
      return;
    }

    for (const place of MOCK_PLACES) {
      await db.unsafe(`
        INSERT INTO places (
          id, title, slug, category_id, status, description, address_text, lat, lng,
          phone, website, telegram, working_hours, is_verified, last_verified_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING
      `, [
        place.id,
        place.title,
        place.slug,
        place.category_id,
        place.status,
        place.description,
        place.address_text,
        place.lat,
        place.lng,
        place.phone,
        place.website,
        place.telegram,
        place.working_hours,
        place.is_verified,
        place.last_verified_at,
      ]);

      for (const tagId of place.tags) {
        await db.unsafe(`
          INSERT INTO place_tags (id, place_id, tag_id, confirm_count, score, last_confirmed_at)
          VALUES ($1, $2, $3, 3, 3.0, NOW())
          ON CONFLICT (place_id, tag_id) DO NOTHING
        `, [`pt-${place.id}-${tagId}`, place.id, tagId]);
      }
    }

    for (const review of MOCK_REVIEWS) {
      await db.unsafe(`
        INSERT INTO reviews (id, place_id, author_name, status, text, visit_period, created_at, likes_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        review.id,
        review.place_id,
        review.author_name,
        review.status,
        review.text,
        review.visit_period,
        review.created_at,
        review.likes_count,
      ]);

      for (const tagId of review.tags) {
        await db.unsafe(`
          INSERT INTO review_tags (id, review_id, tag_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (review_id, tag_id) DO NOTHING
        `, [`rt-${review.id}-${tagId}`, review.id, tagId]);
      }
    }
  });

  console.log(seedDemoData ? "Seeded reference and demo data." : "Seeded reference data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
