ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS last_polled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_transactions_pending_last_polled
  ON public.transactions (last_polled_at NULLS FIRST)
  WHERE status = 'pending' AND external_id IS NOT NULL;