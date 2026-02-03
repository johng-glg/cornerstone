

# Plan: Role-Based Workflow Assignment & Single-User Constraint

## Overview
Enhance workflow rules to assign tasks and notifications to specific role-based assignees on a record (e.g., "the attorney assigned to this matter"), and add a database constraint to ensure only one user can hold each key role per entity.

---

## How It Works

When creating a task action in a workflow rule, users will see new assignment options:

```text
Assign To:
+----------------------------------+
| Entity Owner (first assignee)   |
| Workflow Creator                |
|----------------------------------|
| Assigned Attorney       ← NEW   |
| Assigned Case Manager   ← NEW   |
| Assigned Negotiator     ← NEW   |
| Assigned Sales Rep      ← NEW   |
| Assigned CS Rep         ← NEW   |
+----------------------------------+
```

Example: A workflow rule for litigation matters can say "When status changes to pre_response, create a task and assign it to the Assigned Attorney."

---

## Implementation Steps

### 1. Database: Add Unique Constraint for Single-Role Assignments

Add a partial unique index to ensure only one active assignment per role per entity for the key roles. This prevents having two attorneys assigned to the same matter:

```sql
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
```

This ensures:
- Each litigation matter can have only one active litigation_attorney
- Each litigation matter can have only one active case_manager
- Each litigation matter can have only one active negotiator
- Same for other entity types using these assignment roles

### 2. Update Workflow Types

Expand the `CreateTaskActionConfig` and `SendNotificationActionConfig` types to include the new role-based assignment options:

```typescript
export interface CreateTaskActionConfig {
  // ... existing fields
  assign_to?: 
    | 'entity_owner' 
    | 'creator'
    | 'assigned_attorney'      // NEW
    | 'assigned_case_manager'  // NEW
    | 'assigned_negotiator'    // NEW
    | 'assigned_sales_rep'     // NEW
    | 'assigned_cs_rep'        // NEW
    | string;  // specific staff UUID
}
```

### 3. Update ActionConfig UI

Add new options to the "Assign To" dropdown in the workflow action configuration:

| Value | Display Label |
|-------|---------------|
| entity_owner | Entity Owner |
| creator | Workflow Creator |
| assigned_attorney | Assigned Attorney |
| assigned_case_manager | Assigned Case Manager |
| assigned_negotiator | Assigned Negotiator |
| assigned_sales_rep | Assigned Sales Rep |
| assigned_cs_rep | Assigned CS Rep |

The dropdown will show role-based options conditionally based on entity type:
- **Litigation Matters**: Attorney, Case Manager, Negotiator
- **Leads**: Sales Rep
- **Client Services**: CS Rep, Case Manager, Negotiator

### 4. Update Workflow Execution Logic

Enhance the `resolveAssignee` function in `useExecuteWorkflow.ts` to look up the specific role-based assignee:

```typescript
async function resolveAssignee(
  assignTo: string | undefined,
  entityType: WorkflowEntityType,
  entityId: string
): Promise<string | null> {
  // Map workflow assign_to values to database assignment_type enum
  const roleToAssignmentType: Record<string, string> = {
    'assigned_attorney': 'litigation_attorney',
    'assigned_case_manager': 'case_manager',
    'assigned_negotiator': 'negotiator',
    'assigned_sales_rep': 'sales_rep',
    'assigned_cs_rep': 'client_services_rep',
  };
  
  // Check if this is a role-based assignment
  if (assignTo && roleToAssignmentType[assignTo]) {
    const assignmentType = roleToAssignmentType[assignTo];
    const taskEntityType = mapToTaskEntityType(entityType);
    
    const { data } = await supabase
      .from('assignments')
      .select('staff_id')
      .eq('entity_type', taskEntityType)
      .eq('entity_id', entityId)
      .eq('assignment_type', assignmentType)
      .eq('is_active', true)
      .maybeSingle();
    
    return data?.staff_id || null;
  }
  
  // ... existing entity_owner and creator logic
}
```

### 5. Update MatterAssignmentDialog Behavior

When a user tries to assign someone to a role that already has an assignee, the dialog should either:
- **Option A**: Show an error message explaining the role is already filled
- **Option B**: Automatically unassign the previous person and assign the new one (with confirmation)

For simplicity, we'll implement Option A with a clear error message from the database constraint, and the UI will gracefully handle the error.

---

## Technical Details

### Entity-Specific Role Options

Different entity types support different role assignments:

| Entity Type | Available Roles |
|-------------|-----------------|
| litigation_matters | Attorney, Case Manager, Negotiator |
| leads | Sales Rep |
| client_services | CS Rep, Case Manager, Negotiator |
| liabilities | Case Manager, Negotiator |
| tasks | (inherits from parent entity) |

### Role-to-Assignment Type Mapping

```typescript
const ROLE_ASSIGNMENT_OPTIONS: Record<WorkflowEntityType, { value: string; label: string }[]> = {
  litigation_matters: [
    { value: 'assigned_attorney', label: 'Assigned Attorney' },
    { value: 'assigned_case_manager', label: 'Assigned Case Manager' },
    { value: 'assigned_negotiator', label: 'Assigned Negotiator' },
  ],
  leads: [
    { value: 'assigned_sales_rep', label: 'Assigned Sales Rep' },
  ],
  client_services: [
    { value: 'assigned_cs_rep', label: 'Assigned CS Rep' },
    { value: 'assigned_case_manager', label: 'Assigned Case Manager' },
    { value: 'assigned_negotiator', label: 'Assigned Negotiator' },
  ],
  liabilities: [
    { value: 'assigned_case_manager', label: 'Assigned Case Manager' },
    { value: 'assigned_negotiator', label: 'Assigned Negotiator' },
  ],
  tasks: [],
  settlements: [
    { value: 'assigned_negotiator', label: 'Assigned Negotiator' },
  ],
};
```

### Database Constraint Behavior

The partial unique index ensures:
1. Only ONE active `litigation_attorney` per litigation matter
2. Only ONE active `case_manager` per entity
3. Only ONE active `negotiator` per entity
4. Inactive assignments (is_active = false) are excluded from the constraint

When someone tries to assign a second attorney:
- Database returns a constraint violation error
- UI displays: "This role is already assigned to [Name]. Please unassign them first."

---

## Files to Create
None

## Files to Modify
- `src/types/workflow.ts` - Add role-based assignment type constants
- `src/components/workflows/ActionConfig.tsx` - Add role options to Assign To dropdown
- `src/hooks/useExecuteWorkflow.ts` - Update resolveAssignee function
- `src/hooks/useMatterAssignments.ts` - Improve error handling for constraint violations

## Database Changes
- Add partial unique index on `assignments` table for single-role enforcement

