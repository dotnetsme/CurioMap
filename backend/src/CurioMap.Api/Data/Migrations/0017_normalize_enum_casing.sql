-- 0017_normalize_enum_casing.sql
-- Enum text casing drift fix (AGENTS §8.16): EF's HasConversion<string>() persists
-- PascalCase enum names ('Public'), but raw-SQL seeds and defaults wrote lowercase
-- snake_case ('public'). Because SQL string equality is case-sensitive, equality
-- filters on EF constants silently missed seeded rows - e.g. seeded shelf entries
-- never matched `s.Visibility == ShelfVisibility.Public`, so they were dropped from
-- discovery, the map drill-down, and public-shelf reads. The partial index
-- ix_shelf_reading_public was dead for every EF-written row for the same reason.
--
-- The single casing convention from here on is WHAT EF WRITES: the PascalCase enum
-- member name. EF reads stay case-insensitive (EnumToStringConverter parses
-- case-insensitively), so this migration only has to move lowercase rows up.
--
-- Per column: normalize values, then fix the column defaults (0001/0004 are immutable
-- and shipped lowercase), then add a CHECK so a misspelled or lowercase enum write
-- fails loudly at the database instead of becoming an invisible filter miss. The CHECK
-- targets members of the C# enums only. `drafts.status` is deliberately UNTOUCHED:
-- the app still persists 'draft'/'review'/'published' raw strings there (no enum).
--
-- Idempotent on values and on structure (IF NOT EXISTS guards everywhere); re-runnable.

-- users.display_name_mode: Anonymous | Pseudonymous | RealName
UPDATE users SET display_name_mode = 'Anonymous' WHERE lower(display_name_mode) = 'anonymous' AND display_name_mode <> 'Anonymous';
UPDATE users SET display_name_mode = 'Pseudonymous' WHERE lower(display_name_mode) = 'pseudonymous' AND display_name_mode <> 'Pseudonymous';
UPDATE users SET display_name_mode = 'RealName' WHERE lower(display_name_mode) = 'real_name' AND display_name_mode <> 'RealName';

-- users.location_visibility: Hidden | Country | RegionCity
UPDATE users SET location_visibility = 'Hidden' WHERE lower(location_visibility) = 'hidden' AND location_visibility <> 'Hidden';
UPDATE users SET location_visibility = 'Country' WHERE lower(location_visibility) = 'country' AND location_visibility <> 'Country';
UPDATE users SET location_visibility = 'RegionCity' WHERE lower(location_visibility) = 'region_city' AND location_visibility <> 'RegionCity';

-- users.bookshelf_visibility: Public | Private
UPDATE users SET bookshelf_visibility = 'Public' WHERE lower(bookshelf_visibility) = 'public' AND bookshelf_visibility <> 'Public';
UPDATE users SET bookshelf_visibility = 'Private' WHERE lower(bookshelf_visibility) = 'private' AND bookshelf_visibility <> 'Private';

-- bookshelf_entries.status: Reading | Finished | Wishlist
UPDATE bookshelf_entries SET status = 'Reading' WHERE lower(status) = 'reading' AND status <> 'Reading';
UPDATE bookshelf_entries SET status = 'Finished' WHERE lower(status) = 'finished' AND status <> 'Finished';
UPDATE bookshelf_entries SET status = 'Wishlist' WHERE lower(status) = 'wishlist' AND status <> 'Wishlist';

-- bookshelf_entries.visibility: Public | Private
UPDATE bookshelf_entries SET visibility = 'Public' WHERE lower(visibility) = 'public' AND visibility <> 'Public';
UPDATE bookshelf_entries SET visibility = 'Private' WHERE lower(visibility) = 'private' AND visibility <> 'Private';

-- conversations.topic_type: General | Chapter | Theme | Question
UPDATE conversations SET topic_type = 'General' WHERE lower(topic_type) = 'general' AND topic_type <> 'General';
UPDATE conversations SET topic_type = 'Chapter' WHERE lower(topic_type) = 'chapter' AND topic_type <> 'Chapter';
UPDATE conversations SET topic_type = 'Theme' WHERE lower(topic_type) = 'theme' AND topic_type <> 'Theme';
UPDATE conversations SET topic_type = 'Question' WHERE lower(topic_type) = 'question' AND topic_type <> 'Question';

-- messages.status: Visible | Muted | Deleted
UPDATE messages SET status = 'Visible' WHERE lower(status) = 'visible' AND status <> 'Visible';
UPDATE messages SET status = 'Muted' WHERE lower(status) = 'muted' AND status <> 'Muted';
UPDATE messages SET status = 'Deleted' WHERE lower(status) = 'deleted' AND status <> 'Deleted';

