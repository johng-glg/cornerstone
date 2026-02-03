-- Create litigation_teams table
CREATE TABLE public.litigation_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT 'gray',
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create litigation_team_members table
CREATE TABLE public.litigation_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.litigation_teams(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id) -- Each staff can only be in one team
);

-- Enable RLS
ALTER TABLE public.litigation_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigation_team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for litigation_teams
CREATE POLICY "Users can view litigation teams in their company"
ON public.litigation_teams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.user_id = auth.uid()
    AND staff.company_id = litigation_teams.company_id
  )
);

CREATE POLICY "Users can create litigation teams in their company"
ON public.litigation_teams
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.user_id = auth.uid()
    AND staff.company_id = litigation_teams.company_id
  )
);

CREATE POLICY "Users can update litigation teams in their company"
ON public.litigation_teams
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.user_id = auth.uid()
    AND staff.company_id = litigation_teams.company_id
  )
);

CREATE POLICY "Users can delete litigation teams in their company"
ON public.litigation_teams
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.user_id = auth.uid()
    AND staff.company_id = litigation_teams.company_id
  )
);

-- RLS policies for litigation_team_members
CREATE POLICY "Users can view team members in their company"
ON public.litigation_team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.litigation_teams lt
    JOIN public.staff s ON s.company_id = lt.company_id
    WHERE lt.id = litigation_team_members.team_id
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage team members in their company"
ON public.litigation_team_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.litigation_teams lt
    JOIN public.staff s ON s.company_id = lt.company_id
    WHERE lt.id = litigation_team_members.team_id
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update team members in their company"
ON public.litigation_team_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.litigation_teams lt
    JOIN public.staff s ON s.company_id = lt.company_id
    WHERE lt.id = litigation_team_members.team_id
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete team members in their company"
ON public.litigation_team_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.litigation_teams lt
    JOIN public.staff s ON s.company_id = lt.company_id
    WHERE lt.id = litigation_team_members.team_id
    AND s.user_id = auth.uid()
  )
);

-- Create trigger for updated_at on litigation_teams
CREATE TRIGGER update_litigation_teams_updated_at
BEFORE UPDATE ON public.litigation_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_litigation_teams_company_id ON public.litigation_teams(company_id);
CREATE INDEX idx_litigation_team_members_team_id ON public.litigation_team_members(team_id);
CREATE INDEX idx_litigation_team_members_staff_id ON public.litigation_team_members(staff_id);