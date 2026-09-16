-- Add Challenge entity for yearly reading goals (Goodreads-style).
-- Composite PK (user_id, year) so each reader gets one challenge per year.
-- NOTE: user_id is uuid to match users(id) (see 0008 guard for legacy dbs).
-- Schema only: per-user default challenges are seeded in 0014, after the demo
-- readers exist (this script runs before any user does on a fresh database).
CREATE TABLE IF NOT EXISTS challenges (
  user_id    uuid      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year       INT       NOT NULL DEFAULT (EXTRACT(YEAR FROM NOW())::INT),
  target     INT       NOT NULL DEFAULT 50 CHECK (target > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, year)
);