-- message_reports.status: Open | ResolvedActioned | ResolvedDismissed
UPDATE message_reports SET status = 'Open' WHERE lower(status) = 'open' AND status <> 'Open';
UPDATE message_reports SET status = 'ResolvedActioned'
  WHERE lower(status) IN ('resolved_actioned', 'resolvedactioned') AND status <> 'ResolvedActioned';
UPDATE message_reports SET status = 'ResolvedDismissed'
  WHERE lower(status) IN ('resolved_dismissed', 'resolveddismissed') AND status <> 'ResolvedDismissed';

-- message_reactions.kind: Insightful | Funny | Helpful
UPDATE message_reactions SET kind = 'Insightful' WHERE lower(kind) = 'insightful' AND kind <> 'Insightful';
UPDATE message_reactions SET kind = 'Funny' WHERE lower(kind) = 'funny' AND kind <> 'Funny';
UPDATE message_reactions SET kind = 'Helpful' WHERE lower(kind) = 'helpful' AND kind <> 'Helpful';

-- circle_memberships.role: Member | Moderator
UPDATE circle_memberships SET role = 'Member' WHERE lower(role) = 'member' AND role <> 'Member';
UPDATE circle_memberships SET role = 'Moderator' WHERE lower(role) = 'moderator' AND role <> 'Moderator';

-- circle_messages.status: Visible | Muted | Deleted
UPDATE circle_messages SET status = 'Visible' WHERE lower(status) = 'visible' AND status <> 'Visible';
UPDATE circle_messages SET status = 'Muted' WHERE lower(status) = 'muted' AND status <> 'Muted';
UPDATE circle_messages SET status = 'Deleted' WHERE lower(status) = 'deleted' AND status <> 'Deleted';

-- circle_reactions.kind: Insightful | Funny | Helpful
UPDATE circle_reactions SET kind = 'Insightful' WHERE lower(kind) = 'insightful' AND kind <> 'Insightful';
UPDATE circle_reactions SET kind = 'Funny' WHERE lower(kind) = 'funny' AND kind <> 'Funny';
UPDATE circle_reactions SET kind = 'Helpful' WHERE lower(kind) = 'helpful' AND kind <> 'Helpful';

-- user_badges.kind maps straight member names ('NestedStreak100' is the only
-- multi-word outlier and matches its enum member exactly). Unknown spellings are
-- left alone for the CHECK violations to surface; no silent coercion.
UPDATE user_badges SET kind = 'FiveBooks' WHERE kind = 'five_books';
UPDATE user_badges SET kind = 'TenBooks' WHERE kind = 'ten_books';
UPDATE user_badges SET kind = 'TwentyFiveBooks' WHERE kind = 'twenty_five_books';
UPDATE user_badges SET kind = 'FiftyBooks' WHERE kind = 'fifty_books';
UPDATE user_badges SET kind = 'HundredBooks' WHERE kind = 'hundred_books';
UPDATE user_badges SET kind = 'Streak3' WHERE kind = 'streak_3';
UPDATE user_badges SET kind = 'Streak7' WHERE kind = 'streak_7';
UPDATE user_badges SET kind = 'Streak30' WHERE kind = 'streak_30';
UPDATE user_badges SET kind = 'Streak100' WHERE kind = 'streak_100';
UPDATE user_badges SET kind = 'FirstBook' WHERE kind = 'first_book';
UPDATE user_badges SET kind = 'FirstCircle' WHERE kind = 'first_circle';
UPDATE user_badges SET kind = 'FirstReview' WHERE kind = 'first_review';
UPDATE user_badges SET kind = 'FirstMessage' WHERE kind = 'first_message';
UPDATE user_badges SET kind = 'NightOwl' WHERE kind = 'night_owl';
UPDATE user_badges SET kind = 'EarlyBird' WHERE kind = 'early_bird';
UPDATE user_badges SET kind = 'Globetrotter' WHERE kind = 'globetrotter';
UPDATE user_badges SET kind = 'CircleStreak7' WHERE kind IN ('circle_streak_7', 'circlestreak7');
UPDATE user_badges SET kind = 'CircleStreak30' WHERE kind IN ('circle_streak_30', 'circlestreak30');

-- Defaults written by 0001/0004 (immutable, already applied) used lowercase values,
-- so new raw-SQL rows would reintroduce the drift. Point them at the EF convention.
ALTER TABLE users ALTER COLUMN display_name_mode SET DEFAULT 'Anonymous';
ALTER TABLE users ALTER COLUMN location_visibility SET DEFAULT 'RegionCity';
ALTER TABLE users ALTER COLUMN bookshelf_visibility SET DEFAULT 'Public';
ALTER TABLE bookshelf_entries ALTER COLUMN visibility SET DEFAULT 'Public';
ALTER TABLE conversations ALTER COLUMN topic_type SET DEFAULT 'General';
ALTER TABLE messages ALTER COLUMN status SET DEFAULT 'Visible';
ALTER TABLE message_reports ALTER COLUMN status SET DEFAULT 'Open';
ALTER TABLE circle_memberships ALTER COLUMN role SET DEFAULT 'Member';
ALTER TABLE circle_messages ALTER COLUMN status SET DEFAULT 'Visible';


