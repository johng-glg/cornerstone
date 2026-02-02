
# Workflow Automation Builder Implementation Plan

## Overview

This feature implements a visual workflow automation system that allows admins to define triggers, conditions, and actions for automating business processes. A key capability is **status transition restrictions** - preventing status changes unless specific conditions are met (e.g., can't mark a service as "graduated" unless all liabilities are settled).

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Workflow Rules** | Configurable rules with triggers, conditions, and actions |
| **Transition Gates** | Block status changes unless conditions are satisfied |
| **Multiple Entity Support** | Works with leads, services, liabilities, litigation, tasks |
| **Automated Actions** | Auto-create tasks, send notifications, update fields |
| **Condition Builder** | Visual interface for building conditional logic |
| **Execution Logging** | Audit trail of all workflow executions |
| **Priority Ordering** | Control execution order when multiple rules match |

---

## Workflow Components

### 1. Triggers (When)
Events that initiate workflow evaluation:

| Trigger Type | Description | Example |
|--------------|-------------|---------|
| `status_changed` | Entity status changes | Lead moves to "contacted" |
| `field_updated` | Specific field modified | Escrow balance updated |
| `record_created` | New record inserted | New liability created |
| `time_based` | Scheduled/deadline | 7 days after creation |
| `manual` | User-initiated | Button click |

### 2. Conditions (If)
Criteria that must be met for actions to execute:

| Condition Type | Description | Example |
|----------------|-------------|---------|
| `field_equals` | Field has specific value | `status = 'active'` |
| `field_greater` | Numeric comparison | `escrow_balance > 5000` |
| `field_contains` | Text contains string | `notes contains 'urgent'` |
| `related_count` | Count of related records | `liabilities.count >= 3` |
| `related_all` | All related match condition | `liabilities.all(status = 'settled')` |
| `date_diff` | Days between dates | `created_at > 30 days ago` |

### 3. Actions (Then)
What happens when conditions are met:

| Action Type | Description | Example |
|-------------|-------------|---------|
| `create_task` | Generate a new task | Create follow-up task |
| `send_notification` | Notify users | Alert assigned rep |
| `update_field` | Modify entity field | Set `priority = 'high'` |
| `block_transition` | Prevent status change | Block if conditions fail |
| `trigger_webhook` | External integration | Call API endpoint |

---

## Transition Gate Example

**Scenario**: Prevent graduating a service until all liabilities are settled

```text
Workflow: "Service Graduation Gate"
+-----------------------------------------+
| TRIGGER: status_changed                 |
| Entity: client_services                 |
| To Status: graduated                    |
+-----------------------------------------+
           |
           v
+-----------------------------------------+
| CONDITION: NOT                          |
|   related_all(                          |
|     liabilities.status IN               |
|     ['settled', 'dismissed']            |
|   )                                     |
+-----------------------------------------+
           |
           v
+-----------------------------------------+
| ACTION: block_transition                |
| Message: "Cannot graduate - X           |
|   liabilities remain unresolved"        |
+-----------------------------------------+
```

---

## Database Schema

### Table 1: `workflow_rules`

Stores workflow definitions:

```sql
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

CREATE TABLE workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger configuration
  entity_type workflow_entity_type NOT NULL,
  trigger_type workflow_trigger_type NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  /*
    trigger_config examples:
    status_changed: { "from": ["pending"], "to": ["active"] }
    field_updated: { "field": "escrow_balance" }
    time_based: { "schedule": "0 9 * * 1", "relative_to": "created_at", "days": 7 }
  */
  
  -- Conditions (array of condition groups - OR between groups, AND within)
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
    [
      {
        "group_id": "g1",
        "operator": "AND",
        "rules": [
          { "field": "status", "operator": "equals", "value": "active" },
          { "field": "escrow_balance", "operator": "greater_than", "value": 5000 }
        ]
      }
    ]
  */
  
  -- Actions to execute
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
    [
      {
        "type": "create_task",
        "config": {
          "title": "Follow up with {client_name}",
          "description": "Auto-generated from workflow",
          "priority": "high",
          "due_days": 3,
          "assign_to": "entity_owner"
        }
      },
      {
        "type": "send_notification",
        "config": {
          "to": "entity_owner",
          "title": "Status Changed",
          "message": "Service {service_number} is now active"
        }
      }
    ]
  */
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_blocking BOOLEAN NOT NULL DEFAULT false,  -- If true, can block status transitions
  priority INTEGER NOT NULL DEFAULT 0,         -- Higher = runs first
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES staff(id)
);

-- Index for rule lookup
CREATE INDEX idx_workflow_rules_lookup 
  ON workflow_rules(company_id, entity_type, trigger_type, is_active)
  WHERE is_active = true;

-- RLS
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company rules"
  ON workflow_rules FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage rules"
  ON workflow_rules FOR ALL
  TO authenticated
  USING (
    company_id = get_user_company_id(auth.uid()) 
    AND has_role(auth.uid(), 'admin')
  );
```

### Table 2: `workflow_executions`

Audit log of workflow runs:

```sql
CREATE TYPE workflow_execution_status AS ENUM (
  'success',
  'blocked',
  'failed',
  'skipped'
);

CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES workflow_rules(id) ON DELETE CASCADE,
  entity_type workflow_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  
  status workflow_execution_status NOT NULL,
  trigger_data JSONB,                  -- Data that triggered the workflow
  condition_results JSONB,             -- Which conditions passed/failed
  actions_executed JSONB,              -- Results of each action
  error_message TEXT,                  -- If failed, why
  block_message TEXT,                  -- If blocking, user-facing message
  
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER                  -- Execution time
);

-- Index for entity history
CREATE INDEX idx_workflow_executions_entity 
  ON workflow_executions(entity_type, entity_id, executed_at DESC);

-- RLS
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view executions"
  ON workflow_executions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workflow_rules r 
    WHERE r.id = rule_id 
    AND r.company_id = get_user_company_id(auth.uid())
  ));
```

---

## Core Workflow Engine Function

Database function to evaluate and execute workflows:

```sql
CREATE OR REPLACE FUNCTION evaluate_workflow(
  _entity_type workflow_entity_type,
  _entity_id UUID,
  _trigger_type workflow_trigger_type,
  _trigger_data JSONB,
  _company_id UUID
)
RETURNS TABLE(
  rule_id UUID,
  rule_name TEXT,
  status workflow_execution_status,
  block_message TEXT,
  actions_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rule workflow_rules;
  _conditions_met BOOLEAN;
  _actions_result JSONB := '[]'::jsonb;
  _execution_status workflow_execution_status;
  _block_msg TEXT;
  _start_time TIMESTAMPTZ;
  _duration INTEGER;
BEGIN
  FOR _rule IN
    SELECT * FROM workflow_rules
    WHERE company_id = _company_id
      AND entity_type = _entity_type
      AND trigger_type = _trigger_type
      AND is_active = true
    ORDER BY priority DESC
  LOOP
    _start_time := clock_timestamp();
    _conditions_met := true;
    _block_msg := null;
    _execution_status := 'success';
    
    -- Check if trigger matches
    IF NOT check_trigger_match(_rule.trigger_config, _trigger_data) THEN
      CONTINUE;
    END IF;
    
    -- Evaluate conditions
    _conditions_met := evaluate_conditions(
      _rule.conditions,
      _entity_type,
      _entity_id
    );
    
    IF NOT _conditions_met THEN
      _execution_status := 'skipped';
    ELSE
      -- Execute actions
      _actions_result := execute_workflow_actions(
        _rule.actions,
        _entity_type,
        _entity_id,
        _rule.is_blocking
      );
      
      -- Check if any action blocked
      IF _rule.is_blocking AND (_actions_result->0->>'blocked')::boolean THEN
        _execution_status := 'blocked';
        _block_msg := _actions_result->0->>'message';
      END IF;
    END IF;
    
    _duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - _start_time)::INTEGER;
    
    -- Log execution
    INSERT INTO workflow_executions (
      rule_id, entity_type, entity_id, status,
      trigger_data, condition_results, actions_executed,
      block_message, duration_ms
    ) VALUES (
      _rule.id, _entity_type, _entity_id, _execution_status,
      _trigger_data, _rule.conditions, _actions_result,
      _block_msg, _duration
    );
    
    -- Return result
    rule_id := _rule.id;
    rule_name := _rule.name;
    status := _execution_status;
    block_message := _block_msg;
    actions_result := _actions_result;
    RETURN NEXT;
    
    -- If blocked, stop processing further rules
    IF _execution_status = 'blocked' THEN
      RETURN;
    END IF;
  END LOOP;
END;
$$;
```

---

## Transition Validation Function

Function called before status changes to check for blocking rules:

```sql
CREATE OR REPLACE FUNCTION validate_status_transition(
  _entity_type workflow_entity_type,
  _entity_id UUID,
  _from_status TEXT,
  _to_status TEXT,
  _company_id UUID
)
RETURNS TABLE(
  allowed BOOLEAN,
  block_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result RECORD;
BEGIN
  -- Evaluate blocking workflows
  FOR _result IN
    SELECT * FROM evaluate_workflow(
      _entity_type,
      _entity_id,
      'status_changed',
      jsonb_build_object('from', _from_status, 'to', _to_status),
      _company_id
    )
    WHERE status = 'blocked'
  LOOP
    allowed := false;
    block_message := _result.block_message;
    RETURN NEXT;
    RETURN;
  END LOOP;
  
  -- No blocking rules triggered
  allowed := true;
  block_message := null;
  RETURN NEXT;
END;
$$;
```

---

## Files to Create

### Types

| File | Purpose |
|------|---------|
| `src/types/workflow.ts` | TypeScript interfaces for workflows |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useWorkflowRules.ts` | CRUD for workflow rules |
| `src/hooks/useWorkflowExecutions.ts` | View execution history |
| `src/hooks/useValidateTransition.ts` | Check if status change allowed |

### Components

| File | Purpose |
|------|---------|
| `src/components/settings/WorkflowsTab.tsx` | Workflow list in Settings |
| `src/components/workflows/WorkflowFormDialog.tsx` | Create/edit workflow |
| `src/components/workflows/TriggerConfig.tsx` | Trigger configuration UI |
| `src/components/workflows/ConditionBuilder.tsx` | Visual condition builder |
| `src/components/workflows/ActionConfig.tsx` | Action configuration UI |
| `src/components/workflows/WorkflowExecutionLog.tsx` | Execution history |
| `src/components/workflows/TransitionBlockedDialog.tsx` | Show why blocked |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add "Workflows" tab |
| `src/hooks/useClientServices.ts` | Call validation before status update |
| `src/hooks/useLitigationMatters.ts` | Call validation before status update |
| `src/hooks/useLeads.ts` | Call validation before status update |
| `src/components/services/StatusChangeModal.tsx` | Show block dialog if needed |
| `src/lib/docs/schemaData.ts` | Document new tables |
| `src/lib/docs/featureGuides.ts` | Add workflow guide |
| `src/lib/docs/roadmapData.ts` | Mark as Completed |

---

## UI Design

### Workflow List (Settings Tab)

```text
+---------------------------------------------------+
| Workflow Rules                        [+ New Workflow]
+---------------------------------------------------+
| ✓ Service Graduation Gate              [Blocking]  |
|   client_services | status_changed | Active [Edit] |
|   Requires all liabilities settled                 |
+---------------------------------------------------+
| ✓ New Lead Follow-up Task              [Active]    |
|   leads | record_created | Active           [Edit] |
|   Creates task 24h after lead creation             |
+---------------------------------------------------+
| ✓ Litigation Response Deadline         [Active]    |
|   litigation_matters | field_updated | Active      |
|   Notifies when deadline < 7 days             [Edit]|
+---------------------------------------------------+
```

### Workflow Form - Trigger Section

```text
+---------------------------------------------------+
| WHEN (Trigger)                                     |
+---------------------------------------------------+
| Entity: [▼ Client Services              ]         |
|                                                    |
| Trigger: [▼ Status Changed              ]         |
|                                                    |
| From Status: [ ] Any  [✓] Pending  [ ] Active     |
| To Status:   [ ] Any  [ ] Pending  [✓] Graduated  |
+---------------------------------------------------+
```

### Workflow Form - Conditions Section

```text
+---------------------------------------------------+
| IF (Conditions)                                    |
+---------------------------------------------------+
| When ALL of these are true:                        |
|                                                    |
| +-----------------------------------------------+ |
| | [▼ Related Records  ] [▼ Liabilities        ] | |
| | [▼ NOT All         ] have status             | |
| | [▼ In              ] [settled, dismissed    ] | |
| |                                   [× Remove] | |
| +-----------------------------------------------+ |
|                                                    |
| [+ Add Condition]  [+ Add Condition Group (OR)]   |
+---------------------------------------------------+
```

### Workflow Form - Actions Section

```text
+---------------------------------------------------+
| THEN (Actions)                                     |
+---------------------------------------------------+
| +-----------------------------------------------+ |
| | [▼ Block Transition                         ] | |
| |                                               | |
| | Message to display:                           | |
| | [Cannot graduate - {unresolved_count}        ] | |
| | [liabilities remain unresolved               ] | |
| |                                   [× Remove] | |
| +-----------------------------------------------+ |
|                                                    |
| [+ Add Action]                                     |
+---------------------------------------------------+
```

### Transition Blocked Dialog

```text
+---------------------------------------------------+
| ⚠️ Status Change Blocked                           |
+---------------------------------------------------+
|                                                    |
| This service cannot be changed to "Graduated"     |
| because:                                           |
|                                                    |
| "Cannot graduate - 3 liabilities remain           |
|  unresolved (must be settled or dismissed)"       |
|                                                    |
| Rule: Service Graduation Gate                      |
|                                                    |
| +-----------------------------------------------+ |
| | Unresolved Liabilities:                       | |
| | • Chase Credit Card - $5,432 (in_negotiation)| |
| | • Medical Debt - $1,200 (enrolled)           | |
| | • Personal Loan - $8,750 (in_litigation)     | |
| +-----------------------------------------------+ |
|                                                    |
|                                    [OK, Got It]   |
+---------------------------------------------------+
```

---

## Implementation Flow

### 1. Status Change with Validation

```typescript
// useUpdatePrimaryStatus hook modification
const validateTransition = useValidateTransition();

mutationFn: async ({ id, oldStatus, newStatus, reason }) => {
  // First, validate the transition
  const validation = await validateTransition.mutateAsync({
    entityType: 'client_services',
    entityId: id,
    fromStatus: oldStatus,
    toStatus: newStatus,
  });
  
  if (!validation.allowed) {
    throw new TransitionBlockedError(validation.block_message);
  }
  
  // Proceed with update
  const { data, error } = await supabase
    .from('client_services')
    .update({ status: newStatus })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### 2. Condition Evaluation Logic

```typescript
// Example condition evaluation
interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
  related_entity?: string;
  related_aggregate?: 'count' | 'all' | 'any' | 'none';
}

function evaluateCondition(condition: Condition, entity: any, relatedData: any[]): boolean {
  const fieldValue = entity[condition.field];
  
  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'greater_than':
      return fieldValue > condition.value;
    case 'in':
      return condition.value.includes(fieldValue);
    // ... other operators
  }
}
```

---

## Common Workflow Templates

Pre-built templates for quick setup:

| Template | Entity | Trigger | Description |
|----------|--------|---------|-------------|
| Service Graduation Gate | client_services | status → graduated | Block unless all liabilities resolved |
| Lead Follow-up Task | leads | record_created | Create task 24h after creation |
| Litigation Response Alert | litigation_matters | response_deadline updated | Notify when < 7 days |
| Settlement Approval | settlements | status → accepted | Require manager approval over $10k |
| NSF Retention Alert | client_services | payment_status → nsf | Notify retention team |
| Task Overdue Escalation | tasks | due_date passed | Escalate to manager |

---

## Files Summary

### Create (9 files)

| File | Purpose |
|------|---------|
| `src/types/workflow.ts` | TypeScript interfaces |
| `src/hooks/useWorkflowRules.ts` | Rule CRUD hooks |
| `src/hooks/useWorkflowExecutions.ts` | Execution log hooks |
| `src/hooks/useValidateTransition.ts` | Transition validation |
| `src/components/settings/WorkflowsTab.tsx` | Settings tab UI |
| `src/components/workflows/WorkflowFormDialog.tsx` | Rule form |
| `src/components/workflows/ConditionBuilder.tsx` | Condition builder |
| `src/components/workflows/ActionConfig.tsx` | Action configuration |
| `src/components/workflows/TransitionBlockedDialog.tsx` | Block message UI |

### Modify (9 files)

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add Workflows tab |
| `src/hooks/useClientServices.ts` | Add transition validation |
| `src/hooks/useLitigationMatters.ts` | Add transition validation |
| `src/hooks/useLeads.ts` | Add transition validation |
| `src/components/services/StatusChangeModal.tsx` | Handle block dialog |
| `src/lib/docs/schemaData.ts` | Document tables |
| `src/lib/docs/featureGuides.ts` | Add guide |
| `src/lib/docs/roadmapData.ts` | Mark Completed |

### Database Migration (1)

- Create workflow enums
- Create `workflow_rules` table with JSONB config
- Create `workflow_executions` table
- Create `evaluate_workflow()` function
- Create `validate_status_transition()` function
- Create helper functions for condition evaluation
- Set up RLS policies

---

## Future Enhancements

After initial implementation:

1. **Visual Flow Builder**: Drag-and-drop workflow designer
2. **Time-Based Triggers**: Cron-based scheduled workflows
3. **Webhook Actions**: External system integration
4. **Approval Workflows**: Multi-step approval chains
5. **Workflow Versioning**: Track changes to rules
6. **A/B Testing**: Compare workflow effectiveness
7. **Template Library**: Shareable workflow templates
