CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'action')),
  path TEXT NOT NULL,
  target TEXT,
  entity_id TEXT,
  visitor_id UUID NOT NULL,
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred_at
  ON analytics_events(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_occurred_at
  ON analytics_events(event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_path_occurred_at
  ON analytics_events(path, occurred_at DESC);
