INSERT INTO categories (id, slug, name_ru, icon, sort_order, is_active)
VALUES
  ('cat-12', 'atm', 'Банкоматы', '🏧', 12, TRUE),
  ('cat-13', 'sim-cards', 'Симкарты', '📶', 13, TRUE)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ru = EXCLUDED.name_ru,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
