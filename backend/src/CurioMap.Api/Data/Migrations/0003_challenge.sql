-- Add Challenge entity for yearly reading goals (Goodreads-style).
-- Composite PK (user_id, year) so each reader gets one challenge per year.
CREATE TABLE challenges (
  user_id    TEXT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year       INT       NOT NULL DEFAULT (EXTRACT(YEAR FROM NOW())::INT),
  target     INT       NOT NULL DEFAULT 50 CHECK (target > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, year)
);

-- Seed: give every existing user a 2025 challenge targeting 50 books
INSERT INTO challenges (user_id, year, target)
SELECT id, EXTRACT(YEAR FROM NOW())::INT, 50
FROM users
ON CONFLICT (user_id, year) DO NOTHING;
