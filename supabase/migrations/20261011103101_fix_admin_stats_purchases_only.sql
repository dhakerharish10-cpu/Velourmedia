-- Fix get_admin_stats to calculate from purchases only (Whop one-time payments)
-- SECURITY DEFINER ensures admin can read aggregate stats even with RLS
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
    COALESCE((SELECT SUM(amount_paid) FROM purchases), 0),
    COALESCE((SELECT SUM(platform_fee) FROM purchases), 0),
    (SELECT COUNT(*) FROM profiles WHERE is_primary = true AND is_suspended = false),
    (SELECT COUNT(*) FROM profiles WHERE kyc_status = 'pending'),
    (SELECT COUNT(*) FROM payouts WHERE status IN ('pending', 'processing'));
END;
$$;
