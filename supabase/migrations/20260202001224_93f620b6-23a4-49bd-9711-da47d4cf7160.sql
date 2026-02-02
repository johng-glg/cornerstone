-- Add columns for debt buyer and law firm on liabilities
-- These allow specifying which debt buyer/law firm is involved, plus "other" freeform options

ALTER TABLE public.liabilities
ADD COLUMN debt_buyer_id uuid REFERENCES public.creditors(id),
ADD COLUMN debt_buyer_other text,
ADD COLUMN law_firm_id uuid REFERENCES public.creditors(id),
ADD COLUMN law_firm_other text;