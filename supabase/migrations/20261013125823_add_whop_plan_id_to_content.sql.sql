-- Add whop_plan_id column to content table for plan_id-to-post mapping fallback
ALTER TABLE content ADD COLUMN IF NOT EXISTS whop_plan_id text;

-- Backfill: match existing transactions' raw_payload.data.id (plan_xxx) to content by title
-- The plan.created events contain the plan ID and the title, which we can match to content
UPDATE content c
SET whop_plan_id = sub.plan_id
FROM (
  SELECT 
    (t.raw_payload->'data'->>'title') as title,
    (t.raw_payload->'data'->>'id') as plan_id
  FROM transactions t
  WHERE t.raw_payload->'data'->>'id' IS NOT NULL
    AND t.raw_payload->'data'->>'title' IS NOT NULL
) sub
WHERE c.title = sub.title
  AND c.whop_plan_id IS NULL;
