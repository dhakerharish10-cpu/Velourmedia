/*
# Add payment tracking to subscriptions table

## Overview
Adds `payment_id` and `payment_provider` columns to the `subscriptions` table
to store the Razorpay payment ID for each subscription checkout, matching the
pattern already used on the `purchases` table.

## 1. Modified Tables

### `subscriptions`
- `payment_id` (text, nullable) — the Razorpay payment ID returned after a
  successful subscription checkout.
- `payment_provider` (text, nullable, default 'razorpay') — identifies which
  payment gateway was used.

## 2. Security
- No RLS policy changes needed — existing policies already cover the columns.

## 3. Important Notes
- Uses `IF NOT EXISTS` conditional add so it's safe to re-run.
- No data loss — both columns are nullable.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'payment_id') THEN
    ALTER TABLE subscriptions ADD COLUMN payment_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'payment_provider') THEN
    ALTER TABLE subscriptions ADD COLUMN payment_provider text DEFAULT 'razorpay';
  END IF;
END $$;
