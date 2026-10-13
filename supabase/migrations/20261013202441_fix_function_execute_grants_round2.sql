/*
# Fix SECURITY DEFINER Function EXECUTE Grants (Round 2)

## Problem
Supabase grants EXECUTE on all functions to the `anon` and `authenticated` roles via
default Postgres grants. REVOKE EXECUTE FROM anon alone doesn't work because the grant
comes through PUBLIC/pg_execute_all_functions. We must REVOKE FROM PUBLIC explicitly,
then GRANT back only to the roles that should have access.

## Changes
- Admin-only functions: REVOKE EXECUTE FROM PUBLIC, anon; GRANT only to authenticated
  (the functions internally check is_admin, so authenticated non-admins get rejected)
- get_creator_balances: REVOKE FROM PUBLIC, anon; GRANT to authenticated
  (internally checks ownership)
- get_creator_sales_visibility: REVOKE FROM PUBLIC, anon; GRANT to authenticated
  (internally checks admin)
- increment_content_views: REVOKE FROM PUBLIC; GRANT to anon, authenticated
  (legitimately public for view counting)
- is_platform_admin: REVOKE FROM PUBLIC, anon; GRANT to authenticated
- promote_self_to_admin: REVOKE FROM PUBLIC, anon; GRANT to authenticated
- get_admin_stats: REVOKE FROM PUBLIC, anon; GRANT to authenticated
  (internally checks is_admin)
*/

-- Admin-only functions: revoke from PUBLIC + anon, grant to authenticated only
REVOKE EXECUTE ON FUNCTION admin_action_report(p_report_id uuid, p_action text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_action_report(p_report_id uuid, p_action text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_action_report(p_report_id uuid, p_action text) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_mark_payout_paid(p_payout_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_mark_payout_paid(p_payout_id uuid) FROM anon;
GRANT EXECUTE ON FUNCTION admin_mark_payout_paid(p_payout_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_set_ban(p_profile_id uuid, p_ban boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_set_ban(p_profile_id uuid, p_ban boolean) FROM anon;
GRANT EXECUTE ON FUNCTION admin_set_ban(p_profile_id uuid, p_ban boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_set_kyc_status(p_profile_id uuid, p_status text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_set_kyc_status(p_profile_id uuid, p_status text) FROM anon;
GRANT EXECUTE ON FUNCTION admin_set_kyc_status(p_profile_id uuid, p_status text) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_set_sales_visibility(p_profile_id uuid, p_visible_ratio integer, p_sales_hidden boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_set_sales_visibility(p_profile_id uuid, p_visible_ratio integer, p_sales_hidden boolean) FROM anon;
GRANT EXECUTE ON FUNCTION admin_set_sales_visibility(p_profile_id uuid, p_visible_ratio integer, p_sales_hidden boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_set_suspension(p_profile_id uuid, p_suspend boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_set_suspension(p_profile_id uuid, p_suspend boolean) FROM anon;
GRANT EXECUTE ON FUNCTION admin_set_suspension(p_profile_id uuid, p_suspend boolean) TO authenticated;

-- Financial/stats functions: revoke from PUBLIC + anon, grant to authenticated
REVOKE EXECUTE ON FUNCTION get_admin_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_admin_stats() FROM anon;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;

REVOKE EXECUTE ON FUNCTION get_creator_balances(p_profile_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_creator_balances(p_profile_id uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_creator_balances(p_profile_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION get_creator_sales_visibility(p_profile_id uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_creator_sales_visibility(p_profile_id uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_creator_sales_visibility(p_profile_id uuid) TO authenticated;

-- is_platform_admin and promote_self_to_admin: revoke from PUBLIC + anon
REVOKE EXECUTE ON FUNCTION is_platform_admin(p_email text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_platform_admin(p_email text) FROM anon;
GRANT EXECUTE ON FUNCTION is_platform_admin(p_email text) TO authenticated;

REVOKE EXECUTE ON FUNCTION promote_self_to_admin(p_email text, p_secret_key text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION promote_self_to_admin(p_email text, p_secret_key text) FROM anon;
GRANT EXECUTE ON FUNCTION promote_self_to_admin(p_email text, p_secret_key text) TO authenticated;

-- increment_content_views: legitimately public — revoke from PUBLIC, grant to both anon + authenticated
REVOKE EXECUTE ON FUNCTION increment_content_views(p_content_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_content_views(p_content_id uuid) TO anon, authenticated;
