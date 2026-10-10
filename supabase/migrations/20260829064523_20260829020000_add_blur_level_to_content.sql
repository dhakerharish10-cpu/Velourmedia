/*
# Add blur_level column to content table

1. Purpose
   - Adds a `blur_level` column to the `content` table to control preview blur intensity for locked posts.
   - Values: 'low' (normal/light blur), 'medium' (standard blur), 'hard' (heavy blur).
   - Defaults to 'medium' for existing and new posts.

2. Changes
   - `content.blur_level` (text, NOT NULL, DEFAULT 'medium') — controls how strongly the preview thumbnail is blurred for non-purchasers.

3. Security
   - No RLS policy changes. The existing content policies already govern read/write access.
   - The column is writable by the content owner via the existing UPDATE policy.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'blur_level'
  ) THEN
    ALTER TABLE content ADD COLUMN blur_level text NOT NULL DEFAULT 'medium';
  END IF;
END $$;
