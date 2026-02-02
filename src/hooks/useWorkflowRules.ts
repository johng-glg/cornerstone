import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { WorkflowRule, WorkflowRuleInsert, WorkflowRuleUpdate, ConditionGroup, WorkflowAction, TriggerConfig, WorkflowEntityType } from '@/types/workflow';
import type { Json } from '@/integrations/supabase/types';

// Helper to safely parse JSONB fields
function parseWorkflowRule(data: any): WorkflowRule {
  return {
    ...data,
    trigger_config: (data.trigger_config || {}) as TriggerConfig,
    conditions: (data.conditions || []) as ConditionGroup[],
    actions: (data.actions || []) as WorkflowAction[],
  };
}

export function useWorkflowRules(entityType?: WorkflowEntityType) {
  return useQuery({
    queryKey: ['workflow_rules', entityType],
    queryFn: async () => {
      let query = supabase
        .from('workflow_rules')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(parseWorkflowRule);
    },
  });
}

export function useWorkflowRule(id: string | undefined) {
  return useQuery({
    queryKey: ['workflow_rule', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('workflow_rules')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return parseWorkflowRule(data);
    },
    enabled: !!id,
  });
}

export function useCreateWorkflowRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rule: WorkflowRuleInsert) => {
      const { data, error } = await supabase
        .from('workflow_rules')
        .insert([{
          ...rule,
          trigger_config: rule.trigger_config as unknown as Json,
          conditions: rule.conditions as unknown as Json,
          actions: rule.actions as unknown as Json,
        }])
        .select()
        .single();
      if (error) throw error;
      return parseWorkflowRule(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_rules'] });
      toast({ title: 'Workflow rule created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create workflow rule', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateWorkflowRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: WorkflowRuleUpdate) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.trigger_config) {
        updateData.trigger_config = updates.trigger_config as unknown as Json;
      }
      if (updates.conditions) {
        updateData.conditions = updates.conditions as unknown as Json;
      }
      if (updates.actions) {
        updateData.actions = updates.actions as unknown as Json;
      }

      const { data, error } = await supabase
        .from('workflow_rules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return parseWorkflowRule(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_rules'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_rule', data.id] });
      toast({ title: 'Workflow rule updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update workflow rule', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteWorkflowRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_rules'] });
      toast({ title: 'Workflow rule deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete workflow rule', description: error.message, variant: 'destructive' });
    },
  });
}

export function useToggleWorkflowRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('workflow_rules')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return parseWorkflowRule(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_rules'] });
      toast({ title: `Workflow rule ${data.is_active ? 'activated' : 'deactivated'}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to toggle workflow rule', description: error.message, variant: 'destructive' });
    },
  });
}
