
# Plan: Workflow Groups with Group-Level Filters

## Overview
Add the ability to organize workflow rules into groups, where each group can have its own filter conditions that apply to all rules within. For example, a "California Matters" group would automatically apply a state filter to all workflows inside it.

## How It Works

```text
+------------------------------------------+
|  Workflow Group: California Matters      |
|  Filter: state = 'CA'                    |
+------------------------------------------+
|  |- Rule 1: Response Deadline Reminder   |
|  |- Rule 2: Hearing Task Creator         |
|  |- Rule 3: Status Transition Gate       |
+------------------------------------------+

+------------------------------------------+
|  Workflow Group: Texas Matters           |
|  Filter: state = 'TX'                    |
+------------------------------------------+
|  |- Rule 4: Texas-specific Deadlines     |
+------------------------------------------+

+------------------------------------------+
|  Ungrouped Rules                         |
+------------------------------------------+
|  |- Rule 5: Global Payment Reminder      |
+------------------------------------------+
```

When a workflow rule in a group is evaluated, the group's filter conditions are checked first. If the entity doesn't match the group filter, the rule is skipped entirely.

---

## Implementation Steps

### 1. Database: Create workflow_groups Table
Create a new table to store workflow groups with their filter conditions:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | Company reference (RLS) |
| name | text | Group name (e.g., "California Matters") |
| description | text | Optional description |
| entity_type | workflow_entity_type | Which entity type this group applies to |
| filter_conditions | jsonb | The filter conditions (same format as rule conditions) |
| is_active | boolean | Enable/disable entire group |
| color | text | Optional color for visual organization |
| priority | integer | Group evaluation order |
| created_at, updated_at | timestamptz | Timestamps |
| created_by | uuid | Staff reference |

### 2. Database: Add group_id to workflow_rules
Add an optional foreign key column to link rules to groups:
- `group_id uuid REFERENCES workflow_groups(id) ON DELETE SET NULL`

### 3. TypeScript Types
Create new types in `src/types/workflow.ts`:
- `WorkflowGroup` interface
- `WorkflowGroupInsert` and `WorkflowGroupUpdate` types
- Update `WorkflowRule` to include optional `group_id` and `group` reference

### 4. React Query Hooks
Create `src/hooks/useWorkflowGroups.ts`:
- `useWorkflowGroups(entityType?)` - Fetch all groups
- `useWorkflowGroup(id)` - Fetch single group
- `useCreateWorkflowGroup()` - Create mutation
- `useUpdateWorkflowGroup()` - Update mutation  
- `useDeleteWorkflowGroup()` - Delete mutation
- `useToggleWorkflowGroup()` - Toggle active state

### 5. UI Components

**WorkflowsTab.tsx Updates:**
- Add "New Group" button alongside "New Workflow"
- Display rules organized by group using collapsible sections
- Show group filter summary in the group header
- Allow dragging rules between groups (future enhancement)
- Show ungrouped rules in a separate "Ungrouped" section

**New WorkflowGroupFormDialog.tsx:**
- Form to create/edit groups
- Group name and description inputs
- Entity type selector (locked after creation if rules exist)
- Filter condition builder (reuses existing ConditionBuilder component)
- Color picker for visual organization
- Active toggle

**WorkflowFormDialog.tsx Updates:**
- Add group selector dropdown in the "Settings" tab
- Only show groups matching the selected entity type
- "No group" option for ungrouped rules

### 6. Workflow Execution Logic
Update `useExecuteWorkflow.ts` and related hooks:
- When fetching applicable rules, join with workflow_groups
- Before evaluating a rule, check if its group's filter conditions pass
- Skip the rule entirely if group filter fails
- Include group info in execution logs for debugging

---

## Technical Details

### Group Filter Conditions Format
The group's `filter_conditions` will use the same `ConditionGroup[]` structure as individual rules, enabling reuse of the existing ConditionBuilder component:

```json
[
  {
    "group_id": "g1",
    "operator": "AND",
    "rules": [
      { "field": "state", "operator": "equals", "value": "CA" }
    ]
  }
]
```

### UI Layout Example
The WorkflowsTab will display:
```text
[+ New Group]  [+ New Workflow]

[v] California Matters (4 rules)         [toggle] [edit] [delete]
    Filter: state = 'CA'
    |- Response Deadline Reminder        [toggle] [edit] [delete]
    |- Hearing Task Creator              [toggle] [edit] [delete]
    |- Status Transition Gate            [toggle] [edit] [delete]
    |- Settlement Notification           [toggle] [edit] [delete]

[v] Texas Matters (2 rules)              [toggle] [edit] [delete]
    Filter: state = 'TX'
    ...

[v] Ungrouped (3 rules)
    |- Global Payment Reminder           [toggle] [edit] [delete]
    ...
```

### Files to Create
- `src/hooks/useWorkflowGroups.ts`
- `src/components/workflows/WorkflowGroupFormDialog.tsx`

### Files to Modify
- `src/types/workflow.ts` - Add group types
- `src/hooks/useWorkflowRules.ts` - Include group data in queries
- `src/components/settings/WorkflowsTab.tsx` - Grouped display with collapsibles
- `src/components/workflows/WorkflowFormDialog.tsx` - Group selector
- `src/components/workflows/ConditionBuilder.tsx` - Add `state` field for litigation_matters
- `src/hooks/useExecuteWorkflow.ts` - Group filter evaluation
