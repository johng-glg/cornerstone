DROP POLICY IF EXISTS "Staff can access company processor configs" ON public.company_processor_configs;

CREATE POLICY "Admins can read company processor configs"
  ON public.company_processor_configs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.can_access_company(auth.uid(), company_id)
  );

CREATE POLICY "Admins can insert company processor configs"
  ON public.company_processor_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.can_access_company(auth.uid(), company_id)
  );

CREATE POLICY "Admins can update company processor configs"
  ON public.company_processor_configs
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.can_access_company(auth.uid(), company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.can_access_company(auth.uid(), company_id)
  );

CREATE POLICY "Admins can delete company processor configs"
  ON public.company_processor_configs
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.can_access_company(auth.uid(), company_id)
  );