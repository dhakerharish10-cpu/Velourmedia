/*
# Extend NOWPayments checkout intents for content purchases

1. Modified Tables
- `nowpayments_checkout_intents.checkout_type` distinguishes subscriptions from one-time content purchases.
- `nowpayments_checkout_intents.content_id` links a one-time checkout to the content it unlocks.

2. Security
- Existing owner-only read policy remains unchanged.
- Browser clients still cannot create or alter checkout intents; only the server-side payment function writes them.

3. Important Notes
- Existing subscription checkout rows remain valid because the new fields have safe defaults.
- No existing data is removed or changed.
*/

ALTER TABLE public.nowpayments_checkout_intents
  ADD COLUMN IF NOT EXISTS checkout_type text NOT NULL DEFAULT 'subscription'
    CHECK (checkout_type IN ('subscription', 'content'));

ALTER TABLE public.nowpayments_checkout_intents
  ADD COLUMN IF NOT EXISTS content_id uuid REFERENCES public.content(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_nowpayments_intents_content ON public.nowpayments_checkout_intents(content_id);
