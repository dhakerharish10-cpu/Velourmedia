/*
# Admin auto-promotion via env-configured ADMIN_EMAIL

1. New Columns on `profiles`
- `admin_email` (text, nullable) — stores the configured admin email for verification
- `admin_secret_key` (text, nullable) — stores the configured admin secret key

2. New RPC: `promote_self_to_admin(p_email text, p_secret_key text)`
- Called by an authenticated user whose email matches the configured ADMIN_EMAIL.
- Verifies the provided secret key matches the one stored in platform_settings (or a constant).
- Sets is_admin = true on the caller's profile.
- This is a one-time promotion; subsequent calls are idempotent.

3. New RPC: `is_platform_admin(p_email text)`
- Returns true if the given email matches the configured admin email.
- Used by the client to determine if auto-promotion should be attempted.

4. Platform settings: store admin_email and admin_secret_key
- Adds columns to platform_settings table for admin credentials.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'admin_email'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN admin_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_settings' AND column_name = 'admin_secret_key'
  ) THEN
    ALTER TABLE platform_settings ADD COLUMN admin_secret_key text;
  END IF;
END $$;

-- Set default admin credentials if not already set
UPDATE platform_settings
SET admin_email = 'admin@velourmedia.com',
    admin_secret_key = 'VLADM-2026-S3cr3t-K3y-X9f2'
WHERE id = 1 AND admin_email IS NULL;

-- ============ promote_self_to_admin ============
DROP FUNCTION IF EXISTS promote_self_to_admin(text, text);

CREATE OR REPLACE FUNCTION promote_self_to_admin(p_email text, p_secret_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_email text;
  v_stored_key text;
BEGIN
  -- Get configured admin credentials from platform_settings
  SELECT admin_email, admin_secret_key INTO v_stored_email, v_stored_key
  FROM platform_settings WHERE id = 1;

  -- Verify the caller's email matches admin email and secret key matches
  IF v_stored_email IS NULL OR v_stored_key IS NULL THEN
    RETURN false;
  END IF;

  IF lower(trim(p_email)) != lower(trim(v_stored_email)) THEN
    RETURN false;
  END IF;

  IF p_secret_key != v_stored_key THEN
    RETURN false;
  END IF;

  -- Promote the caller's profile
  UPDATE profiles
  SET is_admin = true
  WHERE id = auth.uid() OR owner_id = auth.uid();

  RETURN true;
END;
$$;

-- ============ is_platform_admin ============
DROP FUNCTION IF EXISTS is_platform_admin(text);

CREATE OR REPLACE FUNCTION is_platform_admin(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_email text;
BEGIN
  SELECT admin_email INTO v_stored_email
  FROM platform_settings WHERE id = 1;

  RETURN v_stored_email IS NOT NULL AND lower(trim(p_email)) = lower(trim(v_stored_email));
END;
$$;

REVOKE EXECUTE ON FUNCTION promote_self_to_admin(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION promote_self_to_admin(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION is_platform_admin(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION is_platform_admin(text) TO authenticated;
