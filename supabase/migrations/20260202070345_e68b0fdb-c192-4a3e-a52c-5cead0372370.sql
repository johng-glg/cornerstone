-- Create assignment_method enum
CREATE TYPE assignment_method AS ENUM (
  'round_robin',
  'weighted',
  'backlog_based',
  'skillset_match'
);

-- Create queue_status enum
CREATE TYPE queue_status AS ENUM ('pending', 'assigned', 'expired', 'manual');

-- Create assignment_action enum
CREATE TYPE assignment_action AS ENUM (
  'auto_assigned',
  'manual_assigned',
  'reassigned',
  'unassigned',
  'queue_added',
  'queue_expired'
);

-- Create lead_assignment_rules table
CREATE TABLE lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  method assignment_method NOT NULL DEFAULT 'round_robin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  source lead_source,
  interest_type lead_interest,
  min_debt_amount NUMERIC,
  max_debt_amount NUMERIC,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for rule matching
CREATE INDEX idx_assignment_rules_lookup 
  ON lead_assignment_rules(company_id, is_active, priority DESC);

-- Enable RLS
ALTER TABLE lead_assignment_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for rules
CREATE POLICY "Users can view company rules"
  ON lead_assignment_rules FOR SELECT
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert company rules"
  ON lead_assignment_rules FOR INSERT
  WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company rules"
  ON lead_assignment_rules FOR UPDATE
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete company rules"
  ON lead_assignment_rules FOR DELETE
  USING (company_id = get_user_company_id(auth.uid()));

-- Create lead_assignment_pool table
CREATE TABLE lead_assignment_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES lead_assignment_rules(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL DEFAULT 10,
  max_active_leads INTEGER DEFAULT 25,
  is_available BOOLEAN NOT NULL DEFAULT true,
  skills JSONB DEFAULT '[]'::jsonb,
  last_assigned_at TIMESTAMPTZ,
  assignment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rule_id, staff_id)
);

-- Index for availability lookup
CREATE INDEX idx_pool_available 
  ON lead_assignment_pool(rule_id, is_available) 
  WHERE is_available = true;

-- Enable RLS
ALTER TABLE lead_assignment_pool ENABLE ROW LEVEL SECURITY;

-- RLS policies for pool
CREATE POLICY "Staff can view pools"
  ON lead_assignment_pool FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM lead_assignment_rules r 
    WHERE r.id = rule_id 
    AND r.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Staff can manage pools"
  ON lead_assignment_pool FOR ALL
  USING (EXISTS (
    SELECT 1 FROM lead_assignment_rules r 
    WHERE r.id = rule_id 
    AND r.company_id = get_user_company_id(auth.uid())
  ));

-- Create lead_assignment_queue table
CREATE TABLE lead_assignment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES lead_assignment_rules(id) ON DELETE SET NULL,
  status queue_status NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES staff(id),
  assignment_method assignment_method,
  assignment_reason TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for queue processing
CREATE INDEX idx_queue_pending 
  ON lead_assignment_queue(status, priority DESC, queued_at ASC) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE lead_assignment_queue ENABLE ROW LEVEL SECURITY;

-- RLS policy for queue
CREATE POLICY "Staff can view queue"
  ON lead_assignment_queue FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = lead_id 
    AND l.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Staff can manage queue"
  ON lead_assignment_queue FOR ALL
  USING (EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = lead_id 
    AND l.company_id = get_user_company_id(auth.uid())
  ));

-- Create lead_assignment_log table
CREATE TABLE lead_assignment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  action assignment_action NOT NULL,
  from_staff_id UUID REFERENCES staff(id),
  to_staff_id UUID REFERENCES staff(id),
  performed_by UUID REFERENCES staff(id),
  rule_id UUID REFERENCES lead_assignment_rules(id),
  method assignment_method,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lead history
CREATE INDEX idx_assignment_log_lead 
  ON lead_assignment_log(lead_id, created_at DESC);

-- Enable RLS
ALTER TABLE lead_assignment_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for log
CREATE POLICY "Staff can view logs"
  ON lead_assignment_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = lead_id 
    AND l.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Staff can insert logs"
  ON lead_assignment_log FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = lead_id 
    AND l.company_id = get_user_company_id(auth.uid())
  ));

