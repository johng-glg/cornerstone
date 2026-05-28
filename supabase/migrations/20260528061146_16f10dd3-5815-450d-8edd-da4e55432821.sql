
-- ============================================================
-- Phase 5A: NSF retry policies + attempts
-- ============================================================

CREATE TABLE public.nsf_retry_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default NSF Policy',
  max_attempts integer NOT NULL DEFAULT 2 CHECK (max_attempts BETWEEN 0 AND 10),
  -- jsonb shape: [{ "day_offset": 5 }, { "day_offset": 10 }]
  delay_pattern jsonb NOT NULL DEFAULT '[{"day_offset":5},{"day_offset":10}]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_nsf_retry_policies_active_per_company
  ON public.nsf_retry_policies(company_id) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nsf_retry_policies TO authenticated;
GRANT ALL ON public.nsf_retry_policies TO service_role;
ALTER TABLE public.nsf_retry_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage NSF policies in their company"
  ON public.nsf_retry_policies FOR ALL TO authenticated
  USING (public.can_access_company(auth.uid(), company_id))
  WITH CHECK (public.can_access_company(auth.uid(), company_id));

CREATE TRIGGER update_nsf_retry_policies_updated_at
  BEFORE UPDATE ON public.nsf_retry_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.transaction_retry_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  retry_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES public.nsf_retry_policies(id) ON DELETE SET NULL,
  attempt_number integer NOT NULL,
  scheduled_for date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled | fired | skipped | failed
  fired_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tx_retry_original ON public.transaction_retry_attempts(original_transaction_id);
CREATE INDEX idx_tx_retry_status ON public.transaction_retry_attempts(status, scheduled_for);

GRANT SELECT, INSERT, UPDATE ON public.transaction_retry_attempts TO authenticated;
GRANT ALL ON public.transaction_retry_attempts TO service_role;
ALTER TABLE public.transaction_retry_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view retry attempts in their company"
  ON public.transaction_retry_attempts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transactions t
    JOIN public.client_services cs ON cs.id = t.client_service_id
    WHERE t.id = original_transaction_id
      AND public.can_access_company(auth.uid(), cs.owning_company_id)
  ));

-- ============================================================
-- Phase 5C: Reconciliation findings
-- ============================================================

CREATE TABLE public.reconciliation_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  detector text NOT NULL, -- 'stale_pending_tx' | 'escrow_drift' | 'service_field_drift'
  severity text NOT NULL DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
  entity_type text NOT NULL,
  entity_id uuid,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open', -- 'open' | 'resolved' | 'ignored'
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recon_company_status ON public.reconciliation_findings(company_id, status);
CREATE INDEX idx_recon_detector ON public.reconciliation_findings(detector);
CREATE UNIQUE INDEX uq_recon_open_per_entity_detector
  ON public.reconciliation_findings(detector, entity_type, entity_id)
  WHERE status = 'open' AND entity_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.reconciliation_findings TO authenticated;
GRANT ALL ON public.reconciliation_findings TO service_role;
ALTER TABLE public.reconciliation_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view recon findings in their company"
  ON public.reconciliation_findings FOR SELECT TO authenticated
  USING (company_id IS NULL OR public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Staff update recon findings in their company"
  ON public.reconciliation_findings FOR UPDATE TO authenticated
  USING (company_id IS NULL OR public.can_access_company(auth.uid(), company_id));

-- ============================================================
-- Phase 5B/5C: pg_cron schedules
-- ============================================================

DO $$
DECLARE
  _project_url text;
  _service_key text;
BEGIN
  -- Resolve config; fall back gracefully if vault entries missing in dev
  BEGIN
    SELECT decrypted_secret INTO _service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN _service_key := NULL; END;

  -- Project URL pattern derived from project ref
  _project_url := 'https://scswhhmwmbjdffplwnsf.supabase.co';

  -- Best-effort: only schedule if cron is accessible to this role
  BEGIN
    PERFORM cron.unschedule('plsa-escrow-sync-nightly');
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    PERFORM cron.unschedule('plsa-reconciliation-hourly');
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    PERFORM cron.unschedule('plsa-nsf-retry-hourly');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- 2 AM UTC nightly: escrow balance sync
  PERFORM cron.schedule(
    'plsa-escrow-sync-nightly',
    '0 2 * * *',
    format($cron$
      SELECT net.http_post(
        url := '%s/functions/v1/plsa-escrow-sync',
        headers := '{"Content-Type":"application/json","Authorization":"Bearer %s"}'::jsonb,
        body := '{}'::jsonb
      ) AS request_id;
    $cron$, _project_url, COALESCE(_service_key, 'MISSING_SERVICE_KEY'))
  );

  -- Every hour: reconciliation scan
  PERFORM cron.schedule(
    'plsa-reconciliation-hourly',
    '15 * * * *',
    format($cron$
      SELECT net.http_post(
        url := '%s/functions/v1/plsa-reconciliation',
        headers := '{"Content-Type":"application/json","Authorization":"Bearer %s"}'::jsonb,
        body := '{}'::jsonb
      ) AS request_id;
    $cron$, _project_url, COALESCE(_service_key, 'MISSING_SERVICE_KEY'))
  );

  -- Every hour: NSF retry processor
  PERFORM cron.schedule(
    'plsa-nsf-retry-hourly',
    '30 * * * *',
    format($cron$
      SELECT net.http_post(
        url := '%s/functions/v1/plsa-nsf-retry',
        headers := '{"Content-Type":"application/json","Authorization":"Bearer %s"}'::jsonb,
        body := '{"mode":"process_due"}'::jsonb
      ) AS request_id;
    $cron$, _project_url, COALESCE(_service_key, 'MISSING_SERVICE_KEY'))
  );
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'cron schedule skipped: insufficient privilege; schedule manually';
WHEN OTHERS THEN
  RAISE NOTICE 'cron schedule skipped: %', SQLERRM;
END $$;
