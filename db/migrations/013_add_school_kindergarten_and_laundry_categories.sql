INSERT INTO categories (id, slug, name_ru, icon, sort_order, is_active)
VALUES
  ('cat-18', 'school-kindergarten', 'Школа / садик', '🏫', 18, TRUE),
  ('cat-19', 'laundry', 'Прачечная', '🧺', 19, TRUE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ru = EXCLUDED.name_ru,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