-- Create assign_lead function
CREATE OR REPLACE FUNCTION assign_lead(
  _lead_id UUID,
  _force_method assignment_method DEFAULT NULL,
  _force_staff_id UUID DEFAULT NULL
)
RETURNS TABLE(
  assigned_to UUID,
  method assignment_method,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead leads;
  _rule lead_assignment_rules;
  _pool_member lead_assignment_pool;
  _staff_id UUID;
  _method assignment_method;
  _reason TEXT;
  _min_count INTEGER;
  _total_weight INTEGER;
  _rand_weight INTEGER;
  _cumulative INTEGER;
  _user_id UUID;
BEGIN
  -- Get lead details
  SELECT * INTO _lead FROM leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  
  -- Manual assignment override
  IF _force_staff_id IS NOT NULL THEN
    UPDATE leads SET assigned_to = _force_staff_id WHERE id = _lead_id;
    
    INSERT INTO lead_assignment_log (lead_id, action, from_staff_id, to_staff_id, reason)
    VALUES (_lead_id, 'manual_assigned', _lead.assigned_to, _force_staff_id, 'Manual assignment');
    
    -- Create notification for assigned staff
    SELECT user_id INTO _user_id FROM staff WHERE id = _force_staff_id;
    IF _user_id IS NOT NULL THEN
      PERFORM create_notification(
        _user_id,
        'lead_assigned',
        'New Lead Assigned',
        format('%s %s - Manual assignment', _lead.first_name, _lead.last_name),
        '/leads',
        'lead',
        _lead_id
      );
    END IF;
    
    RETURN QUERY SELECT _force_staff_id, NULL::assignment_method, 'Manual assignment'::TEXT;
    RETURN;
  END IF;
  
  -- Find matching rule (highest priority first)
  SELECT * INTO _rule
  FROM lead_assignment_rules
  WHERE company_id = _lead.company_id
    AND is_active = true
    AND (source IS NULL OR source = _lead.source)
    AND (interest_type IS NULL OR interest_type = _lead.interest_type)
    AND (min_debt_amount IS NULL OR _lead.estimated_debt_amount >= min_debt_amount)
    AND (max_debt_amount IS NULL OR _lead.estimated_debt_amount <= max_debt_amount)
  ORDER BY priority DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    _reason := 'No matching assignment rule';
    RETURN QUERY SELECT NULL::UUID, NULL::assignment_method, _reason;
    RETURN;
  END IF;
  
  _method := COALESCE(_force_method, _rule.method);
  
  -- Execute assignment based on method
  CASE _method
    WHEN 'round_robin' THEN
      SELECT p.staff_id INTO _staff_id
      FROM lead_assignment_pool p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.rule_id = _rule.id
        AND p.is_available = true
        AND s.is_active = true
      ORDER BY p.last_assigned_at ASC NULLS FIRST, p.assignment_count ASC
      LIMIT 1;
      
      _reason := 'Round robin - next in rotation';
      
    WHEN 'weighted' THEN
      SELECT SUM(weight) INTO _total_weight
      FROM lead_assignment_pool p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.rule_id = _rule.id AND p.is_available = true AND s.is_active = true;
      
      IF _total_weight > 0 THEN
        _rand_weight := floor(random() * _total_weight)::INTEGER;
        _cumulative := 0;
        
        FOR _pool_member IN
          SELECT p.* FROM lead_assignment_pool p
          JOIN staff s ON s.id = p.staff_id
          WHERE p.rule_id = _rule.id AND p.is_available = true AND s.is_active = true
          ORDER BY p.weight DESC
        LOOP
          _cumulative := _cumulative + _pool_member.weight;
          IF _cumulative > _rand_weight THEN
            _staff_id := _pool_member.staff_id;
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      _reason := 'Weighted random selection';
      
    WHEN 'backlog_based' THEN
      SELECT p.staff_id, COUNT(l.id) as active_count INTO _staff_id, _min_count
      FROM lead_assignment_pool p
      JOIN staff s ON s.id = p.staff_id
      LEFT JOIN leads l ON l.assigned_to = p.staff_id 
        AND l.status NOT IN ('converted', 'lost')
      WHERE p.rule_id = _rule.id AND p.is_available = true AND s.is_active = true
      GROUP BY p.staff_id, p.max_active_leads
      HAVING COUNT(l.id) < COALESCE(p.max_active_leads, 25)
      ORDER BY COUNT(l.id) ASC
      LIMIT 1;
      
      _reason := format('Lowest backlog (%s active leads)', COALESCE(_min_count, 0));
      
    WHEN 'skillset_match' THEN
      SELECT p.staff_id INTO _staff_id
      FROM lead_assignment_pool p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.rule_id = _rule.id AND p.is_available = true AND s.is_active = true
      ORDER BY (
        CASE WHEN p.skills @> jsonb_build_array(jsonb_build_object('type', 'interest_type', 'value', _lead.interest_type::text)) THEN 10 ELSE 0 END
        + CASE WHEN _lead.has_active_lawsuit AND p.skills @> jsonb_build_array(jsonb_build_object('type', 'has_lawsuit', 'value', true)) THEN 15 ELSE 0 END
        + CASE WHEN _lead.estimated_debt_amount >= 50000 AND p.skills @> jsonb_build_array(jsonb_build_object('type', 'high_value')) THEN 10 ELSE 0 END
      ) DESC,
      p.assignment_count ASC
      LIMIT 1;
      
      _reason := 'Best skillset match';
      
  END CASE;
  
  -- Update lead and pool if assignment successful
  IF _staff_id IS NOT NULL THEN
    UPDATE leads SET assigned_to = _staff_id WHERE id = _lead_id;
    
    UPDATE lead_assignment_pool
    SET 
      last_assigned_at = now(),
      assignment_count = assignment_count + 1,
      updated_at = now()
    WHERE rule_id = _rule.id AND staff_id = _staff_id;
    
    INSERT INTO lead_assignment_log (lead_id, action, from_staff_id, to_staff_id, rule_id, method, reason)
    VALUES (_lead_id, 'auto_assigned', _lead.assigned_to, _staff_id, _rule.id, _method, _reason);
    
    -- Create notification for assigned staff
    SELECT user_id INTO _user_id FROM staff WHERE id = _staff_id;
    IF _user_id IS NOT NULL THEN
      PERFORM create_notification(
        _user_id,
        'lead_assigned',
        'New Lead Assigned',
        format('%s %s - %s', _lead.first_name, _lead.last_name, _reason),
        '/leads',
        'lead',
        _lead_id
      );
    END IF;
  ELSE
    _reason := 'No available staff in pool';
    
    -- Add to queue
    INSERT INTO lead_assignment_queue (lead_id, rule_id, priority)
    VALUES (_lead_id, _rule.id, COALESCE(_lead.lead_score, 0));
    
    INSERT INTO lead_assignment_log (lead_id, action, rule_id, reason)
    VALUES (_lead_id, 'queue_added', _rule.id, _reason);
  END IF;
  
  RETURN QUERY SELECT _staff_id, _method, _reason;
END;
$$;

-- Create trigger function for auto-assignment
CREATE OR REPLACE FUNCTION trigger_auto_assign_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rule lead_assignment_rules;
  _result RECORD;
BEGIN
  -- Only auto-assign if no assignment
  IF NEW.assigned_to IS NULL THEN
    -- Check if there's an active auto-assign rule
    SELECT * INTO _rule
    FROM lead_assignment_rules
    WHERE company_id = NEW.company_id
      AND is_active = true
      AND (config->>'auto_assign')::boolean = true
      AND (source IS NULL OR source = NEW.source)
      AND (interest_type IS NULL OR interest_type = NEW.interest_type)
    ORDER BY priority DESC
    LIMIT 1;
    
    IF FOUND THEN
      SELECT * INTO _result FROM assign_lead(NEW.id);
      IF _result.assigned_to IS NOT NULL THEN
        NEW.assigned_to := _result.assigned_to;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment (using BEFORE to modify NEW)
CREATE TRIGGER trg_auto_assign_lead
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_lead();

-- Create queue processing function
CREATE OR REPLACE FUNCTION process_assignment_queue()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _queue_item lead_assignment_queue;
  _result RECORD;
  _processed INTEGER := 0;
BEGIN
  FOR _queue_item IN
    SELECT * FROM lead_assignment_queue
    WHERE status = 'pending'
    ORDER BY priority DESC, queued_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO _result FROM assign_lead(_queue_item.lead_id);
    
    IF _result.assigned_to IS NOT NULL THEN
      UPDATE lead_assignment_queue
      SET 
        status = 'assigned',
        assigned_at = now(),
        assigned_to = _result.assigned_to,
        assignment_method = _result.method,
        assignment_reason = _result.reason
      WHERE id = _queue_item.id;
      
      _processed := _processed + 1;
    ELSE
      UPDATE lead_assignment_queue
      SET 
        attempt_count = attempt_count + 1,
        last_attempt_at = now(),
        next_attempt_at = now() + interval '15 minutes'
      WHERE id = _queue_item.id;
    END IF;
  END LOOP;
  
  RETURN _processed;
END;
$$;