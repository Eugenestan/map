CREATE TABLE IF NOT EXISTS interesting_article_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ru TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interesting_articles (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES interesting_article_categories(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content_html TEXT NOT NULL,
  cover_image_url TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interesting_article_places (
  article_id TEXT NOT NULL REFERENCES interesting_articles(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_interesting_article_categories_active_sort
  ON interesting_article_categories(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_interesting_articles_public
  ON interesting_articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_interesting_articles_category
  ON interesting_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_interesting_article_places_place
  ON interesting_article_places(place_id);
