# Privacy policy

CurioMap is **privacy-first by architecture**, not by policy note.

## What we store
- **Email** — only for sign-in.
- **Generated handle + curated avatar id** — your public identity; avatar uploads are not
  supported (no moderation surface, no EXIF surprises).
- **Optional bio / real name** — real name is opt-in and always reversible; it is shown only
  in `real_name` mode.
- **Coarse location** — country, region, city, plus a coordinate fuzzed to a ~15 km grid
  (0.15°). Exact coordinates are **never** stored or served.

## Location visibility
- `region_city` (default) — city shows on the map and in “readers near you”.
- `country` — only the country is ever displayed.
- `hidden` — excluded from nearby discovery and the global heatmap entirely.

## What public profiles never include
Email, exact coordinates (or any coordinates), private bookshelf entries, and anything
you marked private.

## Data retention
- Conversations auto-archive after **30 days** of inactivity (read-only).
- Delete your account yourself under **Settings → Delete account**: your profile, shelf, ratings and everything
  you posted are removed. Threads you started that others replied to remain, shown as "deleted_reader".
  We keep aggregate region counters only (never individuals).
- No tracking pixels, no device fingerprints, no third-party ad SDKs.

## What we do not do
Sell data. Build advertising profiles. Share reading history with third parties.