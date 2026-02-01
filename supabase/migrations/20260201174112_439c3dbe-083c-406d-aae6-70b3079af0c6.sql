-- Migration Part 1: Create new enums and add columns (without using new enum values in same transaction)

-- Step 1: Create new enums for the multi-dimensional status system
CREATE TYPE payment_status_enum AS ENUM ('current', 'paused', 'nsf', 'past_due', 'suspended');
CREATE TYPE retention_type_enum AS ENUM ('client_requested_cancel', 'company_initiated_cancel', 'at_risk', 'churn_risk', 'complaint');
CREATE TYPE contact_status_enum AS ENUM ('reachable', 'hard_to_reach', 'unreachable', 'no_contact_allowed');
CREATE TYPE client_status_enum AS ENUM ('active', 'inactive');

-- Step 2: Add new status dimension columns to client_services
-- Payment Status (only relevant when primary status is 'active')
ALTER TABLE client_services ADD COLUMN payment_status payment_status_enum DEFAULT NULL;

-- Retention Status (cancellation risk tracking)
ALTER TABLE client_services ADD COLUMN retention_flag BOOLEAN DEFAULT false;
ALTER TABLE client_services ADD COLUMN retention_type retention_type_enum DEFAULT NULL;
ALTER TABLE client_services ADD COLUMN retention_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE client_services ADD COLUMN retention_reason TEXT DEFAULT NULL;
ALTER TABLE client_services ADD COLUMN retention_assigned_to UUID REFERENCES staff(id) DEFAULT NULL;

-- Contact Status (client reachability)
ALTER TABLE client_services ADD COLUMN contact_status contact_status_enum DEFAULT 'reachable';
ALTER TABLE client_services ADD COLUMN last_successful_contact_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE client_services ADD COLUMN contact_attempts_count INTEGER DEFAULT 0;
ALTER TABLE client_services ADD COLUMN last_contact_attempt_date TIMESTAMPTZ DEFAULT NULL;

-- Status change timestamps
ALTER TABLE client_services ADD COLUMN primary_status_changed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE client_services ADD COLUMN payment_status_changed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE client_services ADD COLUMN contact_status_changed_at TIMESTAMPTZ DEFAULT NULL;

-- Step 3: Add client status field
ALTER TABLE clients ADD COLUMN status client_status_enum DEFAULT 'inactive';

-- Step 4: Create status history table
CREATE TABLE service_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id UUID NOT NULL REFERENCES client_services(id) ON DELETE CASCADE,
  status_dimension TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  changed_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on status history
ALTER TABLE service_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Staff can access status history for services they can access
CREATE POLICY "Staff can access service status history"
ON service_status_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM client_services cs
    WHERE cs.id = service_status_history.client_service_id
    AND can_access_company(auth.uid(), cs.owning_company_id)
  )
);

-- Step 5: Create indexes for efficient filtering
CREATE INDEX idx_client_services_payment_status ON client_services(payment_status);
CREATE INDEX idx_client_services_retention_flag ON client_services(retention_flag);
CREATE INDEX idx_client_services_contact_status ON client_services(contact_status);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_service_status_history_client_service ON service_status_history(client_service_id);

-- Step 6: Create trigger function to auto-update client status
CREATE OR REPLACE FUNCTION update_client_status()
RETURNS TRIGGER AS $$
DECLARE
  target_client_id UUID;
BEGIN
  target_client_id := COALESCE(NEW.primary_client_id, OLD.primary_client_id);
  
  IF target_client_id IS NOT NULL THEN
    UPDATE clients c
    SET status = CASE 
      WHEN EXISTS (
        SELECT 1 FROM client_services cs 
        WHERE cs.primary_client_id = c.id 
        AND cs.status = 'active'
      ) THEN 'active'::client_status_enum
      ELSE 'inactive'::client_status_enum
    END
    WHERE c.id = target_client_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on client_services
CREATE TRIGGER trigger_update_client_status
AFTER INSERT OR UPDATE OF status, primary_client_id OR DELETE
ON client_services
FOR EACH ROW
EXECUTE FUNCTION update_client_status();

-- Step 7: Add new enum values to service_status (will be used in next migration)
ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'graduated';
ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'dropped';
ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Initialize payment_status for existing 'active' services
UPDATE client_services SET payment_status = 'current' WHERE status = 'active';

-- Set primary_status_changed_at to created_at for existing records
UPDATE client_services SET primary_status_changed_at = created_at WHERE primary_status_changed_at IS NULL;

-- Update all client statuses based on their current services
UPDATE clients c
SET status = CASE 
  WHEN EXISTS (
    SELECT 1 FROM client_services cs 
    WHERE cs.primary_client_id = c.id 
    AND cs.status = 'active'
  ) THEN 'active'::client_status_enum
  ELSE 'inactive'::client_status_enum
END;