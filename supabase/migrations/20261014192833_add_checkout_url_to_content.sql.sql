/*
# Add checkout_url column to content table

1. Changes
- Adds `checkout_url` (text, nullable) to the `content` table.
- Stores a direct Whop checkout link per content item, as an alternative
  to `whop_url`. The Unlock button checks `whop_url` first, then
  `checkout_url`, then falls back to the constructed product-id URL.
2. Security
- No RLS policy changes. Existing policies on `content` remain unchanged.
*/

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS checkout_url text;
