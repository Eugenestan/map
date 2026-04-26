import { execute, isDatabaseConfigured, normalizeBoolean } from "@/lib/db";
import { CATEGORIES } from "@/data/seed";
import type { Category } from "@/types";

export async function getCategories(): Promise<Category[]> {
  if (!isDatabaseConfigured()) {
    return CATEGORIES;
  }

  const rows = await execute<Category>("SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order");
  return rows.map((row) => ({ ...row, is_active: normalizeBoolean(row.is_active) }));
}
