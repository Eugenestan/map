-- Один лайк отзыва на сессию посетителя (cookie nm_visitor)
CREATE TABLE IF NOT EXISTS review_session_likes (
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_review_session_likes_session ON review_session_likes(session_id);
