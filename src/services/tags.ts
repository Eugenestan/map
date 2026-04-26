import { execute, isDatabaseConfigured, normalizeBoolean } from "@/lib/db";
import { TAGS } from "@/data/seed";
import type { Tag } from "@/types";

export async function getTags(): Promise<Tag[]> {
  if (!isDatabaseConfigured()) {
    return TAGS;
  }

  const rows = await execute<Tag>("SELECT * FROM tags WHERE is_active = TRUE ORDER BY sort_order");
  const dbTags = rows.map((row) => ({ ...row, is_active: normalizeBoolean(row.is_active) }));
  return mergeTagsWithSeed(dbTags);
}

export async function getTagsByType(type: string): Promise<Tag[]> {
  const tags = await getTags();
  return tags.filter((tag) => tag.tag_type === type);
}

function mergeTagsWithSeed(dbTags: Tag[]): Tag[] {
  const tagMap = new Map(dbTags.map((tag) => [tag.id, tag]));

  for (const tag of TAGS) {
    if (!tagMap.has(tag.id)) {
      tagMap.set(tag.id, tag);
    }
  }

  return Array.from(tagMap.values()).sort((a, b) => a.sort_order - b.sort_order);
}
