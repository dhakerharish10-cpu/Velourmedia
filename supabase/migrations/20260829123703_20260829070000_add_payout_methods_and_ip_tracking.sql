/*
# Add payout method preferences + access token IP tracking

1. New Columns on `profiles`
- `preferred_payout_method` (text, default 'bank') — the creator's default payout method: 'bank', 'upi', or 'crypto'.
- `upi_id` (text, default '') — UPI ID for Indian bank transfers.
- `crypto_wallet_address` (text, default '') — USDT TRC20/BEP20 wallet address for crypto payouts.

2. New Columns on `access_tokens`
- `allowed_ips` (text[], default '{}') — list of IPs that have accessed this token.
- `max_concurrent_ips` (integer, default 2) — maximum concurrent IP addresses allowed per token.

3. Security
- No RLS policy changes needed — existing profile policies already cover UPDATE for the profile owner.
- access_tokens has no RLS (managed exclusively via edge function with service role key).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_payout_method'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_payout_method text NOT NULL DEFAULT 'bank';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'upi_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN upi_id text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'crypto_wallet_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN crypto_wallet_address text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'access_tokens' AND column_name = 'allowed_ips'
  ) THEN
    ALTER TABLE access_tokens ADD COLUMN allowed_ips text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'access_tokens' AND column_name = 'max_concurrent_ips'
  ) THEN
    ALTER TABLE access_tokens ADD COLUMN max_concurrent_ips integer NOT NULL DEFAULT 2;
  END IF;
END $$;
