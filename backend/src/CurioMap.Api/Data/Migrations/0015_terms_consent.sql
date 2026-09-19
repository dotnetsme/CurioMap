-- Terms of Use acceptance tracking (v1.0, docs/terms-of-use.md).
-- Nullable columns keep the migration backward-compatible with existing rows
-- (legacy users get backfilled to NULL and are prompted to re-consent on next
-- login/me-fetch, rather than being hard-locked out of their accounts).
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
CREATE INDEX IF NOT EXISTS ix_users_terms_version ON users (terms_version);
