/*
# Add guest_device_id to checkout intents

1. Modified Tables
- `nowpayments_checkout_intents`
  - Add `guest_device_id` (text, nullable) — a client-generated UUID stored in
    localStorage that identifies unauthenticated buyers across sessions.
  - Add `content_id` column if it doesn't already exist (content purchases need it
    to know which content to unlock for guests).
  - Add `checkout_type` column if it doesn't already exist.

2. Security
- Update the SELECT policy so guests can read their own intent by matching
  guest_device_id (passed via x-guest-token header) OR guest_token.
- No new tables created.

3. Notes
- buyer_id remains nullable (already done in a prior migration).
- guest_device_id is a free-form text column (not a UUID FK) so the client
  can generate it without server round-trips.
*/

ALTER TABLE public.nowpayments_checkout_intents
  ADD COLUMN IF NOT EXISTS guest_device_id text;

-- Add content_id if it was missing (content purchases reference it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'nowpayments_checkout_intents'
      AND column_name = 'content_id'
  ) THEN
    ALTER TABLE public.nowpayments_checkout_intents
      ADD COLUMN content_id uuid REFERENCES public.content(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add checkout_type if it was missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'nowpayments_checkout_intents'
      AND column_name = 'checkout_type'
  ) THEN
    ALTER TABLE public.nowpayments_checkout_intents
      ADD COLUMN checkout_type text DEFAULT 'subscription';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nowpayments_intents_guest_device
  ON public.nowpayments_checkout_intents(guest_device_id);

-- Allow guests to read their own checkout intent by guest_device_id or guest_token.
-- The x-guest-token header carries whichever identifier the client has.
DROP POLICY IF EXISTS "buyers_read_own_nowpayments_intents" ON public.nowpayments_checkout_intents;
CREATE POLICY "buyers_read_own_nowpayments_intents" ON public.nowpayments_checkout_intents
  FOR SELECT TO anon, authenticated USING (
    (auth.uid() = buyer_id)
    OR (guest_token IS NOT NULL AND guest_token::text = current_setting('request.headers', true)::json->>'x-guest-token')
    OR (guest_device_id IS NOT NULL AND guest_device_id = current_setting('request.headers', true)::json->>'x-guest-token')
  );
