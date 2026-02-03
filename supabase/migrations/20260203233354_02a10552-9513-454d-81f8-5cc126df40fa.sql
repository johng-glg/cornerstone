-- Add DELETE policy for staff table (admins only)
CREATE POLICY "Admins can delete staff"
ON public.staff
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));