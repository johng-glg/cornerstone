-- Create notification_type enum
CREATE TYPE notification_type AS ENUM (
  'task_assigned',
  'task_due_soon',
  'task_overdue',
  'lead_assigned',
  'matter_assigned',
  'hearing_reminder',
  'settlement_update',
  'mention',
  'system_alert'
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_unread 
  ON notifications(user_id, is_read) 
  WHERE is_read = false;

CREATE INDEX idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow inserts for authenticated users (triggers run as definer)
CREATE POLICY "Allow notification inserts"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create notification_preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, notification_type)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create helper function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
  _user_id UUID,
  _type notification_type,
  _title TEXT,
  _message TEXT DEFAULT NULL,
  _link TEXT DEFAULT NULL,
  _entity_type TEXT DEFAULT NULL,
  _entity_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification_id UUID;
  _in_app_enabled BOOLEAN;
BEGIN
  -- Check if user has in-app notifications enabled for this type
  SELECT COALESCE(in_app_enabled, true) INTO _in_app_enabled
  FROM notification_preferences
  WHERE user_id = _user_id AND notification_type = _type;
  
  -- Default to true if no preference exists
  _in_app_enabled := COALESCE(_in_app_enabled, true);
  
  IF _in_app_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link, entity_type, entity_id)
    VALUES (_user_id, _type, _title, _message, _link, _entity_type, _entity_id)
    RETURNING id INTO _notification_id;
  END IF;
  
  RETURN _notification_id;
END;
$$;

-- Create trigger function for task assignments
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assignee_user_id UUID;
BEGIN
  -- Only notify on new assignment or reassignment
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    
    -- Get the user_id from staff table
    SELECT user_id INTO _assignee_user_id
    FROM staff WHERE id = NEW.assigned_to;
    
    IF _assignee_user_id IS NOT NULL THEN
      PERFORM create_notification(
        _assignee_user_id,
        'task_assigned',
        'New Task Assigned',
        NEW.title,
        '/tasks',
        'task',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on tasks table
CREATE TRIGGER trg_notify_task_assignment
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assignment();