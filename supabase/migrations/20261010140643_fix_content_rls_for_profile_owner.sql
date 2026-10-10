/*
# Fix content table RLS policies to check profile ownership

## Problem
The content table's INSERT/UPDATE/DELETE RLS policies checked
`auth.uid() = creator_id`, but `creator_id` stores a profile ID
(from the `profiles` table), NOT the authenticated user's UID.
When a user uploads content under a profile whose `id` differs
from their `auth.uid()` (which is the common case — profiles have
their own UUIDs with a separate `owner_id` column), the INSERT
fails with "new row violates row-level security policy" and the
upload appears broken.

## Fix
Rewrite the INSERT, UPDATE, and DELETE policies to check ownership
through the profiles table: `EXISTS (SELECT 1 FROM profiles WHERE
profiles.id = content.creator_id AND profiles.owner_id = auth.uid())`.
The SELECT policy (read published content) is unchanged — it allows
anon + authenticated to read published content, which is correct.

## Tables affected
- `content` — RLS policies updated (no schema/column changes)

## Security
- INSERT: authenticated users can only insert content for profiles they own
- UPDATE: authenticated users can only update content for profiles they own
- DELETE: authenticated users can only delete content for profiles they own
- SELECT: unchanged (anon + authenticated can read published content)
*/

-- Drop and recreate the three ownership-scoped policies
DROP POLICY IF EXISTS "insert_own_content" ON content;
DROP POLICY IF EXISTS "update_own_content" ON content;
DROP POLICY IF EXISTS "delete_own_content" ON content;

CREATE POLICY "insert_own_content" ON content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = content.creator_id
      AND profiles.owner_id = auth.uid()
    )
  );

CREATE POLICY "update_own_content" ON content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = content.creator_id
      AND profiles.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = content.creator_id
      AND profiles.owner_id = auth.uid()
    )
  );

CREATE POLICY "delete_own_content" ON content FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = content.creator_id
      AND profiles.owner_id = auth.uid()
    )
  );