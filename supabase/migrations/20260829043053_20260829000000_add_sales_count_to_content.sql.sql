-- Add sales_count and earned_amount columns to content for real-time tracking
ALTER TABLE content ADD COLUMN IF NOT EXISTS sales_count integer NOT NULL DEFAULT 0;
ALTER TABLE content ADD COLUMN IF NOT EXISTS earned_amount numeric NOT NULL DEFAULT 0;

-- Backfill sales_count and earned_amount from existing purchases
UPDATE content c
SET
  sales_count = COALESCE((
    SELECT COUNT(*) FROM purchases p WHERE p.content_id = c.id
  ), 0),
  earned_amount = COALESCE((
    SELECT COALESCE(SUM(p.net_to_creator), 0) FROM purchases p WHERE p.content_id = c.id
  ), 0);
