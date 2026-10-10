/*
# Create payouts & bank_details tables

## Overview
Adds two new tables to support the Creator Payouts & Earnings Management System:
1. `bank_details` — stores a creator's domestic Indian bank account info for INR
   settlement payouts. One row per creator profile.
2. `payouts` — a ledger of payout transactions. Each row records a withdrawal
   request: the USD amount requested, the INR settlement amount, the status
   (pending / processing / success / failed), and the associated bank account.

## 1. New Tables

### `bank_details`
- `id` (uuid, primary key)
- `profile_id` (uuid, FK → profiles.id, unique) — which creator profile this
  bank account belongs to.
- `account_holder_name` (text) — name on the bank account.
- `bank_account_number` (text) — domestic bank account number.
- `ifsc_code` (text) — IFSC code for the bank branch.
- `pan_card_number` (text) — PAN for tax/TDS compliance.
- `updated_at` (timestamptz) — last modification time.

### `payouts`
- `id` (uuid, primary key)
- `profile_id` (uuid, FK → profiles.id) — which creator profile requested it.
- `amount_usd` (numeric) — the USD amount the creator requested to withdraw.
- `amount_inr` (numeric) — the INR settlement amount (USD × platform rate).
- `status` (text) — one of: pending, processing, success, failed.
- `requested_at` (timestamptz) — when the payout was requested.
- `processed_at` (timestamptz, nullable) — when it was marked success/failed.
- `reference_id` (text, nullable) — an optional admin reference number.

## 2. Security
- RLS enabled on both tables.
- `bank_details`: the profile owner (via profiles.owner_id = auth.uid()) can
  read, insert, update, and delete their own bank details.
- `payouts`: the profile owner can read and insert their own payout requests.
  Update is restricted to authenticated owners (for status changes driven from
  the client in this simulation). No DELETE on payouts (audit trail).

## 3. Important Notes
- All columns added with IF NOT EXISTS guards for idempotent re-runs.
- No destructive changes to existing tables.
- `bank_details` uses a UNIQUE constraint on profile_id (one account per
  creator profile).
*/

-- 1. bank_details table
CREATE TABLE IF NOT EXISTS bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  account_holder_name text NOT NULL DEFAULT '',
  bank_account_number text NOT NULL DEFAULT '',
  ifsc_code text NOT NULL DEFAULT '',
  pan_card_number text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bank_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bank_details" ON bank_details;
CREATE POLICY "select_own_bank_details" ON bank_details FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = bank_details.profile_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_bank_details" ON bank_details;
CREATE POLICY "insert_own_bank_details" ON bank_details FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = bank_details.profile_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_bank_details" ON bank_details;
CREATE POLICY "update_own_bank_details" ON bank_details FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = bank_details.profile_id AND p.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = bank_details.profile_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_bank_details" ON bank_details;
CREATE POLICY "delete_own_bank_details" ON bank_details FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = bank_details.profile_id AND p.owner_id = auth.uid())
  );

-- 2. payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_usd numeric(10,2) NOT NULL,
  amount_inr numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','success','failed')),
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  reference_id text
);

CREATE INDEX IF NOT EXISTS idx_payouts_profile ON payouts(profile_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payouts" ON payouts;
CREATE POLICY "select_own_payouts" ON payouts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = payouts.profile_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_payouts" ON payouts;
CREATE POLICY "insert_own_payouts" ON payouts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = payouts.profile_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_payouts" ON payouts;
CREATE POLICY "update_own_payouts" ON payouts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = payouts.profile_id AND p.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = payouts.profile_id AND p.owner_id = auth.uid())
  );
