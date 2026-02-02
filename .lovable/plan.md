
# Lead Assignment Engine Implementation Plan

## Overview

This feature implements an automated lead assignment system that distributes incoming leads to sales representatives based on configurable rules. The engine supports multiple assignment methods (round robin, weighted, backlog-based, skillset-based) and includes queue management, availability settings, and assignment audit logging.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Multiple Assignment Methods** | Round robin, weighted distribution, backlog-based, and skillset matching |
| **Assignment Rules** | Company-configurable rules for different lead sources/types |
| **Rep Availability** | Online/offline status with capacity limits per rep |
| **Assignment Queue** | Queue for leads awaiting assignment during off-hours |
| **Audit Trail** | Log of all assignment decisions with reasoning |
| **Manual Override** | Admin ability to reassign with reason tracking |
| **Real-time Updates** | Instant notification when leads are assigned |

---

## Assignment Methods

### 1. Round Robin
Assigns leads sequentially to available reps, cycling through the pool.

### 2. Weighted Distribution
Assigns based on configured weight per rep (e.g., senior reps get 40%, juniors get 20%).

### 3. Backlog-Based (Load Balancing)
Assigns to the rep with the fewest active leads, balancing workload.

### 4. Skillset Matching
Matches lead characteristics (interest_type, estimated_debt_amount, has_active_lawsuit) to rep skills.

---

## Database Schema

### Table 1: `lead_assignment_rules`

Stores company-specific assignment configuration.

```sql
CREATE TYPE assignment_method AS ENUM (
  'round_robin',
  'weighted',
  'backlog_based',
  'skillset_match'
);

CREATE TABLE lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  method assignment_method NOT NULL DEFAULT 'round_robin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Filters: which leads this rule applies to
  source lead_source,                    -- NULL = all sources
  interest_type lead_interest,           -- NULL = all types
  min_debt_amount NUMERIC,               -- NULL = no minimum
  max_debt_amount NUMERIC,               -- NULL = no maximum
  
  -- Configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  /*
    Config structure:
    {
      "pool_staff_ids": ["uuid1", "uuid2"],     -- Staff IDs in this pool
      "weights": { "uuid1": 40, "uuid2": 30 },  -- For weighted method
      "max_active_leads": 25,                   -- Per-rep cap (backlog)
      "fallback_method": "round_robin",         -- If primary fails
      "auto_assign": true,                      -- Auto-assign on create
      "work_hours_only": false,                 -- Only assign during work hours
      "work_hours": { "start": "09:00", "end": "17:00", "timezone": "America/New_York" }
    }
  */
  
  priority INTEGER NOT NULL DEFAULT 0,   -- Higher = checked first
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for rule matching
CREATE INDEX idx_assignment_rules_lookup 
  ON lead_assignment_rules(company_id, is_active, priority DESC);

-- RLS
ALTER TABLE lead_assignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company rules"
  ON lead_assignment_rules FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage rules"
  ON lead_assignment_rules FOR ALL
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );
```

### Table 2: `lead_assignment_pool`

Tracks which staff members are in which assignment pools with their settings.

```sql
CREATE TABLE lead_assignment_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES lead_assignment_rules(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  
  -- Rep settings
  weight INTEGER NOT NULL DEFAULT 10,          -- For weighted distribution
  max_active_leads INTEGER DEFAULT 25,         -- Override global cap
  is_available BOOLEAN NOT NULL DEFAULT true,  -- Can receive assignments
  
  -- Skills (for skillset matching)
  skills JSONB DEFAULT '[]'::jsonb,
  /*
    Skills structure:
    [
      { "type": "interest_type", "value": "litigation", "proficiency": 5 },
      { "type": "debt_range", "min": 50000, "max": null, "proficiency": 4 },
      { "type": "has_lawsuit", "value": true, "proficiency": 5 }
    ]
  */
  
  -- Round robin tracking
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

-- RLS
ALTER TABLE lead_assignment_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view pools"
  ON lead_assignment_pool FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lead_assignment_rules r 
    WHERE r.id = rule_id 
    AND r.company_id = get_user_company_id(auth.uid())
  ));

CREATE POLICY "Admins can manage pools"
  ON lead_assignment_pool FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lead_assignment_rules r 
    WHERE r.id = rule_id 
    AND r.company_id = get_user_company_id(auth.uid())
    AND has_role(auth.uid(), 'admin')
  ));
```

### Table 3: `lead_assignment_queue`

Queue for leads awaiting assignment.

