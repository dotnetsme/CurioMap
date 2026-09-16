-- 0014_seed_ratings_challenges.sql
-- Per-user sample data, seeded LAST so it sees the full picture:
--   * the curated catalog (0010-0012) must exist to rate against, and
--   * the demo readers (0013) must exist to receive ratings/challenges.
-- Earlier attempts seeded ratings from 0002 and challenges from 0003, which on
-- a fresh database ran before any book or user existed and silently inserted
-- zero rows — the product shipped with an empty ratings system.
-- Idempotent: conflicts are no-ops, so re-runs and repaired databases are safe.

-- Every user rates 5 random books (JOIN LATERAL ... ON true so users still get
-- rows when the catalog is small; missing books simply drop out of the join).
INSERT INTO ratings (user_id, book_id, value)
SELECT u.id, b.id, (floor(random() * 5) + 1)::smallint
FROM users u
JOIN LATERAL (SELECT id FROM books ORDER BY random() LIMIT 5) b ON true
ON CONFLICT (user_id, book_id) DO NOTHING;

-- Every user gets a default challenge for the current year (target 50).
INSERT INTO challenges (user_id, year, target)
SELECT id, EXTRACT(YEAR FROM NOW())::INT, 50
FROM users
ON CONFLICT (user_id, year) DO NOTHING;
