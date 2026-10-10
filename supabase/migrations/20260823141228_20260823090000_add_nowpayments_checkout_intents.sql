/*
# Add NOWPayments checkout intents

1. New Tables
- `nowpayments_checkout_intents` stores one durable checkout attempt per authenticated buyer.
- `id` is the internal checkout identifier.
- `order_id` is the merchant order ID sent to NOWPayments and is unique for safe webhook matching.
- `buyer_id` and `creator_id` identify the subscriber and creator.
- `amount` stores the expected USD subscription amount.
- `status` tracks pending, confirmed, finished, failed, expired, or partially paid states.
- `payment_id` stores the NOWPayments payment identifier when available.
- `invoice_url` stores the hosted NOWPayments checkout URL.
- `created_at` and `updated_at` support status polling and audit history.

2. Security
- Row-level security is enabled.
- Authenticated buyers can read only their own checkout intents.
- Browser clients cannot insert, update, or delete checkout intents; the NOWPayments edge function uses the service role after validating the buyer session.

3. Important Notes
- The table is intentionally separate from `subscriptions` so a cancelled or failed checkout never creates access.
- The IPN webhook is idempotent: the unique order ID and subscription constraint prevent duplicate activation.
- No existing data is removed or changed.
*/

CREATE TABLE IF NOT EXISTS public.nowpayments_checkout_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'finished', 'failed', 'expired', 'partially_paid')),
  payment_id text,
  invoice_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nowpayments_intents_buyer ON public.nowpayments_checkout_intents(buyer_id);
CREATE INDEX IF NOT EXISTS idx_nowpayments_intents_status ON public.nowpayments_checkout_intents(status);

ALTER TABLE public.nowpayments_checkout_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyers_read_own_nowpayments_intents" ON public.nowpayments_checkout_intents;
CREATE POLICY "buyers_read_own_nowpayments_intents" ON public.nowpayments_checkout_intents
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "clients_cannot_insert_nowpayments_intents" ON public.nowpayments_checkout_intents;
CREATE POLICY "clients_cannot_insert_nowpayments_intents" ON public.nowpayments_checkout_intents
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "clients_cannot_update_nowpayments_intents" ON public.nowpayments_checkout_intents;
CREATE POLICY "clients_cannot_update_nowpayments_intents" ON public.nowpayments_checkout_intents
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "clients_cannot_delete_nowpayments_intents" ON public.nowpayments_checkout_intents;
CREATE POLICY "clients_cannot_delete_nowpayments_intents" ON public.nowpayments_checkout_intents
  FOR DELETE TO authenticated USING (false);
