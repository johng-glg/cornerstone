
-- 1. Screen-pop preference on staff
DO $$ BEGIN
  CREATE TYPE public.screen_pop_preference_enum AS ENUM ('toast', 'auto_navigate', 'off');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS screen_pop_preference public.screen_pop_preference_enum NOT NULL DEFAULT 'toast';

-- 2. Polymorphic entity_communications table
CREATE TABLE IF NOT EXISTS public.entity_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  channel text NOT NULL,
  direction text,
  subject text,
  body text,
  duration_seconds integer,
  recording_url text,
  related_record_id uuid,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_communications_entity_type_check
    CHECK (entity_type IN ('litigation_matter','creditor','creditor_contact')),
  CONSTRAINT entity_communications_channel_check
    CHECK (channel IN ('phone','email','sms','mail','in_person','note')),
  CONSTRAINT entity_communications_direction_check
    CHECK (direction IS NULL OR direction IN ('outbound','inbound','n/a'))
);

CREATE INDEX IF NOT EXISTS idx_entity_communications_entity
  ON public.entity_communications(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_communications_company
  ON public.entity_communications(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_communications_related
  ON public.entity_communications(related_record_id) WHERE related_record_id IS NOT NULL;

-- 3. GRANTs (auth-only, all policies scope via can_access_company)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_communications TO authenticated;
GRANT ALL ON public.entity_communications TO service_role;

-- 4. RLS
ALTER TABLE public.entity_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view entity comms in their company"
  ON public.entity_communications FOR SELECT
  TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Staff can insert entity comms in their company"
  ON public.entity_communications FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Staff can update entity comms in their company"
  ON public.entity_communications FOR UPDATE
  TO authenticated
  USING (public.can_access_company(auth.uid(), company_id))
  WITH CHECK (public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Admins can delete entity comms in their company"
  ON public.entity_communications FOR DELETE
  TO authenticated
  USING (
    public.can_access_company(auth.uid(), company_id)
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 5. updated_at trigger
CREATE TRIGGER trg_entity_communications_updated_at
  BEFORE UPDATE ON public.entity_communications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
