
-- Add UTM tracking fields to leads table for marketing attribution
ALTER TABLE public.leads
  ADD COLUMN utm_source TEXT,
  ADD COLUMN utm_medium TEXT,
  ADD COLUMN utm_campaign TEXT,
  ADD COLUMN utm_term TEXT,
  ADD COLUMN utm_content TEXT,
  ADD COLUMN landing_page TEXT,
  ADD COLUMN referrer_url TEXT;

-- Add index for common UTM queries
CREATE INDEX idx_leads_utm_source ON public.leads (utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX idx_leads_utm_campaign ON public.leads (utm_campaign) WHERE utm_campaign IS NOT NULL;
