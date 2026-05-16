INSERT INTO categories (id, slug, name_ru, icon, sort_order, is_active)
VALUES
  ('cat-15', 'landmarks', 'Достопримечательности', '🏛️', 15, TRUE),
  ('cat-16', 'entertainment', 'Развлечения', '🎭', 16, TRUE),
  ('cat-17', 'bars', 'Бары', '🍺', 17, TRUE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ru = EXCLUDED.name_ru,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
