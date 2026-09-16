-- 0008_fix_ratings_challenges.sql
-- Repairs 0002_ratings.sql / 0003_challenge.sql which declared FK columns as TEXT
-- while the EF model (Guid) + all other migrations use uuid. TEXT FKs to uuid PKs
-- fail at CREATE TABLE time, so any DB that got past them is inconsistent.
-- Also backfills ratings.updated_at (added to the EF model, missing in 0002)
-- and fixes the seed that inserted zero rows (the random-LIMIT-5 lateral join).
-- Idempotent: safe to re-run and safe on fresh databases.

-- --- ratings: rebuild with uuid FKs ---
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ratings' AND column_name = 'user_id' AND data_type = 'text'
  ) THEN
    DROP TABLE ratings;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ratings (
  user_id    uuid      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    uuid      NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  value      SMALLINT  NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS ix_ratings_book ON ratings (book_id);

ALTER TABLE ratings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Seed: each user rates 5 random books (rewritten so every user actually gets rows).
INSERT INTO ratings (user_id, book_id, value)
SELECT u.id, b.id, (floor(random() * 5) + 1)::smallint
FROM users u
JOIN LATERAL (SELECT id FROM books ORDER BY random() LIMIT 5) b ON true
ON CONFLICT (user_id, book_id) DO NOTHING;

-- --- challenges: rebuild with uuid FK ---
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenges' AND column_name = 'user_id' AND data_type = 'text'
  ) THEN
    DROP TABLE challenges;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS challenges (
  user_id    uuid      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year       INT       NOT NULL DEFAULT (EXTRACT(YEAR FROM NOW())::INT),
  target     INT       NOT NULL DEFAULT 50 CHECK (target > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, year)
);

INSERT INTO challenges (user_id, year, target)
SELECT id, EXTRACT(YEAR FROM NOW())::INT, 50
FROM users
ON CONFLICT (user_id, year) DO NOTHING;
