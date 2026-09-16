-- Add Rating entity for persisted 1-5 star ratings on books
-- NOTE: user_id/book_id are uuid to match users(id)/books(id) (see 0008 guard for legacy dbs).
-- Schema only: the per-user sample ratings are seeded in 0014, after the book
-- catalog and demo readers exist (this script runs before either of them).
CREATE TABLE IF NOT EXISTS ratings (
  user_id    uuid      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    uuid      NOT NULL REFERENCES books(id)  ON DELETE CASCADE,
  value      SMALLINT  NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

-- index for fast avg/count aggregates in GET /books/{id}
CREATE INDEX IF NOT EXISTS ix_ratings_book ON ratings (book_id);
