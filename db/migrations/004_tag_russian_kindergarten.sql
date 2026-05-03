INSERT INTO tags (id, slug, name_ru, tag_type, is_active, sort_order)
VALUES ('tag-28', 'russian-kindergarten', 'Русский детский сад', 'language', TRUE, 28)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ru = EXCLUDED.name_ru,
  tag_type = EXCLUDED.tag_type,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;
