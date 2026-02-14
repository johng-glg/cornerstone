-- Update can_access_company to also allow child company staff to access parent company data
CREATE OR REPLACE FUNCTION public.can_access_company(_user_id uuid, _company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = _user_id 
    AND (
      s.company_id = _company_id
      -- Staff in parent can access child
      OR EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = _company_id
        AND c.parent_company_id = s.company_id
      )
      -- Staff in child can access parent
      OR EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = s.company_id
        AND c.parent_company_id = _company_id
      )
    )
  )
$$;

-- Also update eligibility reviews RLS to use can_access_company instead of direct join
DROP POLICY IF EXISTS "Staff can view eligibility reviews for their company leads" ON eligibility_reviews;
CREATE POLICY "Staff can view eligibility reviews for their company leads" 
ON eligibility_reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = eligibility_reviews.lead_id
    AND can_access_company(auth.uid(), l.company_id)
  )
);

DROP POLICY IF EXISTS "Staff can update eligibility reviews" ON eligibility_reviews;
CREATE POLICY "Staff can update eligibility reviews" 
ON eligibility_reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = eligibility_reviews.lead_id
    AND can_access_company(auth.uid(), l.company_id)
  )
);