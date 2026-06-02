-- Phase A10 follow-up — de-duplicate template_usage / template_usages (Q-A2).
--
-- The A10 templates migration created two structurally identical log tables:
--   public.template_usage  (singular)
--   public.template_usages (plural)
-- Both have the same 9 columns, same FKs (template_id → templates, used_by → staff),
-- same indexes, and parallel RLS policies. This was the deferred Q-A2 duplicate.
--
-- Resolution: keep the PLURAL `template_usages` (consistent with every other table in the
-- schema — templates, template_versions, template_categories, signature_requests, …) and
-- retire the singular `template_usage`. No application code, edge function, or seed
-- references either table today, so this is a safe cosmetic cleanup. Any rows that somehow
-- landed in the singular table are copied across before it is dropped.

BEGIN;

-- 1. Preserve any data (defensive — both tables are expected to be empty).
INSERT INTO public.template_usages (
  id, template_id, entity_type, entity_id, used_by, used_at, channel, success, error_message
)
SELECT
  id, template_id, entity_type, entity_id, used_by, used_at, channel, success, error_message
FROM public.template_usage
ON CONFLICT (id) DO NOTHING;

-- 2. Drop the singular duplicate (RLS policies, indexes, and FKs go with it via CASCADE).
DROP TABLE IF EXISTS public.template_usage CASCADE;

COMMIT;

-- Rollback:
-- BEGIN;
-- CREATE TABLE public.template_usage (
--     id uuid DEFAULT gen_random_uuid() NOT NULL,
--     template_id uuid NOT NULL,
--     entity_type text NOT NULL,
--     entity_id uuid NOT NULL,
--     used_by uuid,
--     used_at timestamp with time zone DEFAULT now() NOT NULL,
--     channel text,
--     success boolean DEFAULT true NOT NULL,
--     error_message text
-- );
-- ALTER TABLE ONLY public.template_usage
--     ADD CONSTRAINT template_usage_pkey PRIMARY KEY (id);
-- ALTER TABLE ONLY public.template_usage
--     ADD CONSTRAINT template_usage_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;
-- ALTER TABLE ONLY public.template_usage
--     ADD CONSTRAINT template_usage_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.staff(id) ON DELETE SET NULL;
-- CREATE INDEX idx_template_usage_entity ON public.template_usage USING btree (entity_type, entity_id);
-- CREATE INDEX idx_template_usage_template ON public.template_usage USING btree (template_id, used_at DESC);
-- ALTER TABLE public.template_usage ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users log template usage for their company" ON public.template_usage FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
--    FROM public.templates t
--   WHERE ((t.id = template_usage.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));
-- CREATE POLICY "Users view template usage for their company" ON public.template_usage FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
--    FROM public.templates t
--   WHERE ((t.id = template_usage.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));
-- COMMIT;
