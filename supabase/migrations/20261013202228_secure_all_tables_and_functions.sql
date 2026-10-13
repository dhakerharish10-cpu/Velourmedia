/*
# Security Hardening: RLS Policies, Column Privileges, and SECURITY DEFINER Functions

## Summary

This migration fixes 28 security advisor findings and closes critical access-control gaps:
- All tables already have RLS enabled — no new ENABLE needed.
- Fixes SECURITY DEFINER functions executable by anon (admin functions, balance lookups, etc.).
- Fixes mutable search_path on all SECURITY DEFINER functions.
- Narrows column-level UPDATE grants on profiles so users cannot self-escalate is_admin, kyc_status, is_suspended.
- Restricts content_reports, sales_visibility, platform_settings to admin-only where appropriate.
- Fixes content_media read policy to only allow reads on published content.
- Restricts transactions UPDATE/DELETE to admin only (creators shouldn't edit their own payment records).
- Fixes access_tokens to require authenticated ownership instead of open anon access.

## Important Notes
1. All policies use DROP IF EXISTS before CREATE for idempotency.
2. Column-level grants use REVOKE then GRANT pattern.
3. SECURITY DEFINER functions get SET search_path = public to prevent search_path attacks.
4. Admin functions revoke EXECUTE from anon; increment_content_views stays callable by anon (legitimately public for view counting).
*/
