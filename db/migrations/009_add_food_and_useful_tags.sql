INSERT INTO tags (id, slug, name_ru, tag_type, is_active, sort_order)
VALUES
  ('tag-29', 'vietnamese-food', 'Вьетнамская еда', 'food', TRUE, 29),
  ('tag-30', 'late-hours-food', 'Работает допоздна', 'food', TRUE, 30),
  ('tag-31', 'coffee-shop', 'Кофейня', 'food', TRUE, 31),
  ('tag-32', 'insurance-accepted', 'Работают по страховке', 'useful', TRUE, 32),
  ('tag-33', 'good-exchange-rate', 'Хороший курс', 'useful', TRUE, 33)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ru = EXCLUDED.name_ru,
  tag_type = EXCLUDED.tag_type,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;
