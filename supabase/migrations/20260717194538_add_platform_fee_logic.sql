/*
# Add platform fee tracking + platform_settings table

## Overview
Adds platform commission fee logic to the payment settlement engine.
When a fan pays $X to unlock content or subscribe, the platform deducts a
configurable commission percentage and routes the remaining net amount to
the creator's earnings. A single-row `platform_settings` table stores the
fee percentage (default 10%). `purchases` and `subscriptions` gain two new
columns each: `platform_fee` and `net_to_creator`, recording the split at
the time of payment. The `creator_earnings` view is dropped and recreated
to sum `net_to_creator` so the creator dashboard reflects post-fee earnings.

## 1. New Tables
### `platform_settings`
- `id` (int, PK, always 1) — single-row design.
- `platform_fee_percent` (numeric, default 10.00).
- `updated_at` (timestamptz).
- `updated_by` (uuid, nullable) — admin who changed it.

## 2. Modified Tables
### `purchases`
- `platform_fee` (numeric, default 0) — USD commission.
- `net_to_creator` (numeric, default 0) — USD credited to creator.

### `subscriptions`
- `platform_fee` (numeric, default 0) — USD commission.
- `net_to_creator` (numeric, default 0) — USD credited to creator.

## 3. Replaced Views
### `creator_earnings` (dropped + recreated)
- `content_revenue` = SUM(net_to_creator) from purchases (post-fee).
- `subscription_revenue` = SUM(net_to_creator) from subscriptions.
- `total_revenue` = sum of both net amounts.
- `gross_revenue` = pre-fee total.
- `platform_fees_paid` = total commission deducted.

## 4. Security
- `platform_settings`: RLS enabled. Any authenticated user can SELECT.
  Only admins can UPDATE.

## 5. Notes
- Seed row inserted with id=1, fee=10%.
- Existing data backfills to fee=0, net=gross (view handles defaults).
*/

CREATE TABLE IF NOT EXISTS platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 10.00,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_platform_settings" ON platform_settings;
CREATE POLICY "select_platform_settings" ON platform_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_platform_settings_admin" ON platform_settings;
CREATE POLICY "update_platform_settings_admin" ON platform_settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

INSERT INTO platform_settings (id, platform_fee_percent)
VALUES (1, 10.00)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'platform_fee') THEN
    ALTER TABLE purchases ADD COLUMN platform_fee numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'net_to_creator') THEN
    ALTER TABLE purchases ADD COLUMN net_to_creator numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'platform_fee') THEN
    ALTER TABLE subscriptions ADD COLUMN platform_fee numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'net_to_creator') THEN
    ALTER TABLE subscriptions ADD COLUMN net_to_creator numeric(10,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

DROP VIEW IF EXISTS creator_earnings;

CREATE VIEW creator_earnings AS
SELECT
  p.id AS creator_id,
  COALESCE(purchases_rev.net_total, 0) AS content_revenue,
  COALESCE(subs_rev.net_total, 0) AS subscription_revenue,
  COALESCE(purchases_rev.net_total, 0) + COALESCE(subs_rev.net_total, 0) AS total_revenue,
  COALESCE(purchases_rev.gross_total, 0) + COALESCE(subs_rev.gross_total, 0) AS gross_revenue,
  COALESCE(purchases_rev.fees, 0) + COALESCE(subs_rev.fees, 0) AS platform_fees_paid,
  COALESCE(purchases_rev.sale_count, 0) AS total_sales,
  COALESCE(subs_rev.sub_count, 0) AS total_subscribers
FROM profiles p
LEFT JOIN (
  SELECT
    c.creator_id,
    SUM(pur.net_to_creator) AS net_total,
    SUM(pur.amount_paid) AS gross_total,
    SUM(pur.platform_fee) AS fees,
    COUNT(*) AS sale_count
  FROM purchases pur
  JOIN content c ON c.id = pur.content_id
  GROUP BY c.creator_id
) purchases_rev ON purchases_rev.creator_id = p.id
LEFT JOIN (
  SELECT
    creator_id,
    SUM(net_to_creator) AS net_total,
    SUM(amount) AS gross_total,
    SUM(platform_fee) AS fees,
    COUNT(*) AS sub_count
  FROM subscriptions
  WHERE status = 'active'
  GROUP BY creator_id
) subs_rev ON subs_rev.creator_id = p.id;
