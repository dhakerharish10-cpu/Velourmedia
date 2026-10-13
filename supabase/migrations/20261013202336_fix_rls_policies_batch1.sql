/*
# Fix RLS Policies: access_tokens, content_media, content_reports, platform_settings, sales_visibility, transactions

## Changes

1. access_tokens: Replace open anon SELECT with token-based lookup (anyone with the token can verify it; no bulk reads)
2. content_media: SELECT only allowed for published content (was USING(true) — leaked unpublished media)
3. content_reports: SELECT/UPDATE restricted to admin only (was open to all authenticated); DELETE added for admin
4. platform_settings: anon SELECT added (needed for public display); INSERT/DELETE restricted to admin
5. sales_visibility: SELECT restricted to admin only (was open to all authenticated); INSERT/UPDATE/DELETE added for admin
6. transactions: UPDATE/DELETE restricted to admin only (users should not edit their own payment records)
*/

-- 1. access_tokens: restrict to token-based lookup only
DROP POLICY IF EXISTS "anon_read_access_tokens" ON access_tokens;
-- No SELECT policy for anon or authenticated — access is via edge function with service role key only
-- The edge function bypasses RLS, so no client-side SELECT is needed
REVOKE SELECT ON access_tokens FROM anon;
REVOKE INSERT ON access_tokens FROM anon;
REVOKE UPDATE ON access_tokens FROM anon;
REVOKE DELETE ON access_tokens FROM anon;
REVOKE SELECT ON access_tokens FROM authenticated;
REVOKE INSERT ON access_tokens FROM authenticated;
REVOKE UPDATE ON access_tokens FROM authenticated;
REVOKE DELETE ON access_tokens FROM authenticated;

-- 2. content_media: only allow SELECT on media belonging to published content
DROP POLICY IF EXISTS "read_content_media" ON content_media;
CREATE POLICY "read_content_media" ON content_media FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM content c
      WHERE c.id = content_media.content_id AND c.is_published = true
    )
  );

-- 3. content_reports: restrict to admin only
DROP POLICY IF EXISTS "select_content_reports" ON content_reports;
DROP POLICY IF EXISTS "update_content_reports" ON content_reports;
CREATE POLICY "admin_select_content_reports" ON content_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY "admin_update_content_reports" ON content_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY "admin_delete_content_reports" ON content_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- 4. platform_settings: anon can read, only admin can insert/update/delete
DROP POLICY IF EXISTS "select_platform_settings" ON platform_settings;
DROP POLICY IF EXISTS "update_platform_settings_admin" ON platform_settings;
CREATE POLICY "read_platform_settings" ON platform_settings FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "admin_update_platform_settings" ON platform_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY "admin_insert_platform_settings" ON platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY "admin_delete_platform_settings" ON platform_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- 5. sales_visibility: restrict to admin only
DROP POLICY IF EXISTS "select_sales_visibility" ON sales_visibility;
CREATE POLICY "admin_select_sales_visibility" ON sales_visibility FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY "admin_insert_sales_visibility" ON sales_visibility FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY "admin_update_sales_visibility" ON sales_visibility FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY "admin_delete_sales_visibility" ON sales_visibility FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- 6. transactions: restrict UPDATE/DELETE to admin only (users should not edit their own payment records)
DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "admin_update_transactions" ON transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
CREATE POLICY "admin_delete_transactions" ON transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
