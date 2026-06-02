-- Unified activity log: an append-only, per-record timeline of meaningful actions
-- (staff assigned/unassigned, settlement offered/accepted/approved, status changed, …).
--
-- Why: each domain already has its own activity table (lead_activities, litigation_activities,
-- liability_actions), but cross-cutting actions — most notably staff ASSIGNMENT, which happens
-- through one shared panel for every entity type — were written nowhere, so they never showed
-- up in any record's history. This table is the single sink for those events and backs the
-- reusable Activity feed on the detail pages.
--
-- Append-only by design: there are SELECT + INSERT policies but deliberately no UPDATE/DELETE,
-- so the audit trail can't be rewritten from the client.

CREATE TABLE IF NOT EXISTS public.activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- The record this event belongs to, e.g. ('liability', <uuid>) or ('client', <uuid>).
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  -- Optional rollup key so a child-record event (e.g. a settlement on a liability) can also be
  -- surfaced on the owning client's timeline later, without another query path.
  client_id   uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  category    text NOT NULL,                          -- 'assignment' | 'settlement' | 'status' | 'document' | 'note' | …
  description text NOT NULL,                           -- human-readable line
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity
  ON public.activity_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_client
  ON public.activity_log (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_company
  ON public.activity_log (company_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users insert company activity" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Rollback:
-- DROP TABLE IF EXISTS public.activity_log;
