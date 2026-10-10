/*
# Add views_count and is_private to content table

1. Modified Tables
- `content`: add `views_count` (integer, default 0) — tracks how many times a post has been viewed.
- `content`: add `is_private` (boolean, default false) — when true, the post is hidden from the public feed and only accessible via direct link.

2. Security
- No new RLS policies needed; existing content policies already cover ownership.
- The `is_private` column is writable by the content owner (creator) via existing UPDATE policy.

3. Important Notes
- `views_count` is informational only; incrementing happens on the client read path.
- `is_private` replaces the conceptual "Make Private" toggle — when true, content is excluded from the public feed query.
*/
ALTER TABLE content ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;
ALTER TABLE content ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;