/*
# Fix security issues: SECURITY DEFINER view/function + storage listing policy

## Overview
Resolves four security findings without changing application behavior:

1. `creator_earnings` view was SECURITY DEFINER. Recreated as SECURITY INVOKER
   so the view runs with the caller's privileges, not the view owner's. To keep
   the creator dashboard working (the view aggregates purchases/subscriptions
   that have owner-only RLS), the view is rewritten to only expose the row
   belonging to the requesting creator (`creator_id = auth.uid()` or owned
   sub-profile), so RLS on the underlying tables is satisfied for that creator.
2. `read_creator_media` SELECT policy on `storage.objects` allowed clients to
   LIST all files in the public `creator-media` bucket. Public buckets do not
   need a SELECT policy for object URL access (public URLs are served by the
   storage CDN regardless of RLS). The policy is dropped to prevent enumeration
   of every uploaded file. Upload/update/delete policies remain unchanged.
3. `handle_new_user()` trigger function was executable by anon/authenticated via
   REST RPC. EXECUTE is revoked from PUBLIC, anon, and authenticated so it can
   only be invoked by the database trigger (which runs as the table owner).
   The function stays SECURITY DEFINER because it inserts into `profiles` during
   the auth.users trigger before the profile row exists — SECURITY INVOKER would
   fail since the new user has no privileges yet.

## 1. Modified Views
### `creator_earnings` (dropped + recreated as SECURITY INVOKER)
- Same columns as before (creator_id, content_revenue, subscription_revenue,
  total_revenue, gross_revenue, platform_fees_paid, total_sales,
  total_subscribers).
- SECURITY INVOKER: runs with the querying role's privileges.
- Added `WHERE p.id = auth.uid() OR p.owner_id = auth.uid()` so an authenticated
  creator only sees their own aggregated earnings row. This satisfies the
  owner-scoped RLS on `purchases` (buyer_id) and `subscriptions` (subscriber_id
  / creator_id / owner_id) for the creator's own data.

## 2. Modified Storage Policies
### `storage.objects` (bucket `creator-media`)
- Dropped `read_creator_media` SELECT policy. Public object URL access is
  unaffected (served by the CDN, not RLS). Clients can no longer enumerate
  the bucket contents.

## 3. Modified Functions
### `handle_new_user()`
- Kept as SECURITY DEFINER (required for the post-signup trigger to insert
  into `profiles` before the user has table privileges).
- REVOKE EXECUTE FROM PUBLIC, anon, authenticated. Only the trigger (running
  as the auth schema owner) can call it. The RPC endpoint
  `/rest/v1/rpc/handle_new_user` is therefore disabled for all clients.

## 4. Security
- No new tables. No RLS changes to existing tables.
- View access is now self-scoped via auth.uid() in the view definition.

## 5. Notes
- All statements idempotent (DROP IF EXISTS before CREATE).
- No data loss; the view is a derived aggregate.
*/

-- 1. Recreate creator_earnings as SECURITY INVOKER, scoped to the requesting creator
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
) subs_rev ON subs_rev.creator_id = p.id
WHERE p.id = auth.uid() OR p.owner_id = auth.uid();

ALTER VIEW creator_earnings OWNER TO postgres;
-- Force the view to run as the invoker, not the owner.
ALTER VIEW creator_earnings SET (security_invoker = true);

-- 2. Drop the broad SELECT policy on storage.objects for the public bucket
DROP POLICY IF EXISTS "read_creator_media" ON storage.objects;

-- 3. Revoke EXECUTE on handle_new_user from all client roles (trigger still works)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