```sql
CREATE TYPE queue_status AS ENUM ('pending', 'assigned', 'expired', 'manual');

CREATE TABLE lead_assignment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES lead_assignment_rules(id) ON DELETE SET NULL,
  
  status queue_status NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 0,       -- Higher = assign first
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES staff(id),
  
  -- Assignment result
  assignment_method assignment_method,
  assignment_reason TEXT,                    -- Why this rep was chosen
  
  -- Retry tracking
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for queue processing
CREATE INDEX idx_queue_pending 
  ON lead_assignment_queue(status, priority DESC, queued_at ASC) 
  WHERE status = 'pending';

-- RLS
ALTER TABLE lead_assignment_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view queue"
  ON lead_assignment_queue FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = lead_id 
    AND l.company_id = get_user_company_id(auth.uid())
  ));
```

### Table 4: `lead_assignment_log`

Audit trail for all assignment actions.

```sql
CREATE TYPE assignment_action AS ENUM (
  'auto_assigned',
  'manual_assigned',
  'reassigned',
  'unassigned',
  'queue_added',
  'queue_expired'
);

CREATE TABLE lead_assignment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  action assignment_action NOT NULL,
  
  from_staff_id UUID REFERENCES staff(id),
  to_staff_id UUID REFERENCES staff(id),
  performed_by UUID REFERENCES staff(id),  -- Who took the action
  
  rule_id UUID REFERENCES lead_assignment_rules(id),
  method assignment_method,
  reason TEXT,                              -- Explanation of decision
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lead history
CREATE INDEX idx_assignment_log_lead 
  ON lead_assignment_log(lead_id, created_at DESC);

-- RLS
ALTER TABLE lead_assignment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view logs"
  ON lead_assignment_log FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM leads l 
    WHERE l.id = lead_id 
    AND l.company_id = get_user_company_id(auth.uid())
  ));
```

---

## Assignment Engine Function

Core database function for lead assignment:

```sql
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
  _active_count INTEGER;
  _min_count INTEGER;
  _total_weight INTEGER;
  _rand_weight INTEGER;
  _cumulative INTEGER;
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
      -- Get next available rep (oldest last_assigned_at)
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
      -- Calculate total weight and pick randomly
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
      -- Get rep with fewest active leads
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
      
      _reason := format('Lowest backlog (%s active leads)', _min_count);
      
    WHEN 'skillset_match' THEN
      -- Score reps based on skill match
      SELECT p.staff_id INTO _staff_id
      FROM lead_assignment_pool p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.rule_id = _rule.id AND p.is_available = true AND s.is_active = true
      ORDER BY (
        -- Score based on matching skills
        CASE WHEN p.skills @> jsonb_build_array(jsonb_build_object('type', 'interest_type', 'value', _lead.interest_type::text)) THEN 10 ELSE 0 END
        + CASE WHEN _lead.has_active_lawsuit AND p.skills @> jsonb_build_array(jsonb_build_object('type', 'has_lawsuit', 'value', true)) THEN 15 ELSE 0 END
        + CASE WHEN _lead.estimated_debt_amount >= 50000 AND p.skills @> jsonb_build_array(jsonb_build_object('type', 'high_value')) THEN 10 ELSE 0 END
      ) DESC,
      p.assignment_count ASC  -- Tiebreaker
      LIMIT 1;
      
      _reason := 'Best skillset match';
      
  END CASE;
  
  -- Update lead and pool if assignment successful
  IF _staff_id IS NOT NULL THEN
    UPDATE leads SET assigned_to = _staff_id WHERE id = _lead_id;
    
    UPDATE lead_assignment_pool
    SET 
      last_assigned_at = now(),
      assignment_count = assignment_count + 1
    WHERE rule_id = _rule.id AND staff_id = _staff_id;
    
    INSERT INTO lead_assignment_log (lead_id, action, from_staff_id, to_staff_id, rule_id, method, reason)
    VALUES (_lead_id, 'auto_assigned', _lead.assigned_to, _staff_id, _rule.id, _method, _reason);
  ELSE
    _reason := 'No available staff in pool';
    
    -- Add to queue
    INSERT INTO lead_assignment_queue (lead_id, rule_id, priority)
    VALUES (_lead_id, _rule.id, COALESCE(_lead.lead_score, 0));
  END IF;
  
  RETURN QUERY SELECT _staff_id, _method, _reason;
END;
$$;
```

---

## Trigger: Auto-Assign on Lead Creation

