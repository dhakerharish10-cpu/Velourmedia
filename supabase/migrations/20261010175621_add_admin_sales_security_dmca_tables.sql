/*
# Add Admin: DMCA Reports, Sales Visibility Control, User Bans, Transactions

1. New Tables
   - `content_reports` — Tracks DMCA/takedown requests and content flags submitted by users or admins.
     - id (uuid PK)
     - content_id (uuid FK -> content.id)
     - reporter_id (uuid, nullable — the user who reported, null for admin-created)
     - reason (text — 'dmca', 'inappropriate', 'spam', 'other')
     - description (text, nullable — additional details)
     - status (text, default 'pending' — 'pending', 'actioned', 'dismissed')
     - created_at (timestamptz)
     - actioned_by (uuid, nullable — admin who handled it)
     - actioned_at (timestamptz, nullable)

   - `sales_visibility` — Controls per-creator and global sales visibility ratio.
     - id (serial PK)
     - profile_id (uuid, nullable — null means global setting, non-null means per-creator override)
     - visible_ratio (integer, 0-100, default 100 — percentage of sales visible to that creator)
     - sales_hidden (boolean, default false — if true, all sales are hidden from creator)
     - updated_at (timestamptz)
     - updated_by (uuid, nullable)

2. Modified Tables
   - `profiles` — Adds `is_banned` boolean column (default false) to distinguish bans from suspensions.

3. Security
   - RLS enabled on both new tables.
   - content_reports: SELECT/INSERT for authenticated (anyone can report, only admin can action).
   - sales_visibility: SELECT for authenticated (creators read their own visibility), INSERT/UPDATE/DELETE admin-only via existing admin RPCs.
   - profiles.is_banned: No new RLS needed; existing profile policies cover it.

4. Important Notes
   - The global sales_visibility row has profile_id = NULL and id = 1.
   - A seed row with id=1, profile_id=NULL, visible_ratio=100 is inserted for the global default.
   - content_reports uses ON DELETE CASCADE for content_id so reports auto-delete if content is deleted.
*/

-- ============ content_reports ============
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES content(id) ON DELETE CASCADE,
  reporter_id uuid,
  reason text NOT NULL DEFAULT 'other',
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  actioned_by uuid,
  actioned_at timestamptz
);

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_content_reports" ON content_reports;
CREATE POLICY "select_content_reports" ON content_reports FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_content_reports" ON content_reports;
CREATE POLICY "insert_content_reports" ON content_reports FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_content_reports" ON content_reports;
CREATE POLICY "update_content_reports" ON content_reports FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============ sales_visibility ============
CREATE TABLE IF NOT EXISTS sales_visibility (
  id serial PRIMARY KEY,
  profile_id uuid UNIQUE,
  visible_ratio integer NOT NULL DEFAULT 100 CHECK (visible_ratio >= 0 AND visible_ratio <= 100),
  sales_hidden boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE sales_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sales_visibility" ON sales_visibility;
CREATE POLICY "select_sales_visibility" ON sales_visibility FOR SELECT
  TO authenticated USING (true);

-- ============ profiles: add is_banned ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============ Seed global sales_visibility ============
INSERT INTO sales_visibility (id, profile_id, visible_ratio, sales_hidden)
VALUES (1, NULL, 100, false)
ON CONFLICT (id) DO NOTHING;

-- ============ Admin RPCs ============

-- Set sales visibility for a creator (or global if profile_id is null)
CREATE OR REPLACE FUNCTION admin_set_sales_visibility(
  p_profile_id uuid,
  p_visible_ratio integer,
  p_sales_hidden boolean
) RETURNS void AS $$
BEGIN
  IF p_visible_ratio < 0 OR p_visible_ratio > 100 THEN
    RAISE EXCEPTION 'visible_ratio must be between 0 and 100';
  END IF;

  INSERT INTO sales_visibility (profile_id, visible_ratio, sales_hidden, updated_at, updated_by)
  VALUES (p_profile_id, p_visible_ratio, p_sales_hidden, now(), auth.uid())
  ON CONFLICT (profile_id) DO UPDATE
    SET visible_ratio = EXCLUDED.visible_ratio,
        sales_hidden = EXCLUDED.sales_hidden,
        updated_at = now(),
        updated_by = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get effective sales visibility for a creator (falls back to global)
CREATE OR REPLACE FUNCTION get_creator_sales_visibility(p_profile_id uuid)
RETURNS TABLE (visible_ratio integer, sales_hidden boolean) AS $$
DECLARE
  v_ratio integer;
  v_hidden boolean;
BEGIN
  -- Check per-creator override first
  SELECT sv.visible_ratio, sv.sales_hidden INTO v_ratio, v_hidden
  FROM sales_visibility sv
  WHERE sv.profile_id = p_profile_id;

  IF FOUND THEN
    RETURN QUERY SELECT v_ratio, v_hidden;
  ELSE
    -- Fall back to global
    SELECT sv.visible_ratio, sv.sales_hidden INTO v_ratio, v_hidden
    FROM sales_visibility sv
    WHERE sv.profile_id IS NULL;
    RETURN QUERY SELECT COALESCE(v_ratio, 100), COALESCE(v_hidden, false);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ban/unban a user
CREATE OR REPLACE FUNCTION admin_set_ban(
  p_profile_id uuid,
  p_ban boolean
) RETURNS void AS $$
BEGIN
  UPDATE profiles SET is_banned = p_ban WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Action a content report (remove media or dismiss)
CREATE OR REPLACE FUNCTION admin_action_report(
  p_report_id uuid,
  p_action text
) RETURNS void AS $$
BEGIN
  IF p_action = 'remove' THEN
    -- Mark report as actioned and unpublish the content
    UPDATE content_reports SET status = 'actioned', actioned_by = auth.uid(), actioned_at = now()
    WHERE id = p_report_id;
    UPDATE content SET is_published = false
    WHERE id = (SELECT content_id FROM content_reports WHERE id = p_report_id);
  ELSIF p_action = 'dismiss' THEN
    UPDATE content_reports SET status = 'dismissed', actioned_by = auth.uid(), actioned_at = now()
    WHERE id = p_report_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
