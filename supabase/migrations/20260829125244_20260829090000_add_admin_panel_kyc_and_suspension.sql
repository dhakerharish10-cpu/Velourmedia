/*
# Admin Panel: KYC status, account suspension, admin stats RPC

1. New Columns on `profiles`
- `kyc_status` (text, default 'not_submitted') — tracks KYC review state:
  'not_submitted', 'pending', 'approved', 'rejected'
- `is_suspended` (boolean, default false) — admin can suspend a creator account

2. New RPC: `get_admin_stats`
- Returns aggregate platform metrics: total_gross_volume, total_platform_profit,
  active_creators_count, pending_kyc_count, pending_payouts_count.

3. New RPC: `admin_set_kyc_status(p_profile_id uuid, p_status text)`
- Updates a creator's KYC status. Admin-only.

4. New RPC: `admin_set_suspension(p_profile_id uuid, p_suspend boolean)`
- Suspends or reactivates a creator account. Admin-only.

5. New RPC: `admin_mark_payout_paid(p_payout_id uuid)`
- Marks a payout as 'success' with processed_at = now(). Admin-only.

All RPCs verify auth.uid() has is_admin = true.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'kyc_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN kyc_status text NOT NULL DEFAULT 'not_submitted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_suspended'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_suspended boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============ get_admin_stats ============
DROP FUNCTION IF EXISTS get_admin_stats();

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
  total_gross_volume numeric,
  total_platform_profit numeric,
  active_creators_count bigint,
  pending_kyc_count bigint,
  pending_payouts_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(amount_paid) FROM purchases
    ), 0) + COALESCE((
      SELECT SUM(amount) FROM subscriptions WHERE status = 'active'
    ), 0),
    COALESCE((
      SELECT SUM(platform_fee) FROM purchases
    ), 0) + COALESCE((
      SELECT SUM(platform_fee) FROM subscriptions WHERE status = 'active'
    ), 0),
    (
      SELECT COUNT(*) FROM profiles WHERE is_primary = true AND is_suspended = false
    ),
    (
      SELECT COUNT(*) FROM profiles WHERE kyc_status = 'pending'
    ),
    (
      SELECT COUNT(*) FROM payouts WHERE status IN ('pending', 'processing')
    );
END;
$$;

-- ============ admin_set_kyc_status ============
DROP FUNCTION IF EXISTS admin_set_kyc_status(uuid, text);

CREATE OR REPLACE FUNCTION admin_set_kyc_status(p_profile_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE profiles SET kyc_status = p_status WHERE id = p_profile_id;
END;
$$;

-- ============ admin_set_suspension ============
DROP FUNCTION IF EXISTS admin_set_suspension(uuid, boolean);

CREATE OR REPLACE FUNCTION admin_set_suspension(p_profile_id uuid, p_suspend boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE profiles SET is_suspended = p_suspend WHERE id = p_profile_id;
END;
$$;

-- ============ admin_mark_payout_paid ============
DROP FUNCTION IF EXISTS admin_mark_payout_paid(uuid);

CREATE OR REPLACE FUNCTION admin_mark_payout_paid(p_payout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE payouts
  SET status = 'success', processed_at = NOW()
  WHERE id = p_payout_id;
END;
$$;

-- Grant execute to authenticated
REVOKE EXECUTE ON FUNCTION get_admin_stats() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_set_kyc_status(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_kyc_status(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_set_suspension(uuid, boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_set_suspension(uuid, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_mark_payout_paid(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_mark_payout_paid(uuid) TO authenticated;
