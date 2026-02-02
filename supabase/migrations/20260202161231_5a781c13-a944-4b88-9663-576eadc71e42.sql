-- Deadline Reminder System Migration

-- Create reminder_type enum
CREATE TYPE reminder_type AS ENUM (
  'response_deadline',
  'hearing',
  'task_due'
);

-- Create reminder_status enum
CREATE TYPE reminder_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped'
);

-- Create deadline_reminders table
CREATE TABLE public.deadline_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What to remind about
  reminder_type reminder_type NOT NULL,
  entity_id UUID NOT NULL,
  deadline_date TIMESTAMPTZ NOT NULL,
  
  -- Who to notify
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  
  -- Reminder configuration
  days_before INTEGER NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  
  -- Tracking
  status reminder_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  notification_id UUID REFERENCES notifications(id),
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate reminders
  UNIQUE(reminder_type, entity_id, staff_id, days_before)
);

-- Index for cron job query
CREATE INDEX idx_deadline_reminders_pending 
  ON deadline_reminders(scheduled_for, status)
  WHERE status = 'pending';

-- Index for entity lookup
CREATE INDEX idx_deadline_reminders_entity
  ON deadline_reminders(reminder_type, entity_id);

-- RLS for deadline_reminders
ALTER TABLE deadline_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their reminders"
  ON deadline_reminders FOR SELECT
  TO authenticated
  USING (staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "System can insert reminders"
  ON deadline_reminders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update reminders"
  ON deadline_reminders FOR UPDATE
  TO authenticated
  USING (true);

-- Create reminder_settings table
CREATE TABLE public.reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Which reminders to send (days before deadline)
  response_deadline_days INTEGER[] NOT NULL DEFAULT '{7, 3, 1}',
  hearing_days INTEGER[] NOT NULL DEFAULT '{7, 3, 1, 0}',
  task_due_days INTEGER[] NOT NULL DEFAULT '{3, 1}',
  
  -- Timing
  reminder_hour INTEGER NOT NULL DEFAULT 9,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id)
);

-- RLS for reminder_settings
ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company settings"
  ON reminder_settings FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert company settings"
  ON reminder_settings FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can update settings"
  ON reminder_settings FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  );

-- Create function to generate deadline reminders
CREATE OR REPLACE FUNCTION generate_deadline_reminders()
RETURNS TABLE(reminders_created INTEGER, errors TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _settings reminder_settings;
  _days INTEGER;
  _created INTEGER := 0;
  _errors TEXT[] := '{}';
BEGIN
  -- Process each company's settings
  FOR _settings IN SELECT * FROM reminder_settings WHERE is_active = true
  LOOP
    -- Response Deadlines
    FOREACH _days IN ARRAY _settings.response_deadline_days
    LOOP
      INSERT INTO deadline_reminders (
        reminder_type, entity_id, deadline_date, staff_id, 
        days_before, scheduled_for
      )
      SELECT 
        'response_deadline'::reminder_type,
        lm.id,
        lm.response_deadline,
        a.staff_id,
        _days,
        (lm.response_deadline::date - _days) + (_settings.reminder_hour || ' hours')::interval
      FROM litigation_matters lm
      JOIN assignments a ON a.entity_id = lm.id 
        AND a.entity_type = 'litigation_matter' 
        AND a.is_active = true
      WHERE lm.response_deadline IS NOT NULL
        AND lm.response_deadline > now()
        AND lm.status NOT IN ('settled', 'dismissed', 'dropped', 'judgment', 'declined')
        AND (lm.response_deadline::date - _days) >= CURRENT_DATE
        AND (lm.response_deadline::date - _days) <= CURRENT_DATE + 1
      ON CONFLICT (reminder_type, entity_id, staff_id, days_before) DO NOTHING;
    END LOOP;
    
    -- Hearings
    FOREACH _days IN ARRAY _settings.hearing_days
    LOOP
      INSERT INTO deadline_reminders (
        reminder_type, entity_id, deadline_date, staff_id,
        days_before, scheduled_for
      )
      SELECT 
        'hearing'::reminder_type,
        lh.id,
        lh.scheduled_date,
        a.staff_id,
        _days,
        (lh.scheduled_date::date - _days) + (_settings.reminder_hour || ' hours')::interval
      FROM litigation_hearings lh
      JOIN litigation_matters lm ON lm.id = lh.matter_id
      JOIN assignments a ON a.entity_id = lm.id 
        AND a.entity_type = 'litigation_matter' 
        AND a.is_active = true
      WHERE lh.scheduled_date > now()
        AND lh.outcome IS NULL
        AND lm.status NOT IN ('settled', 'dismissed', 'dropped', 'judgment', 'declined')
        AND (lh.scheduled_date::date - _days) >= CURRENT_DATE
        AND (lh.scheduled_date::date - _days) <= CURRENT_DATE + 1
      ON CONFLICT (reminder_type, entity_id, staff_id, days_before) DO NOTHING;
    END LOOP;
  END LOOP;
  
  SELECT COUNT(*) INTO _created FROM deadline_reminders 
    WHERE created_at > now() - interval '1 minute' AND status = 'pending';
  
  reminders_created := _created;
  errors := _errors;
  RETURN NEXT;
END;
$$;

-- Add response_deadline_reminder to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'response_deadline_reminder';

-- Trigger for updated_at
CREATE TRIGGER update_deadline_reminders_updated_at
  BEFORE UPDATE ON deadline_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_settings_updated_at
  BEFORE UPDATE ON reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();