-- Enum-domain CHECKs: a misspelled or lowercase enum write must fail loudly at the
-- database instead of becoming an invisible filter miss. Guarded by DO blocks so an
-- old database with stray values cannot wedge the migration; the UPDATEs above have
-- already repaired the known spellings. Each guard checks its own conrelid so a
-- duplicate constraint name on another table cannot mask a missing one here.
-- users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_users_display_name_mode' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT ck_users_display_name_mode
      CHECK (display_name_mode IN ('Anonymous', 'Pseudonymous', 'RealName'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_users_location_visibility' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT ck_users_location_visibility
      CHECK (location_visibility IN ('Hidden', 'Country', 'RegionCity'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_users_bookshelf_visibility' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users ADD CONSTRAINT ck_users_bookshelf_visibility
      CHECK (bookshelf_visibility IN ('Public', 'Private'));
  END IF;
END $$;

-- bookshelf_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_shelf_status' AND conrelid = 'bookshelf_entries'::regclass
  ) THEN
    ALTER TABLE bookshelf_entries ADD CONSTRAINT ck_shelf_status
      CHECK (status IN ('Reading', 'Finished', 'Wishlist'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_shelf_visibility' AND conrelid = 'bookshelf_entries'::regclass
  ) THEN
    ALTER TABLE bookshelf_entries ADD CONSTRAINT ck_shelf_visibility
      CHECK (visibility IN ('Public', 'Private'));
  END IF;
END $$;

-- conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_conversations_topic_type' AND conrelid = 'conversations'::regclass
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT ck_conversations_topic_type
      CHECK (topic_type IN ('General', 'Chapter', 'Theme', 'Question'));
  END IF;
END $$;

-- messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_messages_status' AND conrelid = 'messages'::regclass
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT ck_messages_status
      CHECK (status IN ('Visible', 'Muted', 'Deleted'));
  END IF;
END $$;

-- message_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_reports_status' AND conrelid = 'message_reports'::regclass
  ) THEN
    ALTER TABLE message_reports ADD CONSTRAINT ck_reports_status
      CHECK (status IN ('Open', 'ResolvedActioned', 'ResolvedDismissed'));
  END IF;
END $$;

-- message_reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_reaction_kind' AND conrelid = 'message_reactions'::regclass
  ) THEN
    ALTER TABLE message_reactions ADD CONSTRAINT ck_reaction_kind
      CHECK (kind IN ('Insightful', 'Funny', 'Helpful'));
  END IF;
END $$;

-- circle_memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_membership_role' AND conrelid = 'circle_memberships'::regclass
  ) THEN
    ALTER TABLE circle_memberships ADD CONSTRAINT ck_membership_role
      CHECK (role IN ('Member', 'Moderator'));
  END IF;
END $$;

-- circle_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_circle_messages_status' AND conrelid = 'circle_messages'::regclass
  ) THEN
    ALTER TABLE circle_messages ADD CONSTRAINT ck_circle_messages_status
      CHECK (status IN ('Visible', 'Muted', 'Deleted'));
  END IF;
END $$;

-- circle_reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_circle_reaction_kind' AND conrelid = 'circle_reactions'::regclass
  ) THEN
    ALTER TABLE circle_reactions ADD CONSTRAINT ck_circle_reaction_kind
      CHECK (kind IN ('Insightful', 'Funny', 'Helpful'));
  END IF;
END $$;

-- user_badges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_badge_kind' AND conrelid = 'user_badges'::regclass
  ) THEN
    ALTER TABLE user_badges ADD CONSTRAINT ck_badge_kind
      CHECK (kind IN ('FirstBook', 'FiveBooks', 'TenBooks', 'TwentyFiveBooks', 'FiftyBooks',
        'HundredBooks', 'Streak3', 'Streak7', 'Streak30', 'Streak100', 'FirstCircle',
        'FirstReview', 'FirstMessage', 'NightOwl', 'EarlyBird', 'Globetrotter',
        'CircleStreak7', 'CircleStreak30'));
  END IF;
END $$;

-- The partial index predating the drift matched seeded rows only; it is useless for
-- EF-written rows. Rebuild it against the normalized values.
DROP INDEX IF EXISTS ix_shelf_reading_public;
CREATE INDEX IF NOT EXISTS ix_shelf_reading_public
    ON bookshelf_entries (book_id) WHERE status = 'Reading' AND visibility = 'Public';

