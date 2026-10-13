/*
# Fix SECURITY DEFINER Functions: search_path + EXECUTE grants

## Changes
- All SECURITY DEFINER functions get SET search_path = public
- Admin-only functions: REVOKE EXECUTE from anon
- increment_content_views: stays callable by anon (legitimately public for view counting)
- get_creator_balances: revoke from anon (contains financial data)
- get_creator_sales_visibility: revoke from anon (contains sales data)
*/

-- get_admin_stats
ALTER FUNCTION get_admin_stats() SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION get_admin_stats() FROM anon;

-- get_creator_balances
ALTER FUNCTION get_creator_balances(p_profile_id uuid) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION get_creator_balances(p_profile_id uuid) FROM anon;

-- get_creator_sales_visibility
ALTER FUNCTION get_creator_sales_visibility(p_profile_id uuid) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION get_creator_sales_visibility(p_profile_id uuid) FROM anon;

-- admin_set_ban
ALTER FUNCTION admin_set_ban(p_profile_id uuid, p_ban boolean) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION admin_set_ban(p_profile_id uuid, p_ban boolean) FROM anon;

-- admin_set_kyc_status
ALTER FUNCTION admin_set_kyc_status(p_profile_id uuid, p_status text) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION admin_set_kyc_status(p_profile_id uuid, p_status text) FROM anon;

-- admin_set_suspension
ALTER FUNCTION admin_set_suspension(p_profile_id uuid, p_suspend boolean) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION admin_set_suspension(p_profile_id uuid, p_suspend boolean) FROM anon;

-- admin_set_sales_visibility (3rd param is boolean, not integer)
ALTER FUNCTION admin_set_sales_visibility(p_profile_id uuid, p_visible_ratio integer, p_sales_hidden boolean) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION admin_set_sales_visibility(p_profile_id uuid, p_visible_ratio integer, p_sales_hidden boolean) FROM anon;

-- admin_action_report
ALTER FUNCTION admin_action_report(p_report_id uuid, p_action text) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION admin_action_report(p_report_id uuid, p_action text) FROM anon;

-- admin_mark_payout_paid
ALTER FUNCTION admin_mark_payout_paid(p_payout_id uuid) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION admin_mark_payout_paid(p_payout_id uuid) FROM anon;

-- is_platform_admin
ALTER FUNCTION is_platform_admin(p_email text) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION is_platform_admin(p_email text) FROM anon;

-- promote_self_to_admin
ALTER FUNCTION promote_self_to_admin(p_email text, p_secret_key text) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION promote_self_to_admin(p_email text, p_secret_key text) FROM anon;

-- increment_content_views — stays callable by anon (legitimately public for view counting)
ALTER FUNCTION increment_content_views(p_content_id uuid) SECURITY DEFINER SET search_path = public;
