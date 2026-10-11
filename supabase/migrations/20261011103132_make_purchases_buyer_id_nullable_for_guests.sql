-- Make buyer_id nullable on purchases to support guest checkouts
ALTER TABLE purchases ALTER COLUMN buyer_id DROP NOT NULL;

-- Replace the unique constraint: use payment_id for dedup instead of buyer_id+content_id
-- (payment_id is unique per transaction and works for both guest and user purchases)
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_buyer_id_content_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS purchases_payment_id_content_key
  ON purchases (payment_id, content_id)
  WHERE payment_id IS NOT NULL;

-- Add a unique index for user purchases (buyer_id + content_id) where buyer_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS purchases_buyer_content_key
  ON purchases (buyer_id, content_id)
  WHERE buyer_id IS NOT NULL;
