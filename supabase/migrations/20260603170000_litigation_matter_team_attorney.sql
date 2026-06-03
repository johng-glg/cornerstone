-- Litigation matters: add the team + assigned-attorney columns the app already writes.
-- The "Open litigation matter" dialog routes a matter to a team and an attorney, and both the
-- LiabilityDetail and Litigation create flows insert team_id/staff_id — but the columns were never
-- added, so inserts failed with: Could not find the 'staff_id' column of 'litigation_matters'.

ALTER TABLE public.litigation_matters
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.litigation_teams (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_litigation_matters_team_id ON public.litigation_matters (team_id);
CREATE INDEX IF NOT EXISTS idx_litigation_matters_staff_id ON public.litigation_matters (staff_id);

COMMENT ON COLUMN public.litigation_matters.team_id IS 'Litigation team the matter is routed to.';
COMMENT ON COLUMN public.litigation_matters.staff_id IS 'Attorney assigned to the matter.';
