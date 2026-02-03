-- Add partial unique index to enforce single-role assignments
-- This ensures only one active assignment per role per entity for key roles
CREATE UNIQUE INDEX idx_assignments_single_role 
ON assignments (entity_type, entity_id, assignment_type)
WHERE is_active = true 
  AND assignment_type IN (
    'litigation_attorney', 
    'case_manager', 
    'negotiator', 
    'primary_attorney', 
    'client_services_rep', 
    'sales_rep'
  );