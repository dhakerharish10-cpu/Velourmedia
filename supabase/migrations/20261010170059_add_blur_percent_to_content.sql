/*
# Add blur_percent column to content table

1. Purpose
   - Adds a `blur_percent` column to the `content` table to control preview blur intensity on a 0-100 scale.
   - Values: 0 (no blur / completely clear) to 100 (maximum blur, 24px CSS blur).
   - Existing rows are migrated from the old text `blur_level` column: 'low' -> 20, 'medium' -> 60, 'hard' -> 90.
   - New rows default to 60 (equivalent to the old 'medium' default).

2. Changes
   - `content.blur_percent` (integer, NOT NULL, DEFAULT 60) — 0-100 scale controlling preview blur.
   - Data migration from existing `blur_level` text values.

3. Security
   - No RLS policy changes. The existing content policies already govern read/write access.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'blur_percent'
  ) THEN
    ALTER TABLE content ADD COLUMN blur_percent integer NOT NULL DEFAULT 60;
  END IF;
END $$;

-- Migrate existing rows from text blur_level to numeric blur_percent
UPDATE content
SET blur_percent = CASE
  WHEN blur_level = 'low' THEN 20
  WHEN blur_level = 'hard' THEN 90
  ELSE 60
END
WHERE blur_percent = 60 AND blur_level IS NOT NULL;
