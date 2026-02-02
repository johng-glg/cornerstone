-- Workflow Automation Builder Schema

-- Create enums for workflow types
CREATE TYPE workflow_trigger_type AS ENUM (
  'status_changed',
  'field_updated',
  'record_created',
  'time_based',
  'manual'
);

CREATE TYPE workflow_entity_type AS ENUM (
  'leads',
  'client_services',
  'liabilities',
  'litigation_matters',
  'tasks',
  'settlements'
);

CREATE TYPE workflow_action_type AS ENUM (
  'create_task',
  'send_notification',
  'update_field',
  'block_transition',
  'trigger_webhook'
);

CREATE TYPE workflow_execution_status AS ENUM (
  'success',
  'blocked',
  'failed',
  'skipped'
);

-- Table for workflow rules
CREATE TABLE workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger configuration
  entity_type workflow_entity_type NOT NULL,
  trigger_type workflow_trigger_type NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Conditions (array of condition groups - OR between groups, AND within)
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Actions to execute
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_blocking BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES staff(id)
);

-- Index for rule lookup
CREATE INDEX idx_workflow_rules_lookup 
  ON workflow_rules(company_id, entity_type, trigger_type, is_active)
  WHERE is_active = true;

-- RLS for workflow_rules
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company workflow rules"
  ON workflow_rules FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert company workflow rules"
  ON workflow_rules FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company workflow rules"
  ON workflow_rules FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete company workflow rules"
  ON workflow_rules FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

-- Table for workflow execution logs
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,
  entity_type workflow_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  
  status workflow_execution_status NOT NULL,
  trigger_data JSONB,
  condition_results JSONB,
  actions_executed JSONB,
  error_message TEXT,
  block_message TEXT,
  
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER
);

-- Index for entity history
CREATE INDEX idx_workflow_executions_entity 
  ON workflow_executions(entity_type, entity_id, executed_at DESC);

CREATE INDEX idx_workflow_executions_rule 
  ON workflow_executions(rule_id, executed_at DESC);

-- RLS for workflow_executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view workflow executions"
  ON workflow_executions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workflow_rules r 
    WHERE r.id = rule_id 
    AND r.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "System can insert workflow executions"
  ON workflow_executions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workflow_rules r 
    WHERE r.id = rule_id 
    AND r.company_id = get_user_company_id(auth.uid())
  ));

