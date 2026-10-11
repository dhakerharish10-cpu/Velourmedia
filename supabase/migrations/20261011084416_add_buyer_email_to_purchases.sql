-- Add buyer_email column to purchases for transaction logging
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS buyer_email text;

-- Add payment_id index for dedup lookups from webhook
CREATE INDEX IF NOT EXISTS idx_purchases_payment_id ON purchases(payment_id) WHERE payment_id IS NOT NULL;