```sql
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
  -- Only auto-assign if no assignment and rule allows it
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
      NEW.assigned_to := _result.assigned_to;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_lead
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_lead();
```

---

## Files to Create

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useAssignmentRules.ts` | CRUD hooks for assignment rules |
| `src/hooks/useAssignmentPool.ts` | Manage pool membership and availability |
| `src/hooks/useAssignmentQueue.ts` | View and manage assignment queue |
| `src/hooks/useAssignLead.ts` | Manual assignment and reassignment |

### Components

| File | Purpose |
|------|---------|
| `src/components/settings/AssignmentRulesTab.tsx` | Rule management in Settings |
| `src/components/settings/AssignmentRuleFormDialog.tsx` | Create/edit rules |
| `src/components/settings/AssignmentPoolEditor.tsx` | Manage pool membership |
| `src/components/leads/AssignmentLogSheet.tsx` | View assignment history |
| `src/components/leads/ReassignLeadDialog.tsx` | Reassign with reason |
| `src/components/dashboards/AssignmentQueueWidget.tsx` | Queue status widget |

### Types

| File | Purpose |
|------|---------|
| `src/types/assignment.ts` | TypeScript interfaces |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add "Assignment" tab |
| `src/components/leads/LeadDetailSheet.tsx` | Add assignment log and reassign button |
| `src/components/leads/LeadFormDialog.tsx` | Option to auto-assign or manually select |
| `src/hooks/useCreateLead.ts` | Trigger assignment after creation |
| `src/components/dashboards/SalesRepDashboard.tsx` | Add "My Availability" toggle |
| `src/components/dashboards/AdminDashboard.tsx` | Add queue status widget |
| `src/lib/docs/schemaData.ts` | Document new tables |
| `src/lib/docs/featureGuides.ts` | Add assignment guide |
| `src/lib/docs/roadmapData.ts` | Mark as Completed |

---

## UI Design

### Assignment Rules Tab (Settings)

```text
+---------------------------------------------------+
| Lead Assignment Rules                    [+ New Rule]
+---------------------------------------------------+
| ✓ Default Round Robin          [Default] [Active]  |
|   All leads | Round Robin | 5 reps          [Edit] |
+---------------------------------------------------+
| ✓ High-Value Leads                       [Active]  |
|   Debt $50k+ | Weighted | 3 reps           [Edit] |
+---------------------------------------------------+
| ✓ Litigation Specialists                 [Active]  |
|   Litigation | Skillset | 2 reps           [Edit] |
+---------------------------------------------------+
```

### Pool Editor (in Rule Form)

```text
+-------------------------------------------+
| Assignment Pool                           |
+-------------------------------------------+
| Staff Member        | Weight | Cap | Avail |
+-------------------------------------------+
| ☐ John Smith        |  [40]  | [25] | ✓   |
| ☐ Jane Doe          |  [30]  | [20] | ✓   |
| ☐ Mike Johnson      |  [30]  | [25] | ○   |
+-------------------------------------------+
```

### Lead Detail - Assignment History

```text
+-------------------------------------------+
| Assignment History                        |
+-------------------------------------------+
| 📋 Auto-assigned to John Smith            |
|    Feb 2, 2026 at 2:30 PM                 |
|    Method: Round Robin                    |
|    Reason: Next in rotation               |
+-------------------------------------------+
| 🔄 Reassigned from Jane to John           |
|    Feb 2, 2026 at 10:15 AM                |
|    By: Admin User                         |
|    Reason: Jane on PTO                    |
+-------------------------------------------+
```

### Rep Availability Toggle (Dashboard)

```text
+--------------------------------+
| My Availability                |
| ○ Available for new leads      |
|                                |
| Active Leads: 18/25            |
| [████████████░░░░░░] 72%       |
+--------------------------------+
```

---

## Implementation Details

### 1. Assignment Rules Hook

**`src/hooks/useAssignmentRules.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssignmentRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  method: 'round_robin' | 'weighted' | 'backlog_based' | 'skillset_match';
  is_active: boolean;
  is_default: boolean;
  source: string | null;
  interest_type: string | null;
  min_debt_amount: number | null;
  max_debt_amount: number | null;
  config: {
    pool_staff_ids?: string[];
    weights?: Record<string, number>;
    max_active_leads?: number;
    auto_assign?: boolean;
    work_hours_only?: boolean;
  };
  priority: number;
  created_at: string;
}

export function useAssignmentRules() {
  return useQuery({
    queryKey: ['assignment_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as AssignmentRule[];
    },
  });
}

