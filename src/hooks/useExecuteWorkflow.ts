import { supabase } from '@/integrations/supabase/client';
import type { 
  WorkflowRule, 
  WorkflowEntityType, 
  WorkflowTriggerType,
  WorkflowAction,
  StatusChangedTriggerConfig,
  CreateTaskActionConfig,
  SendNotificationActionConfig,
  ConditionGroup,
} from '@/types/workflow';
import type { Json, Enums } from '@/integrations/supabase/types';

interface ExecuteWorkflowParams {
  entityType: WorkflowEntityType;
  entityId: string;
  triggerType: WorkflowTriggerType;
  previousStatus?: string;
  newStatus?: string;
  entityData?: Record<string, unknown>;
  staffId?: string;
}

interface WorkflowExecutionResult {
  success: boolean;
  rulesExecuted: number;
  tasksCreated: number;
  errors: string[];
}

/**
 * Fetches matching workflow rules for the given entity and trigger
 */
async function fetchMatchingRules(
  entityType: WorkflowEntityType,
  triggerType: WorkflowTriggerType,
  previousStatus?: string,
  newStatus?: string
): Promise<WorkflowRule[]> {
  const { data, error } = await supabase
    .from('workflow_rules')
    .select('*')
    .eq('entity_type', entityType)
    .eq('trigger_type', triggerType as Enums<'workflow_trigger_type'>)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error || !data) {
    console.error('Error fetching workflow rules:', error);
    return [];
  }

  // Filter rules based on trigger config (from/to statuses)
  return data.filter(rule => {
    const config = rule.trigger_config as unknown as StatusChangedTriggerConfig;
    
    // Check 'from' status constraint
    if (config.from && config.from.length > 0) {
      if (!previousStatus || !config.from.includes(previousStatus)) {
        return false;
      }
    }
    
    // Check 'to' status constraint
    if (config.to && config.to.length > 0) {
      if (!newStatus || !config.to.includes(newStatus)) {
        return false;
      }
    }
    
    return true;
  }).map(rule => ({
    ...rule,
    trigger_config: rule.trigger_config as unknown as StatusChangedTriggerConfig,
    conditions: (rule.conditions as unknown as ConditionGroup[]) || [],
    actions: (rule.actions as unknown as WorkflowAction[]) || [],
  }));
}

/**
 * Calculates the due date for a task based on action config
 */
function calculateDueDate(
  actionConfig: CreateTaskActionConfig,
  entityData?: Record<string, unknown>
): string | null {
  const now = new Date();
  
  if (actionConfig.due_mode === 'field' && actionConfig.due_field && entityData) {
    const fieldValue = entityData[actionConfig.due_field];
    if (fieldValue && typeof fieldValue === 'string') {
      const fieldDate = new Date(fieldValue);
      if (!isNaN(fieldDate.getTime())) {
        // Apply offset if specified
        const offset = actionConfig.due_field_offset || 0;
        fieldDate.setDate(fieldDate.getDate() + offset);
        return fieldDate.toISOString();
      }
    }
    // Fallback to days from now if field is missing/invalid
  }
  
  // Default: use due_days from now
  const dueDays = actionConfig.due_days ?? 7;
  now.setDate(now.getDate() + dueDays);
  return now.toISOString();
}

/**
 * Determines who to assign the task to
 */
