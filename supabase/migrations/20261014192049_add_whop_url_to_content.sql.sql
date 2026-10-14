/*
# Add whop_url column to content table

1. Changes
- Adds `whop_url` (text, nullable) to the `content` table.
- Stores an exact Whop checkout URL per content item, so the Unlock button
  can redirect to the creator's specific product/checkout page instead of
  a generic whop.com link.
2. Security
- No RLS policy changes. Existing policies on `content` remain unchanged.
- The new column inherits the table's existing column-level privileges.
*/

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS whop_url text;
