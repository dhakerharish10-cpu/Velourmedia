/*
# Add 7-day holding period earnings RPC + crypto network column

1. New Column on `profiles`
- `crypto_network` (text, default '') — the blockchain network for crypto payouts: 'TRC20', 'BEP20', 'ERC20'.

2. New RPC: `get_creator_balances`
- Returns pending_balance (net earnings from sales within last 7 days) and
  available_balance (net earnings from sales older than 7 days, minus already-paid payouts).
- Uses the same 70% net_to_creator figures from purchases and subscriptions.

3. Security
- No RLS changes needed — RPC uses auth.uid() for ownership filtering.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'crypto_network'
  ) THEN
    ALTER TABLE profiles ADD COLUMN crypto_network text NOT NULL DEFAULT '';
  END IF;
END $$;

DROP FUNCTION IF EXISTS get_creator_balances(p_profile_id uuid);

CREATE OR REPLACE FUNCTION get_creator_balances(p_profile_id uuid)
RETURNS TABLE (
  pending_balance numeric,
  available_balance numeric,
  lifetime_balance numeric,
  total_paid_out numeric,
  total_pending_payouts numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_pending_earnings numeric;
  v_available_earnings numeric;
  v_paid_out numeric;
  v_pending_payouts numeric;
BEGIN
  -- Verify the caller owns this profile
  SELECT COALESCE(owner_id, id) INTO v_owner_id
  FROM profiles WHERE id = p_profile_id;

  IF v_owner_id IS NULL OR (v_owner_id != auth.uid() AND p_profile_id != auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Pending: net earnings from purchases + subscriptions within the last 7 days
  SELECT COALESCE(SUM(pur.net_to_creator), 0) INTO v_pending_earnings
  FROM purchases pur
  JOIN content c ON c.id = pur.content_id
  WHERE c.creator_id = p_profile_id
    AND pur.created_at >= NOW() - INTERVAL '7 days';

  SELECT COALESCE(v_pending_earnings + SUM(sub.net_to_creator), v_pending_earnings) INTO v_pending_earnings
  FROM subscriptions sub
  WHERE sub.creator_id = p_profile_id
    AND sub.status = 'active'
    AND sub.created_at >= NOW() - INTERVAL '7 days';

  -- Available: net earnings older than 7 days
  SELECT COALESCE(SUM(pur.net_to_creator), 0) INTO v_available_earnings
  FROM purchases pur
  JOIN content c ON c.id = pur.content_id
  WHERE c.creator_id = p_profile_id
    AND pur.created_at < NOW() - INTERVAL '7 days';

  SELECT COALESCE(v_available_earnings + SUM(sub.net_to_creator), v_available_earnings) INTO v_available_earnings
  FROM subscriptions sub
  WHERE sub.creator_id = p_profile_id
    AND sub.status = 'active'
    AND sub.created_at < NOW() - INTERVAL '7 days';

  -- Payouts already processed or pending
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_paid_out
  FROM payouts WHERE profile_id = p_profile_id AND status = 'success';

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_pending_payouts
  FROM payouts WHERE profile_id = p_profile_id AND status IN ('pending', 'processing');

  -- Available balance = available earnings - already paid out - pending payout requests
  v_available_earnings := GREATEST(0, v_available_earnings - v_paid_out - v_pending_payouts);

  RETURN QUERY
  SELECT
    v_pending_earnings,
    v_available_earnings,
    v_pending_earnings + v_available_earnings + v_paid_out + v_pending_payouts,
    v_paid_out,
    v_pending_payouts;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_creator_balances(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_creator_balances(uuid) TO authenticated;
