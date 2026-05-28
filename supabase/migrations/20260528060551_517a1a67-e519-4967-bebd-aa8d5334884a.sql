-- 4D: rename forth_sync_log -> plsa_sync_log + provider_id
ALTER TABLE public.forth_sync_log RENAME TO plsa_sync_log;
ALTER TABLE public.plsa_sync_log ADD COLUMN IF NOT EXISTS provider_id text NOT NULL DEFAULT 'forth';
CREATE INDEX IF NOT EXISTS idx_plsa_sync_log_provider ON public.plsa_sync_log(provider_id, created_at DESC);

-- 4E: provider awareness on client_services and transactions
ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS plsa_provider_id text NOT NULL DEFAULT 'forth',
  ADD COLUMN IF NOT EXISTS early_exit_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS early_exit_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS loan_provider_id text NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS plsa_provider_id text NOT NULL DEFAULT 'forth';

-- 4E: extend transaction_type enum (reserved for ASAP loan flow)
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'loan_disbursement';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'loan_settlement_payment';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'loan_fee_collection';