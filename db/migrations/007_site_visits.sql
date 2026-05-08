CREATE TABLE IF NOT EXISTS site_visits (
  day DATE NOT NULL,
  path TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);

CREATE INDEX IF NOT EXISTS idx_site_visits_day ON site_visits(day DESC);
