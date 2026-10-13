/*
# Fix Column-Level Privileges on profiles

## Problem
The profiles table has an UPDATE policy `auth.uid() = owner_id` that lets users edit their own row.
But the grant is `UPDATE ON profiles TO authenticated` with all columns — meaning a user can
self-escalate is_admin, is_suspended, kyc_status, owner_id, and is_primary by crafting a direct
API call. The UI prevents this, but the database doesn't.

## Fix
REVOKE the table-wide UPDATE from authenticated, then GRANT UPDATE only on the columns
that users legitimately control: display_name, bio, avatar_url, subscription_price,
email_sales_alerts, email_payout_alerts, email_account_alerts, preferred_payout_method,
upi_id, crypto_wallet_address, crypto_network.

Privileged columns (is_admin, is_suspended, kyc_status, owner_id, is_primary) are only
writable through SECURITY DEFINER admin functions that check caller authorization.
*/

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (
  display_name,
  bio,
  avatar_url,
  subscription_price,
  email_sales_alerts,
  email_payout_alerts,
  email_account_alerts,
  preferred_payout_method,
  upi_id,
  crypto_wallet_address,
  crypto_network
) ON profiles TO authenticated;

-- Also restrict INSERT: users should only insert username and display_name when creating a profile
-- (The handle_new_user trigger creates the initial profile, so client inserts are limited)
REVOKE INSERT ON profiles FROM authenticated;
GRANT INSERT (
  username,
  display_name,
  bio,
  avatar_url,
  subscription_price
) ON profiles TO authenticated;
