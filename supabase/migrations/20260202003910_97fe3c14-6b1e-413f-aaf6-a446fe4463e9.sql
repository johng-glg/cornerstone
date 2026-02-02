-- Create communication_type enum
CREATE TYPE communication_type AS ENUM ('call', 'email', 'sms', 'meeting', 'note');

-- Create communication_direction enum
CREATE TYPE communication_direction AS ENUM ('inbound', 'outbound');

-- Create client_communications table
CREATE TABLE public.client_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  communication_type communication_type NOT NULL DEFAULT 'call',
  direction communication_direction NOT NULL DEFAULT 'outbound',
  subject TEXT,
  notes TEXT,
  outcome TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  duration_minutes INTEGER,
  staff_id UUID REFERENCES public.staff(id),
  communication_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for staff access
CREATE POLICY "Staff can access client communications"
ON public.client_communications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_communications.client_id
    AND can_access_company(auth.uid(), c.company_id)
  )
);

-- Create index for efficient queries
CREATE INDEX idx_client_communications_client_id ON public.client_communications(client_id);
CREATE INDEX idx_client_communications_date ON public.client_communications(communication_date DESC);