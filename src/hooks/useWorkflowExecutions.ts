import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkflowExecution, WorkflowRule, ConditionGroup, WorkflowAction, WorkflowEntityType } from '@/types/workflow';

// Helper to safely parse JSONB fields
function parseExecution(data: any): WorkflowExecution {
  return {
    ...data,
    trigger_data: data.trigger_data || null,
    condition_results: (data.condition_results || null) as ConditionGroup[] | null,
    actions_executed: (data.actions_executed || null) as WorkflowAction[] | null,
    rule: data.rule ? {
      ...data.rule,
      trigger_config: data.rule.trigger_config || {},
      conditions: data.rule.conditions || [],
      actions: data.rule.actions || [],
    } as WorkflowRule : null,
  };
}

export function useWorkflowExecutions(options?: {
  ruleId?: string;
  entityType?: WorkflowEntityType;
  entityId?: string;
  limit?: number;
}) {
  const { ruleId, entityType, entityId, limit = 50 } = options || {};

  return useQuery({
    queryKey: ['workflow_executions', { ruleId, entityType, entityId, limit }],
    queryFn: async () => {
      let query = supabase
        .from('workflow_executions')
        .select(`
          *,
          rule:workflow_rules(id, name, entity_type, trigger_type, is_blocking)
        `)
        .order('executed_at', { ascending: false })
        .limit(limit);

      if (ruleId) {
        query = query.eq('rule_id', ruleId);
      }
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(parseExecution);
    },
  });
}

export function useWorkflowExecutionsByEntity(entityType: WorkflowEntityType, entityId: string) {
  return useQuery({
    queryKey: ['workflow_executions', 'entity', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          rule:workflow_rules(id, name, entity_type, trigger_type, is_blocking)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('executed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []).map(parseExecution);
    },
    enabled: !!entityType && !!entityId,
  });
}
