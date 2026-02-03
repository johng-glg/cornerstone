-- Add Forth CRM Contact ID to clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS forth_crm_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_clients_forth_crm_id ON clients(forth_crm_id);

-- Add sync tracking columns to transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Create sync log for audit trail
CREATE TABLE IF NOT EXISTS forth_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction', 'client', 'draft')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'poll', 'cancel', 'pause', 'resume', 'sync')),
  request_payload JSONB,
  response_payload JSONB,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sync log
ALTER TABLE forth_sync_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read sync logs (staff can view audit trail)
CREATE POLICY "Staff can view sync logs" ON forth_sync_log
FOR SELECT TO authenticated USING (true);

-- Only system can insert (via edge functions with service role)
CREATE POLICY "System can insert sync logs" ON forth_sync_log
FOR INSERT WITH CHECK (true);

-- Add index for querying by entity
CREATE INDEX IF NOT EXISTS idx_forth_sync_log_entity ON forth_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_forth_sync_log_created ON forth_sync_log(created_at DESC);