-- The demo-reader seeds (0013, 0014) were written with lowercase snake_case enum text ('reading',
-- 'public', 'region_city', ...), but EF Core stores and queries these columns as the enum member
-- names ('Reading', 'Public', 'RegionCity', ...). Every discovery query compares against the member
-- name, so on a fresh database the demo readers were invisible and the map was empty.
--
-- Shipped seed files must not change, so this normalises the values afterwards. It only touches rows
-- still holding the lowercase form, so it is idempotent and a no-op on databases that never had them.
UPDATE bookshelf_entries
SET status = CASE status
        WHEN 'reading'  THEN 'Reading'
        WHEN 'finished' THEN 'Finished'
        WHEN 'wishlist' THEN 'Wishlist'
        ELSE status END,
    visibility = CASE visibility
        WHEN 'public'  THEN 'Public'
        WHEN 'private' THEN 'Private'
        ELSE visibility END
WHERE status IN ('reading', 'finished', 'wishlist')
   OR visibility IN ('public', 'private');

UPDATE users
SET display_name_mode = CASE display_name_mode
        WHEN 'anonymous'    THEN 'Anonymous'
        WHEN 'pseudonymous' THEN 'Pseudonymous'
        WHEN 'real_name'    THEN 'RealName'
        ELSE display_name_mode END,
    location_visibility = CASE location_visibility
        WHEN 'hidden'      THEN 'Hidden'
        WHEN 'country'     THEN 'Country'
        WHEN 'region_city' THEN 'RegionCity'
        ELSE location_visibility END,
    bookshelf_visibility = CASE bookshelf_visibility
        WHEN 'public'  THEN 'Public'
        WHEN 'private' THEN 'Private'
        ELSE bookshelf_visibility END
WHERE display_name_mode IN ('anonymous', 'pseudonymous', 'real_name')
   OR location_visibility IN ('hidden', 'country', 'region_city')
   OR bookshelf_visibility IN ('public', 'private');
