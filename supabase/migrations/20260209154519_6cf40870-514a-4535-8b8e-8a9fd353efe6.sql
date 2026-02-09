
-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast lookups by entity
CREATE INDEX idx_notes_entity ON public.notes (entity_type, entity_id);
CREATE INDEX idx_notes_created_by ON public.notes (created_by);

-- Create note_mentions table
CREATE TABLE public.note_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  mentioned_staff_id UUID NOT NULL REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_note_mentions_note ON public.note_mentions (note_id);
CREATE INDEX idx_note_mentions_staff ON public.note_mentions (mentioned_staff_id);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_mentions ENABLE ROW LEVEL SECURITY;

-- Notes RLS: all authenticated can read/create, only author can update/delete
CREATE POLICY "Authenticated users can read notes"
  ON public.notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create notes"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authors can update their own notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (created_by IN (SELECT id FROM public.staff WHERE user_id = auth.uid()));

CREATE POLICY "Authors can delete their own notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING (created_by IN (SELECT id FROM public.staff WHERE user_id = auth.uid()));

-- Note mentions RLS
CREATE POLICY "Authenticated users can read note mentions"
  ON public.note_mentions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create note mentions"
  ON public.note_mentions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to notify mentioned users
CREATE OR REPLACE FUNCTION public.notify_note_mention()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _author_name TEXT;
  _entity_type TEXT;
  _note_content TEXT;
BEGIN
  -- Get mentioned user's user_id
  SELECT user_id INTO _user_id
  FROM staff WHERE id = NEW.mentioned_staff_id;

  -- Get author name and note info
  SELECT 
    s.first_name || ' ' || s.last_name,
    n.entity_type,
    LEFT(n.content, 100)
  INTO _author_name, _entity_type, _note_content
  FROM notes n
  JOIN staff s ON s.id = n.created_by
  WHERE n.id = NEW.note_id;

  IF _user_id IS NOT NULL THEN
    PERFORM create_notification(
      _user_id,
      'mention',
      'You were mentioned in a note',
      format('%s mentioned you: %s', _author_name, _note_content),
      NULL,
      _entity_type,
      NEW.note_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_notify_note_mention
  AFTER INSERT ON public.note_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_note_mention();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
