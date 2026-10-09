/*
# Add email notification preferences to profiles

1. New Columns on `profiles`
- `email_sales_alerts` (boolean, default true) — whether the creator receives email alerts when a sale occurs
- `email_payout_alerts` (boolean, default false) — whether the creator receives email alerts about payout status changes
- `email_account_alerts` (boolean, default true) — whether the creator receives general account activity emails

2. Security
- No RLS policy changes needed — existing profile policies already cover UPDATE for the profile owner.
- The new columns are owner-editable preferences, not privileged fields.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_sales_alerts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_sales_alerts boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_payout_alerts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_payout_alerts boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_account_alerts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_account_alerts boolean NOT NULL DEFAULT true;
  END IF;
END $$;