async function resolveAssignee(
  assignTo: string | undefined,
  entityType: WorkflowEntityType,
  entityId: string
): Promise<string | null> {
  if (!assignTo || assignTo === 'entity_owner') {
    // Try to find the owner based on entity type
    // For litigation_matters, look up assignments
    if (entityType === 'litigation_matters') {
      const { data } = await supabase
        .from('assignments')
        .select('staff_id')
        .eq('entity_type', 'litigation_matter')
        .eq('entity_id', entityId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (data?.staff_id) return data.staff_id;
    }
    
    return null; // Will be unassigned
  }
  
  // If it's a specific UUID, return it
  if (assignTo !== 'specific') {
    return assignTo;
  }
  
  return null;
}

/**
 * Maps workflow entity type to task entity type
 */
function mapToTaskEntityType(entityType: WorkflowEntityType): Enums<'entity_type'> | null {
  switch (entityType) {
    case 'litigation_matters':
      return 'litigation_matter';
    case 'client_services':
      return 'engagement';
    case 'leads':
      return 'lead';
    case 'liabilities':
      return 'liability';
    default:
      return null;
  }
}

/**
 * Gets the company_id for an entity
 */
async function getCompanyIdForEntity(
  entityType: WorkflowEntityType,
  entityId: string
): Promise<string | null> {
  switch (entityType) {
    case 'litigation_matters': {
      // Litigation matters → client_service → owning_company_id
      const { data } = await supabase
        .from('litigation_matters')
        .select('client_service:client_services!litigation_matters_client_service_id_fkey(owning_company_id)')
        .eq('id', entityId)
        .single();
      return (data?.client_service as any)?.owning_company_id || null;
    }
    case 'client_services': {
      const { data } = await supabase
        .from('client_services')
        .select('owning_company_id')
        .eq('id', entityId)
        .single();
      return data?.owning_company_id || null;
    }
    case 'leads': {
      const { data } = await supabase
        .from('leads')
        .select('company_id')
        .eq('id', entityId)
        .single();
      return data?.company_id || null;
    }
    case 'liabilities': {
      // Liabilities → client_service → owning_company_id
      const { data } = await supabase
        .from('liabilities')
        .select('client_service:client_services!liabilities_engagement_id_fkey(owning_company_id)')
        .eq('id', entityId)
        .single();
      return (data?.client_service as any)?.owning_company_id || null;
    }
    default:
      return null;
  }
}

/**
 * Gets the user_id for a staff member
 */
async function getStaffUserId(staffId: string): Promise<string | null> {
  const { data } = await supabase
    .from('staff')
    .select('user_id')
    .eq('id', staffId)
    .single();
  return data?.user_id || null;
}

/**
 * Executes a single workflow action
 */
async function executeAction(
  action: WorkflowAction,
  entityType: WorkflowEntityType,
  entityId: string,
  entityData?: Record<string, unknown>,
  staffId?: string
): Promise<{ success: boolean; error?: string; taskCreated?: boolean }> {
  switch (action.type) {
    case 'create_task': {
      const config = action.config as CreateTaskActionConfig;
      const assignee = await resolveAssignee(config.assign_to, entityType, entityId);
      const dueDate = calculateDueDate(config, entityData);
      
      // Map workflow entity type to task entity type
      const taskEntityType = mapToTaskEntityType(entityType);
      
      if (!taskEntityType) {
        return { success: false, error: `Cannot create tasks for entity type: ${entityType}` };
      }
      
      // Get the company_id for the task
      const companyId = await getCompanyIdForEntity(entityType, entityId);
      if (!companyId) {
        return { success: false, error: 'Could not determine company_id for task' };
      }
      
      const { error } = await supabase
        .from('tasks')
        .insert([{
          title: config.title,
          description: config.description || null,
          priority: config.priority || 'medium',
          status: 'pending',
          entity_type: taskEntityType,
          entity_id: entityId,
          assigned_to: assignee,
          due_date: dueDate,
          created_by: staffId || null,
          company_id: companyId,
        }]);
      
      if (error) {
        console.error('Error creating task from workflow:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, taskCreated: true };
    }
    
    case 'send_notification': {
      const config = action.config as SendNotificationActionConfig;
      const recipientStaffId = config.to === 'entity_owner' 
        ? await resolveAssignee('entity_owner', entityType, entityId)
        : config.to;
      
      if (recipientStaffId) {
        // Get the user_id for the staff member
        const userId = await getStaffUserId(recipientStaffId);
        if (!userId) {
          return { success: false, error: 'Could not find user for notification recipient' };
        }
        
        // Map workflow entity type to notification entity type
        const notifEntityType = mapToTaskEntityType(entityType);
        
        const { error } = await supabase
          .from('notifications')
          .insert([{
            user_id: userId,
            title: config.title,
            message: config.message,
            type: 'system_alert' as Enums<'notification_type'>,
            entity_type: notifEntityType,
            entity_id: entityId,
          }]);
        
        if (error) {
          return { success: false, error: error.message };
        }
      }
      
      return { success: true };
    }
    
    default:
      return { success: true }; // Skip unsupported actions
  }
}

/**
 * Logs workflow execution to the database
 */
async function logExecution(
  ruleId: string,
  entityType: WorkflowEntityType,
  entityId: string,
  status: 'success' | 'failed' | 'blocked' | 'skipped',
  triggerData: Record<string, unknown>,
  actionsExecuted: WorkflowAction[],
  errorMessage?: string,
  durationMs?: number
): Promise<void> {
  await supabase
    .from('workflow_executions')
    .insert([{
      rule_id: ruleId,
      entity_type: entityType,
      entity_id: entityId,
      status,
      trigger_data: triggerData as unknown as Json,
      actions_executed: actionsExecuted as unknown as Json,
      error_message: errorMessage || null,
      duration_ms: durationMs || null,
    }]);
}

/**
 * Main function to execute all matching workflows
 */
export async function executeWorkflows(
  params: ExecuteWorkflowParams
): Promise<WorkflowExecutionResult> {
  const startTime = Date.now();
  const result: WorkflowExecutionResult = {
    success: true,
    rulesExecuted: 0,
    tasksCreated: 0,
    errors: [],
  };

  try {
    // Fetch matching rules
    const rules = await fetchMatchingRules(
      params.entityType,
      params.triggerType,
      params.previousStatus,
      params.newStatus
    );

    if (rules.length === 0) {
      return result;
    }

    // Execute each rule
    for (const rule of rules) {
      const ruleStartTime = Date.now();
      const actionsExecuted: WorkflowAction[] = [];
      let ruleSuccess = true;
      let ruleError: string | undefined;

      // Execute all actions for this rule
      for (const action of rule.actions) {
        const actionResult = await executeAction(
          action,
          params.entityType,
          params.entityId,
          params.entityData,
          params.staffId
        );

        if (actionResult.success) {
          actionsExecuted.push(action);
          if (actionResult.taskCreated) {
            result.tasksCreated++;
          }
        } else {
          ruleSuccess = false;
          ruleError = actionResult.error;
          result.errors.push(`Rule "${rule.name}": ${actionResult.error}`);
        }
      }

      // Log the execution
      await logExecution(
        rule.id,
        params.entityType,
        params.entityId,
        ruleSuccess ? 'success' : 'failed',
        {
          previousStatus: params.previousStatus,
          newStatus: params.newStatus,
        },
        actionsExecuted,
        ruleError,
        Date.now() - ruleStartTime
      );

      result.rulesExecuted++;
    }

    if (result.errors.length > 0) {
      result.success = false;
    }
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('Workflow execution completed:', result);
  return result;
}