-- Helper function to check if trigger matches
CREATE OR REPLACE FUNCTION check_trigger_match(
  _trigger_config JSONB,
  _trigger_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _from_statuses TEXT[];
  _to_statuses TEXT[];
BEGIN
  -- For status_changed triggers
  IF _trigger_data ? 'from' AND _trigger_data ? 'to' THEN
    -- Check 'from' filter (if specified)
    IF _trigger_config ? 'from' AND jsonb_array_length(_trigger_config->'from') > 0 THEN
      SELECT array_agg(value::text) INTO _from_statuses 
      FROM jsonb_array_elements_text(_trigger_config->'from');
      
      IF NOT (_trigger_data->>'from' = ANY(_from_statuses)) THEN
        RETURN false;
      END IF;
    END IF;
    
    -- Check 'to' filter (if specified)
    IF _trigger_config ? 'to' AND jsonb_array_length(_trigger_config->'to') > 0 THEN
      SELECT array_agg(value::text) INTO _to_statuses 
      FROM jsonb_array_elements_text(_trigger_config->'to');
      
      IF NOT (_trigger_data->>'to' = ANY(_to_statuses)) THEN
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  -- For field_updated triggers
  IF _trigger_config ? 'field' AND _trigger_data ? 'field' THEN
    IF _trigger_config->>'field' != _trigger_data->>'field' THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Function to evaluate conditions against entity
CREATE OR REPLACE FUNCTION evaluate_workflow_conditions(
  _conditions JSONB,
  _entity_type workflow_entity_type,
  _entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _condition_group JSONB;
  _condition JSONB;
  _group_result BOOLEAN;
  _field_value TEXT;
  _comparison_value TEXT;
  _operator TEXT;
  _related_count INTEGER;
  _related_matching INTEGER;
BEGIN
  -- Empty conditions = always true
  IF jsonb_array_length(_conditions) = 0 THEN
    RETURN true;
  END IF;
  
  -- Evaluate each condition group (OR logic between groups)
  FOR _condition_group IN SELECT * FROM jsonb_array_elements(_conditions)
  LOOP
    _group_result := true;
    
    -- Evaluate each condition in the group (AND logic within group)
    FOR _condition IN SELECT * FROM jsonb_array_elements(_condition_group->'rules')
    LOOP
      _operator := _condition->>'operator';
      _comparison_value := _condition->>'value';
      
      -- Handle related entity conditions
      IF _condition ? 'related_entity' THEN
        -- Get counts based on entity type
        IF _entity_type = 'client_services' AND (_condition->>'related_entity') = 'liabilities' THEN
          -- Count liabilities for this service
          SELECT COUNT(*) INTO _related_count
          FROM liabilities
          WHERE client_service_id = _entity_id;
          
          -- Count matching liabilities
          IF _operator = 'all_match' THEN
            SELECT COUNT(*) INTO _related_matching
            FROM liabilities
            WHERE client_service_id = _entity_id
              AND status = ANY(
                SELECT jsonb_array_elements_text(_condition->'value')
              );
            
            IF _related_count = 0 OR _related_matching != _related_count THEN
              _group_result := false;
            END IF;
          ELSIF _operator = 'none_match' THEN
            SELECT COUNT(*) INTO _related_matching
            FROM liabilities
            WHERE client_service_id = _entity_id
              AND status = ANY(
                SELECT jsonb_array_elements_text(_condition->'value')
              );
            
            IF _related_matching > 0 THEN
              _group_result := false;
            END IF;
          ELSIF _operator = 'count_greater' THEN
            IF _related_count <= (_comparison_value::integer) THEN
              _group_result := false;
            END IF;
          END IF;
        END IF;
      ELSE
        -- Handle direct field conditions
        EXECUTE format(
          'SELECT %I::text FROM %I WHERE id = $1',
          _condition->>'field',
          _entity_type::text
        ) INTO _field_value USING _entity_id;
        
        CASE _operator
          WHEN 'equals' THEN
            IF _field_value IS DISTINCT FROM _comparison_value THEN
              _group_result := false;
            END IF;
          WHEN 'not_equals' THEN
            IF _field_value IS NOT DISTINCT FROM _comparison_value THEN
              _group_result := false;
            END IF;
          WHEN 'greater_than' THEN
            IF (_field_value::numeric) <= (_comparison_value::numeric) THEN
              _group_result := false;
            END IF;
          WHEN 'less_than' THEN
            IF (_field_value::numeric) >= (_comparison_value::numeric) THEN
              _group_result := false;
            END IF;
          WHEN 'contains' THEN
            IF _field_value NOT ILIKE '%' || _comparison_value || '%' THEN
              _group_result := false;
            END IF;
          WHEN 'in' THEN
            IF NOT (_field_value = ANY(
              SELECT jsonb_array_elements_text(_condition->'value')
            )) THEN
              _group_result := false;
            END IF;
          ELSE
            -- Unknown operator, skip
            NULL;
        END CASE;
      END IF;
      
      -- Exit early if condition failed
      IF NOT _group_result THEN
        EXIT;
      END IF;
    END LOOP;
    
    -- If any group passes, return true (OR logic)
    IF _group_result THEN
      RETURN true;
    END IF;
  END LOOP;
  
  -- No groups passed
  RETURN false;
END;
$$;

-- Main function to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition(
  _entity_type workflow_entity_type,
  _entity_id UUID,
  _from_status TEXT,
  _to_status TEXT
)
RETURNS TABLE(
  allowed BOOLEAN,
  block_message TEXT,
  rule_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rule workflow_rules;
  _company_id UUID;
  _conditions_met BOOLEAN;
  _trigger_data JSONB;
  _start_time TIMESTAMPTZ;
  _duration INTEGER;
BEGIN
  -- Get company_id based on entity type
  CASE _entity_type
    WHEN 'leads' THEN
      SELECT company_id INTO _company_id FROM leads WHERE id = _entity_id;
    WHEN 'client_services' THEN
      SELECT owning_company_id INTO _company_id FROM client_services WHERE id = _entity_id;
    WHEN 'liabilities' THEN
      SELECT cs.owning_company_id INTO _company_id 
      FROM liabilities l
      JOIN client_services cs ON cs.id = l.client_service_id
      WHERE l.id = _entity_id;
    WHEN 'litigation_matters' THEN
      SELECT cs.owning_company_id INTO _company_id 
      FROM litigation_matters lm
      JOIN client_services cs ON cs.id = lm.client_service_id
      WHERE lm.id = _entity_id;
    ELSE
      -- Default: try to get from entity directly
      EXECUTE format('SELECT company_id FROM %I WHERE id = $1', _entity_type::text)
        INTO _company_id USING _entity_id;
  END CASE;
  
  IF _company_id IS NULL THEN
    allowed := true;
    block_message := null;
    rule_name := null;
    RETURN NEXT;
    RETURN;
  END IF;
  
  _trigger_data := jsonb_build_object('from', _from_status, 'to', _to_status);
  
  -- Find blocking rules that match
  FOR _rule IN
    SELECT * FROM workflow_rules
    WHERE company_id = _company_id
      AND entity_type = _entity_type
      AND trigger_type = 'status_changed'
      AND is_active = true
      AND is_blocking = true
    ORDER BY priority DESC
  LOOP
    _start_time := clock_timestamp();
    
    -- Check if trigger matches
    IF NOT check_trigger_match(_rule.trigger_config, _trigger_data) THEN
      CONTINUE;
    END IF;
    
    -- Evaluate conditions
    _conditions_met := evaluate_workflow_conditions(
      _rule.conditions,
      _entity_type,
      _entity_id
    );
    
    _duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - _start_time)::INTEGER;
    
    -- If conditions are met for a blocking rule, block the transition
    IF _conditions_met THEN
      -- Log the blocked execution
      INSERT INTO workflow_executions (
        rule_id, entity_type, entity_id, status,
        trigger_data, condition_results, block_message, duration_ms
      ) VALUES (
        _rule.id, _entity_type, _entity_id, 'blocked',
        _trigger_data, _rule.conditions,
        COALESCE(_rule.actions->0->'config'->>'message', 'Transition blocked by workflow rule: ' || _rule.name),
        _duration
      );
      
      allowed := false;
      block_message := COALESCE(_rule.actions->0->'config'->>'message', 'Transition blocked by workflow rule: ' || _rule.name);
      rule_name := _rule.name;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
  
  -- No blocking rules triggered
  allowed := true;
  block_message := null;
  rule_name := null;
  RETURN NEXT;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_workflow_rules_updated_at
  BEFORE UPDATE ON workflow_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();