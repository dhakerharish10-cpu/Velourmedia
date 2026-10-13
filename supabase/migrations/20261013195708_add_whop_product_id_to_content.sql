-- Add whop_product_id column to content table for product_id-to-post mapping fallback
ALTER TABLE content ADD COLUMN IF NOT EXISTS whop_product_id text;
