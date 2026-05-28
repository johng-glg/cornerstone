-- Phase 9A: companies.company_type enum + audit trigger
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_audit_company_type_change ON public.companies;
--   DROP FUNCTION IF EXISTS public.audit_company_type_change();
--   ALTER TABLE public.companies DROP COLUMN IF EXISTS company_type;
--   DROP TYPE IF EXISTS public.company_type_enum;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_type_enum') THEN
    CREATE TYPE public.company_type_enum AS ENUM (
      'law_firm', 'debt_relief', 'debt_settlement', 'legal_plan', 'hybrid', 'other'
    );
  END IF;
END$$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_type public.company_type_enum NOT NULL DEFAULT 'law_firm';

-- Backfill (idempotent — default already covers new + existing rows, but be explicit)
UPDATE public.companies SET company_type = 'law_firm' WHERE company_type IS NULL;

CREATE OR REPLACE FUNCTION public.audit_company_type_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.company_type IS DISTINCT FROM OLD.company_type THEN
    PERFORM public.log_audit_event(
      'company.type_changed',
      'companies',
      NEW.id,
      NEW.id,
      jsonb_build_object('from', OLD.company_type::text, 'to', NEW.company_type::text),
      NULL, NULL, NULL
    );
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_audit_company_type_change ON public.companies;
CREATE TRIGGER trg_audit_company_type_change
  AFTER UPDATE OF company_type ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.audit_company_type_change();