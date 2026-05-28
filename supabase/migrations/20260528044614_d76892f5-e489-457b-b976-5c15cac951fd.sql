
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS forth_status text;

ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS external_payment_id text,
  ADD COLUMN IF NOT EXISTS payment_send_status text,
  ADD COLUMN IF NOT EXISTS payment_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS escrow_balance_synced numeric,
  ADD COLUMN IF NOT EXISTS escrow_balance_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_settlements_external_payment_id
  ON public.settlements(external_payment_id)
  WHERE external_payment_id IS NOT NULL;
