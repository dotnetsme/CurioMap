-- Add Rating entity for persisted 1-5 star ratings on books
CREATE TABLE ratings (
  user_id    TEXT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    TEXT      NOT NULL REFERENCES books(id)  ON DELETE CASCADE,
  value      SMALLINT  NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

-- index for fast avg/count aggregates in GET /books/{id}
CREATE INDEX IF NOT EXISTS ix_ratings_book ON ratings (book_id);

-- seed: each user rates 5 random books (~500 rows with current sample data)
INSERT INTO ratings (user_id, book_id, value)
SELECT u.id, b.id, (floor(random() * 5) + 1)::smallint
FROM users u
CROSS JOIN LATERAL (SELECT id FROM books ORDER BY random() LIMIT 5) b;
