-- Add creator_earnings and platform_earnings columns to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS creator_earnings numeric DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS platform_earnings numeric DEFAULT 0;

-- Backfill existing rows: match raw_payload.data.title to content.title to get creator_id and content_id
-- Then compute the 70/30 split based on the extracted amount
UPDATE transactions t
SET 
  content_id = c.id,
  creator_id = c.creator_id,
  amount = COALESCE(
    NULLIF(t.amount, 0),
    (t.raw_payload->'data'->>'initial_price')::numeric,
    0
  ),
  creator_earnings = ROUND(
    COALESCE(
      NULLIF(t.amount, 0),
      (t.raw_payload->'data'->>'initial_price')::numeric,
      0
    ) * 0.7 * 100
  ) / 100,
  platform_earnings = ROUND(
    COALESCE(
      NULLIF(t.amount, 0),
      (t.raw_payload->'data'->>'initial_price')::numeric,
      0
    ) * 0.3 * 100
  ) / 100
FROM content c
WHERE t.content_id IS NULL
  AND c.title = (t.raw_payload->'data'->>'title')
  AND (t.raw_payload->'data'->>'initial_price') IS NOT NULL;

-- For any rows where amount is still 0 but we have initial_price, set amount from initial_price
UPDATE transactions
SET 
  amount = (raw_payload->'data'->>'initial_price')::numeric,
  creator_earnings = ROUND((raw_payload->'data'->>'initial_price')::numeric * 0.7 * 100) / 100,
  platform_earnings = ROUND((raw_payload->'data'->>'initial_price')::numeric * 0.3 * 100) / 100
WHERE amount = 0
  AND raw_payload->'data'->>'initial_price' IS NOT NULL;
