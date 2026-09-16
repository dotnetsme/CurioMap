-- 0007_circle_streaks: group reading streaks for circles
-- Activity = any member posting a message; same day-gap/freeze rules as personal streaks.
CREATE TABLE IF NOT EXISTS circle_streaks (
    circle_id        uuid PRIMARY KEY REFERENCES reading_circles(id) ON DELETE CASCADE,
    current_streak   integer NOT NULL DEFAULT 0,
    longest_streak   integer NOT NULL DEFAULT 0,
    freeze_count     integer NOT NULL DEFAULT 0,
    last_activity_at timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_circle_streaks_current ON circle_streaks (current_streak DESC);