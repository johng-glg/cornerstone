import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { WorkflowGroup, WorkflowGroupInsert, WorkflowGroupUpdate, ConditionGroup, WorkflowEntityType } from '@/types/workflow';
import type { Json } from '@/integrations/supabase/types';

// Helper to safely parse JSONB fields
function parseWorkflowGroup(data: any): WorkflowGroup {
  return {
    ...data,
    filter_conditions: (data.filter_conditions || []) as ConditionGroup[],
  };
}

export function useWorkflowGroups(entityType?: WorkflowEntityType) {
  return useQuery({
    queryKey: ['workflow_groups', entityType],
    queryFn: async () => {
      let query = supabase
        .from('workflow_groups')
        .select('*')
        .order('priority', { ascending: false })
        .order('name', { ascending: true });

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(parseWorkflowGroup);
    },
  });
}

export function useWorkflowGroup(id: string | undefined) {
  return useQuery({
    queryKey: ['workflow_group', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('workflow_groups')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return parseWorkflowGroup(data);
    },
    enabled: !!id,
  });
}

export function useCreateWorkflowGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (group: WorkflowGroupInsert) => {
      const { data, error } = await supabase
        .from('workflow_groups')
        .insert([{
          ...group,
          filter_conditions: group.filter_conditions as unknown as Json,
        }])
        .select()
        .single();
      if (error) throw error;
      return parseWorkflowGroup(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_groups'] });
      toast({ title: 'Workflow group created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create workflow group', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateWorkflowGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: WorkflowGroupUpdate) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.filter_conditions) {
        updateData.filter_conditions = updates.filter_conditions as unknown as Json;
      }

      const { data, error } = await supabase
        .from('workflow_groups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return parseWorkflowGroup(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_groups'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_group', data.id] });
      toast({ title: 'Workflow group updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update workflow group', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteWorkflowGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_groups')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_groups'] });
      queryClient.invalidateQueries({ queryKey: ['workflow_rules'] });
      toast({ title: 'Workflow group deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete workflow group', description: error.message, variant: 'destructive' });
    },
  });
}

export function useToggleWorkflowGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('workflow_groups')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return parseWorkflowGroup(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow_groups'] });
      toast({ title: `Workflow group ${data.is_active ? 'activated' : 'deactivated'}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to toggle workflow group', description: error.message, variant: 'destructive' });
    },
  });
}
