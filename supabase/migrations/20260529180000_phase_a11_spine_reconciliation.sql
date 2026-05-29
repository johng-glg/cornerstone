-- Phase A11.1 — Spine reconciliation (ADR-001). Forward-only corrective migration that aligns the
-- early A3/A5 spine with the authoritative reference, surfaced by the now-possible whole-schema diff
-- after the 94-table surface was completed. No production data exists yet (pre-cohort), so the
-- staff.department enum remap is non-destructive.
--
-- Brings into parity:
--   * app_role: + 'of_counsel', 'eligibility_reviewer'.
--   * Orphan reference enums (defined, no column uses them): company_type_enum, transaction_status,
--     transaction_type.
--   * staff: + hourly_rate, + last_login_at, screen_pop_preference -> NOT NULL; department migrated
--     from the hand-made `department` enum to the reference `department_new` (then `department` is
--     dropped). + "Admins can delete staff" policy.
--   * companies: + audit_company_type_change() + trg_audit_company_type_change.
--   * role_permissions / role_special_permissions: align policies to the reference set.
--   * Drop three non-reference indexes (idx_staff_company_id/_user_id, idx_user_roles_user_id).
--
-- Accepted divergence: staff COLUMN ORDER differs from the reference (Postgres cannot reorder
-- columns without a destructive rebuild of a table referenced by the whole schema). The column
-- set, types, nullability, and defaults are reconciled to be identical.

-- ===== app_role: add the two missing values (unused in this migration; safe in-tx on PG17) =====
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'of_counsel';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'eligibility_reviewer';

-- ===== Orphan reference enums (parity only; no column references them) =====
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_type_enum') THEN
    CREATE TYPE public.company_type_enum AS ENUM
      ('law_firm', 'debt_relief', 'debt_settlement', 'legal_plan', 'hybrid', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
    CREATE TYPE public.transaction_status AS ENUM ('open', 'pending', 'cleared', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE public.transaction_type AS ENUM
      ('draft', 'processor_fee', 'settlement_payment', 'contingency_fee',
       'loan_disbursement', 'loan_settlement_payment', 'loan_fee_collection');
  END IF;
END $$;

-- ===== staff.department: migrate `department` -> reference `department_new`, then drop `department` =====
ALTER TABLE public.staff ALTER COLUMN department DROP DEFAULT;
ALTER TABLE public.staff
  ALTER COLUMN department TYPE public.department_new
  USING (
    CASE department::text
      WHEN 'admin' THEN 'administration'
      WHEN 'attorney' THEN 'legal'
      WHEN 'sales_intake' THEN 'sales'
      WHEN 'client_services' THEN 'client_services'
      WHEN 'case_manager' THEN 'client_services'
      WHEN 'negotiations' THEN 'negotiations'
      WHEN 'payment_processing' THEN 'operations'
      WHEN 'correspondence' THEN 'operations'
      ELSE 'operations'
    END
  )::public.department_new;
DROP TYPE public.department;

-- ===== staff: missing columns + screen_pop_preference NOT NULL =====
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(10, 2) DEFAULT 350.00,
  ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;
UPDATE public.staff
  SET screen_pop_preference = 'toast'::public.screen_pop_preference_enum
  WHERE screen_pop_preference IS NULL;
ALTER TABLE public.staff
  ALTER COLUMN screen_pop_preference SET DEFAULT 'toast'::public.screen_pop_preference_enum,
  ALTER COLUMN screen_pop_preference SET NOT NULL;

-- ===== staff: missing DELETE policy =====
CREATE POLICY "Admins can delete staff" ON public.staff FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ===== companies: company-type-change audit (function + trigger) =====
CREATE OR REPLACE FUNCTION public.audit_company_type_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;
DROP TRIGGER IF EXISTS trg_audit_company_type_change ON public.companies;
CREATE TRIGGER trg_audit_company_type_change AFTER UPDATE OF company_type ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.audit_company_type_change();

-- ===== role_permissions / role_special_permissions: align policies to the reference =====
DROP POLICY IF EXISTS "Authenticated users can read role_permissions" ON public.role_permissions;
CREATE POLICY "Users can read permissions for their own roles" ON public.role_permissions
  FOR SELECT TO authenticated
  USING ((public.has_role(auth.uid(), role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

DROP POLICY IF EXISTS "Admins can manage role_special_permissions" ON public.role_special_permissions;
DROP POLICY IF EXISTS "Authenticated users can read role_special_permissions" ON public.role_special_permissions;
CREATE POLICY "Admins can delete role_special_permissions" ON public.role_special_permissions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert role_special_permissions" ON public.role_special_permissions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update role_special_permissions" ON public.role_special_permissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Users can read special permissions for their own roles" ON public.role_special_permissions
  FOR SELECT TO authenticated
  USING ((public.has_role(auth.uid(), role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));

-- ===== Drop three indexes not present in the reference =====
DROP INDEX IF EXISTS public.idx_staff_company_id;
DROP INDEX IF EXISTS public.idx_staff_user_id;
DROP INDEX IF EXISTS public.idx_user_roles_user_id;

-- ============================================================================
-- ROLLBACK (best-effort; enum value additions and column drops are not cleanly reversible)
-- ============================================================================
-- DROP INDEX/policies recreate, etc. — see git history of A3. app_role ADD VALUE is irreversible
-- in Postgres without recreating the type; treat this migration as forward-only.
