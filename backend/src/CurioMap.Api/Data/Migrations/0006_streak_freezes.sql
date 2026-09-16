-- 0006_streak_freezes: freeze tokens shield a streak across one missed day
ALTER TABLE reading_streaks ADD COLUMN IF NOT EXISTS freeze_count integer NOT NULL DEFAULT 0;