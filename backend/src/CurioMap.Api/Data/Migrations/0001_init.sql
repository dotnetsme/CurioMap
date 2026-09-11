-- CurioMap initial schema (0001_init)
-- Applied by DbInitializer at startup; tracked in schema_migrations.
-- Postgres 14+ (Neon compatible). gen_random_uuid() is built-in (PG13+).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Coarse locations only: no exact coordinates, ever.
CREATE TABLE IF NOT EXISTS locations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country     text,
    region      text,
    city        text,
    lat_fuzzed  double precision,
    lng_fuzzed  double precision,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_locations_tuple
    ON locations (lower(coalesce(country, '')), lower(coalesce(region, '')), lower(coalesce(city, '')));

CREATE TABLE IF NOT EXISTS books (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    author          text NOT NULL,
    isbn            text,
    cover_url       text,
    description     text,
    affiliate_links jsonb NOT NULL DEFAULT '{}'::jsonb,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_books_isbn ON books (lower(isbn));
CREATE INDEX IF NOT EXISTS ix_books_title_trgm ON books USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_books_author_trgm ON books USING gin (author gin_trgm_ops);

CREATE TABLE IF NOT EXISTS users (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email                text NOT NULL,
    password_hash        text NOT NULL,
    handle               text NOT NULL,
    avatar_id            text NOT NULL DEFAULT 'curio-01',
    display_name_mode    text NOT NULL DEFAULT 'anonymous',
    real_name            text,
    bio                  text,
    is_author            boolean NOT NULL DEFAULT false,
    is_admin             boolean NOT NULL DEFAULT false,
    location_id          uuid REFERENCES locations(id) ON DELETE SET NULL,
    location_visibility  text NOT NULL DEFAULT 'region_city',
    bookshelf_visibility text NOT NULL DEFAULT 'public',
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_handle ON users (lower(handle));
CREATE INDEX IF NOT EXISTS ix_users_location ON users (location_id);

CREATE TABLE IF NOT EXISTS bookshelf_entries (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id     uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status      text NOT NULL,
    visibility  text NOT NULL DEFAULT 'public',
    started_at  timestamptz,
    finished_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_shelf_user_book ON bookshelf_entries (user_id, book_id);
CREATE INDEX IF NOT EXISTS ix_shelf_book ON bookshelf_entries (book_id);
CREATE INDEX IF NOT EXISTS ix_shelf_reading_public
    ON bookshelf_entries (book_id) WHERE status = 'reading' AND visibility = 'public';

-- Self-publishing foundation (Phase 7): tables exist, features come later.
CREATE TABLE IF NOT EXISTS drafts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       text NOT NULL,
    description text,
    status      text NOT NULL DEFAULT 'draft',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_drafts_author ON drafts (author_id);

CREATE TABLE IF NOT EXISTS draft_chapters (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id   uuid NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    title      text NOT NULL,
    content    text,
    position   integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_chapters_draft ON draft_chapters (draft_id, position);

CREATE TABLE IF NOT EXISTS conversations (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id          uuid REFERENCES books(id) ON DELETE CASCADE,
    draft_id         uuid REFERENCES drafts(id) ON DELETE CASCADE,
    topic_type       text NOT NULL DEFAULT 'general',
    title            text NOT NULL,
    prompt_key       text,
    created_by       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_archived      boolean NOT NULL DEFAULT false,
    last_activity_at timestamptz NOT NULL DEFAULT now(),
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_conversations_book ON conversations (book_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS ix_conversations_draft ON conversations (draft_id);
CREATE INDEX IF NOT EXISTS ix_conversations_created_by ON conversations (created_by);

CREATE TABLE IF NOT EXISTS messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    author_id       uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    content         text NOT NULL,
    status          text NOT NULL DEFAULT 'visible',
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_messages_conversation ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS ix_messages_author ON messages (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS message_reactions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_reaction ON message_reactions (message_id, user_id, kind);
CREATE INDEX IF NOT EXISTS ix_reactions_message ON message_reactions (message_id);

CREATE TABLE IF NOT EXISTS message_reports (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    reason      text NOT NULL,
    status      text NOT NULL DEFAULT 'open',
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_report ON message_reports (message_id, reporter_id);
CREATE INDEX IF NOT EXISTS ix_reports_status ON message_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS follows (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_follow_no_self CHECK (follower_id <> followed_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_follow ON follows (follower_id, followed_id);
CREATE INDEX IF NOT EXISTS ix_follow_followed ON follows (followed_id);

CREATE TABLE IF NOT EXISTS activity_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            text NOT NULL,
    book_id         uuid REFERENCES books(id) ON DELETE SET NULL,
    conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
    message_id      uuid,
    payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_events_created ON activity_events (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_events_actor ON activity_events (actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_refresh_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS ix_refresh_user ON refresh_tokens (user_id);

