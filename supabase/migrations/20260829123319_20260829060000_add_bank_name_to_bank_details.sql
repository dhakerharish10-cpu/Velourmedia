/*
# Add bank_name column to bank_details

1. New Column on `bank_details`
- `bank_name` (text, default '') — the creator's bank name (e.g. HDFC Bank, Chase, ICICI Bank).

2. Security
- No RLS changes needed — existing policies already cover CRUD for the profile owner.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_details' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE bank_details ADD COLUMN bank_name text NOT NULL DEFAULT '';
  END IF;
END $$;
