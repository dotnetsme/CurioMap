-- 0011_search_indexes.sql
-- Search moved from `title ILIKE '%q%'` to `lower(title) LIKE '%q%'` so the same
-- query runs on Postgres (production) and SQLite (hermetic test suite): the
-- provider-portable path is the one CI actually exercises.
--
-- Consequence: the trigram indexes declared in 0001 sit on the raw columns, so
-- they no longer match the new expression and Postgres would fall back to a
-- sequential scan. Re-declare them on lower(...) — pg_trgm supports LIKE
-- against a `lower(col) gin_trgm_ops` index, so search stays indexed.
-- Idempotent. The raw-column indexes from 0001 are intentionally left in place
-- for predicates that still match on the bare column.

CREATE INDEX IF NOT EXISTS ix_books_title_lower_trgm
    ON books USING gin (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_books_author_lower_trgm
    ON books USING gin (lower(author) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_reading_circles_name_lower_trgm
    ON reading_circles USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_reading_circles_handle_lower_trgm
    ON reading_circles USING gin (lower(handle) gin_trgm_ops);
