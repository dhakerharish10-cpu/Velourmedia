/*
# Add payment tracking to purchases table

## Overview
Adds a `payment_id` column to the `purchases` table to store the Razorpay
payment ID returned after a successful checkout. This creates an audit trail
linking each purchase to its real payment transaction.

## 1. Modified Tables

### `purchases`
- `payment_id` (text, nullable) — the Razorpay payment ID (e.g., `pay_xxxxx`)
  returned in `response.razorpay_payment_id` after a successful checkout.
  Nullable because legacy purchases made without Razorpay won't have one.
- `payment_provider` (text, nullable, default 'razorpay') — identifies which
  payment gateway was used.

## 2. Security
- No RLS policy changes needed — existing policies already cover the columns.
- The new columns are writable by the buyer via the existing INSERT policy.

## 3. Important Notes
- Uses `IF NOT EXISTS` conditional add so it's safe to re-run.
- No data loss — the column is nullable and has a default for the provider.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'payment_id') THEN
    ALTER TABLE purchases ADD COLUMN payment_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'payment_provider') THEN
    ALTER TABLE purchases ADD COLUMN payment_provider text DEFAULT 'razorpay';
  END IF;
END $$;
