-- Allow guest (unauthenticated) checkout for content purchases.
-- buyer_id becomes nullable so a checkout intent can exist without a user account.
-- A guest_token (UUID) is stored on the intent so the guest can later poll their
-- own payment status without needing to sign in.

ALTER TABLE public.nowpayments_checkout_intents
  ALTER COLUMN buyer_id DROP NOT NULL;

ALTER TABLE public.nowpayments_checkout_intents
  ADD COLUMN IF NOT EXISTS guest_token uuid DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_nowpayments_intents_guest_token
  ON public.nowpayments_checkout_intents(guest_token);

-- Guests can read their own checkout intent by guest_token (no buyer_id to match).
DROP POLICY IF EXISTS "buyers_read_own_nowpayments_intents" ON public.nowpayments_checkout_intents;
CREATE POLICY "buyers_read_own_nowpayments_intents" ON public.nowpayments_checkout_intents
  FOR SELECT TO anon, authenticated USING (
    (auth.uid() = buyer_id)
    OR (guest_token IS NOT NULL AND guest_token::text = current_setting('request.headers', true)::json->>'x-guest-token')
  );
