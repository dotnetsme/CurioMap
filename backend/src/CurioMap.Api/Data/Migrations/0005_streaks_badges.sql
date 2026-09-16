-- 0005_streaks_badges: per-reading streaks + milestone badges

CREATE TABLE IF NOT EXISTS reading_streaks (
    user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak integer NOT NULL DEFAULT 0,
    longest_streak integer NOT NULL DEFAULT 0,
    last_activity_at timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_reading_streaks_current ON reading_streaks (current_streak DESC);

CREATE TABLE IF NOT EXISTS user_badges (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        text NOT NULL,
    awarded_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_badges_user_kind UNIQUE (user_id, kind)
);

CREATE INDEX IF NOT EXISTS ix_user_badges_user ON user_badges (user_id, awarded_at DESC);

-- Seed streaks for users who have qualifying activity history.
-- Deterministic one row per user (earliest finished entry), so re-runs are stable.
INSERT INTO reading_streaks (user_id, current_streak, longest_streak, last_activity_at, updated_at)
SELECT DISTINCT ON (u.id) u.id, 1, 1, be.created_at, now()
FROM users u
JOIN bookshelf_entries be ON be.user_id = u.id
WHERE be.status = 'Finished'
ORDER BY u.id, be.created_at
ON CONFLICT (user_id) DO NOTHING;

-- Seed FirstBook badge for users with a finished book
INSERT INTO user_badges (user_id, kind, awarded_at)
SELECT DISTINCT be.user_id, 'FirstBook', MIN(be.created_at)
FROM bookshelf_entries be
WHERE be.status = 'Finished'
GROUP BY be.user_id
ON CONFLICT (user_id, kind) DO NOTHING;
