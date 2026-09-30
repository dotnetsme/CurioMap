-- 0016_activity_shelf_visibility.sql
-- Privacy fix (AGENTS.md §2.2.4): a private shelf entry must never surface in a
-- follower's feed. Shelf activity events now carry the entry they describe plus a
-- visibility snapshot, so the feed can drop entries that were flipped to private
-- afterwards as well as legacy rows that cannot be proven public.
--
-- The snapshot stores the API vocabulary ('public'/'private') because the column is
-- written by EF only and compared literally by the feed query. Comparisons against
-- the pre-existing enum text columns are lowercased, because their historical
-- casing drifted between raw-SQL seeds/defaults ('public') and EF enum writes
-- ('Public'); see 0017_normalize_enum_casing.sql for the normalization.
--
-- Idempotent: safe to re-run and safe on fresh databases.

ALTER TABLE activity_events ADD COLUMN IF NOT EXISTS bookshelf_entry_id uuid;
ALTER TABLE activity_events ADD COLUMN IF NOT EXISTS visibility text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_activity_events_shelf_entry') THEN
    ALTER TABLE activity_events
      ADD CONSTRAINT fk_activity_events_shelf_entry
      FOREIGN KEY (bookshelf_entry_id) REFERENCES bookshelf_entries(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_events_shelf_entry ON activity_events (bookshelf_entry_id);

-- Backfill: link historical shelf events to the entry they described and snapshot the
-- visibility that holds right now. Anything that cannot be proven public fails closed:
-- a private entry, or an owner whose whole bookshelf is no longer public.
UPDATE activity_events a
SET bookshelf_entry_id = s.id,
    visibility = CASE
      WHEN lower(s.visibility) = 'public' AND lower(u.bookshelf_visibility) = 'public' THEN 'public'
      ELSE 'private'
    END
FROM bookshelf_entries s
JOIN users u ON u.id = s.user_id
WHERE a.type = 'bookshelf_added'
  AND a.bookshelf_entry_id IS NULL
  AND a.actor_id = s.user_id
  AND a.book_id = s.book_id;

-- Shelf events whose entry no longer exists cannot be audited against a visibility
-- at all, so they fail closed too (the feed hides anything not explicitly public).
UPDATE activity_events
SET visibility = 'private'
WHERE type = 'bookshelf_added' AND visibility IS NULL;
