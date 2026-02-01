-- =====================================================
-- Phase 1: Enhanced Transaction and Settlement Schema
-- =====================================================

-- 1.1 Create transaction_type enum
CREATE TYPE public.transaction_type AS ENUM (
  'draft',
  'processor_fee', 
  'settlement_payment',
  'contingency_fee'
);

-- 1.2 Create transaction_status enum
CREATE TYPE public.transaction_status AS ENUM (
  'open',
  'pending',
  'cleared',
  'cancelled'
);

-- 1.3 Create fee_collection_method enum
CREATE TYPE public.fee_collection_method AS ENUM (
  'split',
  'lump_sum'
);

-- 1.4 Add new columns to transactions table
ALTER TABLE public.transactions
  ADD COLUMN scheduled_date date,
  ADD COLUMN settlement_id uuid REFERENCES public.settlements(id) ON DELETE SET NULL,
  ADD COLUMN liability_id uuid REFERENCES public.liabilities(id) ON DELETE SET NULL,
  ADD COLUMN parent_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN description text,
  ADD COLUMN sequence_number integer;

-- 1.5 Add new columns to settlements table
ALTER TABLE public.settlements
  ADD COLUMN first_payment_date date,
  ADD COLUMN payment_schedule jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN fee_collection_method public.fee_collection_method DEFAULT 'split',
  ADD COLUMN fee_start_offset_months integer DEFAULT 0;

-- 1.6 Create index on scheduled_date for efficient queries
CREATE INDEX idx_transactions_scheduled_date ON public.transactions(scheduled_date);
CREATE INDEX idx_transactions_client_service_scheduled ON public.transactions(client_service_id, scheduled_date);
CREATE INDEX idx_transactions_settlement_id ON public.transactions(settlement_id);
CREATE INDEX idx_transactions_liability_id ON public.transactions(liability_id);