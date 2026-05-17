-- Дубликат «Работает допоздна» в разделе «Еда» (tag-30); оставляем tag-9 в «Полезность».

INSERT INTO place_tags (id, place_id, tag_id, confirm_count, score, last_confirmed_at)
SELECT
  'pt-mig-' || place_id || '-tag-9',
  place_id,
  'tag-9',
  confirm_count,
  score,
  last_confirmed_at
FROM place_tags
WHERE tag_id = 'tag-30'
ON CONFLICT (place_id, tag_id) DO NOTHING;

DELETE FROM place_tags WHERE tag_id = 'tag-30';

INSERT INTO review_tags (id, review_id, tag_id)
SELECT
  'rt-mig-' || review_id || '-tag-9',
  review_id,
  'tag-9'
FROM review_tags
WHERE tag_id = 'tag-30'
ON CONFLICT (review_id, tag_id) DO NOTHING;

DELETE FROM review_tags WHERE tag_id = 'tag-30';

UPDATE articles
SET tag_ids = (
  SELECT COALESCE(array_agg(DISTINCT CASE WHEN x = 'tag-30' THEN 'tag-9' ELSE x END), '{}')
  FROM unnest(tag_ids) AS x
)
WHERE 'tag-30' = ANY(tag_ids);

DELETE FROM tags WHERE id = 'tag-30';
