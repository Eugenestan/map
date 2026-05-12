INSERT INTO categories (id, slug, name_ru, icon, sort_order, is_active)
VALUES
  ('cat-14', 'sport', 'Спорт', '⚽', 14, TRUE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ru = EXCLUDED.name_ru,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
