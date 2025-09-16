-- Migration: 20250115_payment_intents
-- Purpose: Add payment_intents table for payment persistence and replay protection
-- Author: Payments Hardening Engineer
-- Date: 2025-01-15

-- Create payment_intents table (idempotent)
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('square', 'stripe')),
  provider_payment_id text UNIQUE,
  order_draft_id uuid,
  restaurant_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  used_at timestamptz,
  used_by_order_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS payment_intents_restaurant_idx
  ON public.payment_intents (restaurant_id, status);

CREATE INDEX IF NOT EXISTS payment_intents_provider_payment_idx
  ON public.payment_intents (provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_intents_order_draft_idx
  ON public.payment_intents (order_draft_id)
  WHERE order_draft_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_intents_used_order_idx
  ON public.payment_intents (used_by_order_id)
  WHERE used_by_order_id IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_intents_updated_at_trigger
  ON public.payment_intents;

CREATE TRIGGER update_payment_intents_updated_at_trigger
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_intents_updated_at();

-- Add RLS policies (assuming RLS is enabled)
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY payment_intents_service_role ON public.payment_intents
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy for authenticated users (read own restaurant's intents)
CREATE POLICY payment_intents_read_own ON public.payment_intents
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND restaurant_id IN (
      SELECT restaurant_id FROM public.staff_members
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Create idempotency_keys table for request deduplication
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text UNIQUE NOT NULL,
  request_path text NOT NULL,
  request_body jsonb,
  response_status integer,
  response_body jsonb,
  restaurant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for cleanup of expired keys
CREATE INDEX IF NOT EXISTS idempotency_keys_expires_idx
  ON public.idempotency_keys (expires_at);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idempotency_keys_hash_idx
  ON public.idempotency_keys (key_hash);

-- Function to clean up expired idempotency keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON public.payment_intents TO service_role;
GRANT SELECT ON public.payment_intents TO authenticated;
GRANT ALL ON public.idempotency_keys TO service_role;

COMMENT ON TABLE public.payment_intents IS 'Stores payment intents for replay protection and reconciliation';
COMMENT ON TABLE public.idempotency_keys IS 'Stores idempotency keys for request deduplication';