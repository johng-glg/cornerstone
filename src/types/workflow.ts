import type { Enums, Json } from '@/integrations/supabase/types';

// Enum types from database
export type WorkflowTriggerType = 'status_changed' | 'field_updated' | 'record_created' | 'time_based' | 'manual';
export type WorkflowEntityType = 'leads' | 'client_services' | 'liabilities' | 'litigation_matters' | 'tasks' | 'settlements';
export type WorkflowActionType = 'create_task' | 'send_notification' | 'update_field' | 'block_transition' | 'trigger_webhook';
export type WorkflowExecutionStatus = 'success' | 'blocked' | 'failed' | 'skipped';

// Trigger configuration types
export interface StatusChangedTriggerConfig {
  from?: string[];
  to?: string[];
}

export interface FieldUpdatedTriggerConfig {
  field: string;
}

export interface TimeBasedTriggerConfig {
  schedule?: string;
  relative_to?: string;
  days?: number;
}

export type TriggerConfig = StatusChangedTriggerConfig | FieldUpdatedTriggerConfig | TimeBasedTriggerConfig | Record<string, unknown>;

// Condition types
export interface ConditionRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'all_match' | 'none_match' | 'count_greater';
  value: string | number | string[];
  related_entity?: string;
}

export interface ConditionGroup {
  group_id: string;
  operator: 'AND' | 'OR';
  rules: ConditionRule[];
}

// Action configuration types
export interface CreateTaskActionConfig {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  due_days?: number;
  assign_to?: 'entity_owner' | 'specific' | string;
}

export interface SendNotificationActionConfig {
  to: 'entity_owner' | 'specific' | string;
  title: string;
  message: string;
}

export interface UpdateFieldActionConfig {
  field: string;
  value: string | number | boolean;
}

export interface BlockTransitionActionConfig {
  message: string;
}

export interface TriggerWebhookActionConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
}

export interface WorkflowAction {
  type: WorkflowActionType;
  config: CreateTaskActionConfig | SendNotificationActionConfig | UpdateFieldActionConfig | BlockTransitionActionConfig | TriggerWebhookActionConfig;
}

// Workflow rule type
export interface WorkflowRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  entity_type: WorkflowEntityType;
  trigger_type: WorkflowTriggerType;
  trigger_config: TriggerConfig;
  conditions: ConditionGroup[];
  actions: WorkflowAction[];
  is_active: boolean;
  is_blocking: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type WorkflowRuleInsert = Omit<WorkflowRule, 'id' | 'created_at' | 'updated_at'>;
export type WorkflowRuleUpdate = Partial<WorkflowRuleInsert> & { id: string };

// Workflow execution log type
export interface WorkflowExecution {
  id: string;
  rule_id: string;
  entity_type: WorkflowEntityType;
  entity_id: string;
  status: WorkflowExecutionStatus;
  trigger_data: Record<string, unknown> | null;
  condition_results: ConditionGroup[] | null;
  actions_executed: WorkflowAction[] | null;
  error_message: string | null;
  block_message: string | null;
  executed_at: string;
  duration_ms: number | null;
  // Joined data
  rule?: WorkflowRule | null;
}

// Transition validation result
export interface TransitionValidationResult {
  allowed: boolean;
  block_message: string | null;
  rule_name: string | null;
}

// Entity-specific status options
export const entityStatusOptions: Record<WorkflowEntityType, string[]> = {
  leads: ['new', 'contacted', 'qualified', 'converted', 'lost'],
  client_services: ['prospect', 'pending', 'active', 'hold', 'cancelled', 'graduated'],
  liabilities: ['enrolled', 'in_negotiation', 'in_litigation', 'settled', 'dismissed', 'removed'],
  litigation_matters: ['new', 'pre_response', 'post_response', 'settled', 'dropped', 'judgment', 'declined', 'dismissed'],
  tasks: ['pending', 'in_progress', 'completed', 'cancelled'],
  settlements: ['pending', 'offered', 'accepted', 'rejected', 'completed'],
};

// Entity labels for UI
export const entityTypeLabels: Record<WorkflowEntityType, string> = {
  leads: 'Leads',
  client_services: 'Client Services',
  liabilities: 'Liabilities',
  litigation_matters: 'Litigation Matters',
  tasks: 'Tasks',
  settlements: 'Settlements',
};

// Trigger type labels for UI
export const triggerTypeLabels: Record<WorkflowTriggerType, string> = {
  status_changed: 'Status Changed',
  field_updated: 'Field Updated',
  record_created: 'Record Created',
  time_based: 'Time Based',
  manual: 'Manual',
};

// Action type labels for UI
export const actionTypeLabels: Record<WorkflowActionType, string> = {
  create_task: 'Create Task',
  send_notification: 'Send Notification',
  update_field: 'Update Field',
  block_transition: 'Block Transition',
  trigger_webhook: 'Trigger Webhook',
};

// Condition operators
export const conditionOperators = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does Not Equal' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'contains', label: 'Contains' },
  { value: 'in', label: 'Is One Of' },
] as const;

export const relatedConditionOperators = [
  { value: 'all_match', label: 'All Match' },
  { value: 'none_match', label: 'None Match' },
  { value: 'count_greater', label: 'Count Greater Than' },
] as const;
