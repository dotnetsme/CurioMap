-- 0004_reading_circles.sql
-- Reading Circles: small, intimate book-club style groups around books.
-- Circles are place-adjacent (discoverable), prompted, and ephemeral by default.

CREATE TABLE IF NOT EXISTS reading_circles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    handle          text NOT NULL,
    name            text NOT NULL,
    description     text,
    book_id         uuid REFERENCES books(id) ON DELETE SET NULL,
    max_members     integer CHECK (max_members IS NULL OR max_members BETWEEN 2 AND 100),
    next_meeting_at timestamptz,
    created_by      uuid NOT NULL REFERENCES users(id),
    is_archived     boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    last_activity_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_reading_circles_handle ON reading_circles (lower(handle));
CREATE INDEX IF NOT EXISTS ix_reading_circles_book ON reading_circles (book_id) WHERE book_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_reading_circles_active ON reading_circles (last_activity_at DESC) WHERE NOT is_archived;

CREATE TABLE IF NOT EXISTS circle_memberships (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id   uuid NOT NULL REFERENCES reading_circles(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id),
    role        text NOT NULL DEFAULT 'Member',
    joined_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (circle_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_circle_memberships_circle ON circle_memberships (circle_id);
CREATE INDEX IF NOT EXISTS ix_circle_memberships_user ON circle_memberships (user_id);

CREATE TABLE IF NOT EXISTS circle_messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id   uuid NOT NULL REFERENCES reading_circles(id) ON DELETE CASCADE,
    author_id   uuid NOT NULL REFERENCES users(id),
    content     text NOT NULL,
    status      text NOT NULL DEFAULT 'Visible',
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_circle_messages_circle_time ON circle_messages (circle_id, created_at DESC);

CREATE TABLE IF NOT EXISTS circle_reactions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  uuid NOT NULL REFERENCES circle_messages(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id),
    kind        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (message_id, user_id, kind)
);
CREATE INDEX IF NOT EXISTS ix_circle_reactions_message ON circle_reactions (message_id);

-- Seed a starter circle for existing users
INSERT INTO reading_circles (handle, name, description, max_members, created_by)
SELECT 'starter-circle', 'The Welcome Circle', 'A friendly place to meet fellow readers. Say hello!', 50, id
FROM users ORDER BY created_at ASC LIMIT 1
ON CONFLICT DO NOTHING;