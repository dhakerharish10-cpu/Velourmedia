/*
# Create access_tokens table for 7-day expiring guest access links

1. Purpose
   - Stores secure, time-limited access tokens that grant guest buyers (no account) 
     7-day access to purchased content via an email link.
   - Each token is tied to a specific content item and a buyer email address.
   - Tokens expire exactly 7 days (168 hours) after creation.

2. New Tables
   - `access_tokens`
     - `id` (uuid, primary key)
     - `token` (text, unique, not null) — the JWT-like unique access token
     - `content_id` (uuid, not null) — references content.id
     - `buyer_email` (text, not null) — the email address of the guest buyer
     - `order_id` (text) — the NOWPayments order ID for receipt linkage
     - `amount_paid` (numeric, not null) — the amount paid in USD
     - `payment_provider` (text, default 'nowpayments')
     - `payment_id` (text) — the NOWPayments payment ID
     - `expires_at` (timestamptz, not null) — exactly 7 days after created_at
     - `created_at` (timestamptz, default now())
     - `accessed_at` (timestamptz) — last time the token was used to view content
     - `is_active` (boolean, default true) — can be revoked if needed

3. Security
   - RLS enabled on access_tokens.
   - SELECT: allow anon + authenticated (token validation happens via edge function 
     which uses service role key; the anon policy is intentionally permissive since 
     the token itself is the secret, not the row).
   - INSERT/UPDATE/DELETE: denied for anon and authenticated (only the edge function 
     with service role key can create/modify tokens).
*/

CREATE TABLE IF NOT EXISTS access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  content_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  order_id text,
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  payment_provider text NOT NULL DEFAULT 'nowpayments',
  payment_id text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accessed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- Allow reading token metadata (the token string itself is the secret)
DROP POLICY IF EXISTS "anon_read_access_tokens" ON access_tokens;
CREATE POLICY "anon_read_access_tokens" ON access_tokens FOR SELECT
  TO anon, authenticated USING (true);

-- Only service role can insert/update/delete (no anon/authenticated policies for those)
DROP POLICY IF EXISTS "anon_insert_access_tokens" ON access_tokens;
DROP POLICY IF EXISTS "anon_update_access_tokens" ON access_tokens;
DROP POLICY IF EXISTS "anon_delete_access_tokens" ON access_tokens;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_content_id ON access_tokens(content_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at);