export function useCreateAssignmentRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: Omit<AssignmentRule, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .insert([rule])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment_rules'] });
    },
  });
}
```

### 2. Assign Lead Hook

**`src/hooks/useAssignLead.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAssignLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      staffId,
      reason 
    }: { 
      leadId: string; 
      staffId: string;
      reason?: string;
    }) => {
      // Call the assign_lead function
      const { data, error } = await supabase.rpc('assign_lead', {
        _lead_id: leadId,
        _force_staff_id: staffId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['assignment_log', variables.leadId] });
      toast({ title: 'Lead assigned successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to assign lead',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
```

### 3. Rep Availability Component

```typescript
function AvailabilityToggle() {
  const { staff } = useAuth();
  const { data: poolMembership } = usePoolMembership(staff?.id);
  const toggleAvailability = useToggleAvailability();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Availability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Label>Available for new leads</Label>
          <Switch
            checked={poolMembership?.is_available}
            onCheckedChange={(checked) => 
              toggleAvailability.mutate({ available: checked })
            }
          />
        </div>
        <Progress value={myLeadCount / maxLeads * 100} className="mt-4" />
        <p className="text-xs text-muted-foreground mt-1">
          {myLeadCount}/{maxLeads} active leads
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## Notification Integration

When a lead is auto-assigned, create a notification using the existing system:

```sql
-- Add to assign_lead function after successful assignment
IF _staff_id IS NOT NULL THEN
  -- Get user_id from staff
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
END IF;
```

---

## Queue Processing

For leads that couldn't be assigned immediately, process the queue periodically:

```sql
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
```

---

## Files Summary

### Create (10 files)

| File | Purpose |
|------|---------|
| `src/types/assignment.ts` | TypeScript interfaces |
| `src/hooks/useAssignmentRules.ts` | Rule CRUD hooks |
| `src/hooks/useAssignmentPool.ts` | Pool management hooks |
| `src/hooks/useAssignmentQueue.ts` | Queue hooks |
| `src/hooks/useAssignLead.ts` | Assignment mutation hook |
| `src/components/settings/AssignmentRulesTab.tsx` | Rules management UI |
| `src/components/settings/AssignmentRuleFormDialog.tsx` | Rule form |
| `src/components/leads/AssignmentLogSheet.tsx` | Assignment history |
| `src/components/leads/ReassignLeadDialog.tsx` | Reassignment dialog |
| `src/components/dashboards/AssignmentQueueWidget.tsx` | Queue widget |

### Modify (8 files)

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add Assignment tab |
| `src/components/leads/LeadDetailSheet.tsx` | Add history and reassign |
| `src/components/leads/LeadFormDialog.tsx` | Assignment option |
| `src/components/dashboards/SalesRepDashboard.tsx` | Availability toggle |
| `src/components/dashboards/AdminDashboard.tsx` | Queue widget |
| `src/lib/docs/schemaData.ts` | Document tables |
| `src/lib/docs/featureGuides.ts` | Add guide |
| `src/lib/docs/roadmapData.ts` | Mark Completed |

### Database Migration (1)

- Create `assignment_method` enum
- Create `lead_assignment_rules` table
- Create `lead_assignment_pool` table  
- Create `queue_status` and `assignment_action` enums
- Create `lead_assignment_queue` table
- Create `lead_assignment_log` table
- Create `assign_lead()` function
- Create `trigger_auto_assign_lead()` trigger
- Create `process_assignment_queue()` function

---

## Testing Scenarios

1. **Round Robin**: Create 3 leads, verify they go to reps 1, 2, 3 in order
2. **Weighted**: Create 100 leads, verify distribution matches weights (~40/30/30)
3. **Backlog**: Assign leads, verify new leads go to rep with fewest
4. **Skillset**: Create litigation lead, verify it goes to litigation specialist
5. **Availability**: Toggle rep offline, verify they receive no assignments
6. **Queue**: Make all reps unavailable, verify lead goes to queue
7. **Manual Override**: Reassign lead, verify log entry created

---

## Future Enhancements

1. **Cron Job**: Edge Function to process queue every 5 minutes
2. **Work Hours**: Only assign during configured business hours
3. **Vacation Mode**: Bulk disable availability for date range
4. **Team Assignments**: Assign to team, any member can claim
5. **Performance Weighting**: Auto-adjust weights based on conversion rates
6. **Geo-Based**: Match leads to reps in same state/region
