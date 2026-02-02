-- Fix overly permissive RLS policies on deadline_reminders
-- The Edge Function uses service_role key which bypasses RLS anyway
-- So we can restrict these policies properly

DROP POLICY IF EXISTS "System can insert reminders" ON deadline_reminders;
DROP POLICY IF EXISTS "System can update reminders" ON deadline_reminders;

-- Staff can only see their own reminders (already exists, kept)
-- Admins can manage all company reminders
CREATE POLICY "Admins can manage company reminders"
  ON deadline_reminders FOR ALL
  TO authenticated
  USING (
    staff_id IN (
      SELECT s.id FROM staff s 
      WHERE s.company_id = get_user_company_id(auth.uid())
    )
    AND has_role(auth.uid(), 'admin')
  );