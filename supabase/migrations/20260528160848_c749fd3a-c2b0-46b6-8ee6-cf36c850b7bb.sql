-- 12A: staff.dialpad_user_id
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS dialpad_user_id BIGINT;

-- 12B: dialpad_calls
CREATE TABLE public.dialpad_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  dialpad_call_id TEXT UNIQUE NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  initiated_by UUID REFERENCES public.staff(id),
  target_phone TEXT NOT NULL,
  direction TEXT,
  state TEXT,
  duration_seconds INTEGER,
  recording_url TEXT,
  voicemail_url TEXT,
  voicemail_transcript TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dialpad_calls_related
  ON public.dialpad_calls (related_entity_type, related_entity_id);
CREATE INDEX idx_dialpad_calls_initiator
  ON public.dialpad_calls (initiated_by, created_at DESC);
CREATE INDEX idx_dialpad_calls_company_created
  ON public.dialpad_calls (company_id, created_at DESC);

GRANT SELECT ON public.dialpad_calls TO authenticated;
GRANT ALL ON public.dialpad_calls TO service_role;

ALTER TABLE public.dialpad_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read dialpad calls within company"
  ON public.dialpad_calls FOR SELECT
  TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

-- Realtime so the CallButton can subscribe.
ALTER TABLE public.dialpad_calls REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dialpad_calls;

-- 12A registry seed
INSERT INTO public.integration_providers
  (provider_key, display_name, category, description, docs_url, icon_key, auth_method, default_event_subscriptions)
VALUES (
  'dialpad', 'Dialpad', 'telephony',
  'Click-to-call, call state webhooks, recordings, and inbound screen pop.',
  'https://developers.dialpad.com/reference',
  'phone', 'api_key',
  ARRAY['state_changed','recording','voicemail']
)
ON CONFLICT (provider_key) DO NOTHING;