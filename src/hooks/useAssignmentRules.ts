import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AssignmentRule, AssignmentRuleConfig } from '@/types/assignment';

export function useAssignmentRules() {
  return useQuery({
    queryKey: ['assignment_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .select('*')
        .order('priority', { ascending: false })
        .order('name');
      
      if (error) throw error;
      
      return (data || []).map(rule => ({
        ...rule,
        config: (rule.config || {}) as AssignmentRuleConfig,
      })) as AssignmentRule[];
    },
  });
}

export function useAssignmentRule(ruleId: string | undefined) {
  return useQuery({
    queryKey: ['assignment_rule', ruleId],
    queryFn: async () => {
      if (!ruleId) return null;
      
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .select('*')
        .eq('id', ruleId)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        config: (data.config || {}) as AssignmentRuleConfig,
      } as AssignmentRule;
    },
    enabled: !!ruleId,
  });
}

interface CreateRuleInput {
  name: string;
  description?: string;
  method: AssignmentRule['method'];
  is_active?: boolean;
  is_default?: boolean;
  source?: string | null;
  interest_type?: string | null;
  min_debt_amount?: number | null;
  max_debt_amount?: number | null;
  config?: AssignmentRuleConfig;
  priority?: number;
  company_id: string;
}

export function useCreateAssignmentRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateRuleInput) => {
      const insertData = {
        name: input.name,
        description: input.description,
        method: input.method,
        is_active: input.is_active,
        is_default: input.is_default,
        source: input.source as 'web_form' | 'referral' | 'phone' | 'advertisement' | 'walk_in' | 'other' | null,
        interest_type: input.interest_type as 'debt_resolution' | 'litigation' | 'both' | null,
        min_debt_amount: input.min_debt_amount,
        max_debt_amount: input.max_debt_amount,
        priority: input.priority,
        company_id: input.company_id,
        config: JSON.parse(JSON.stringify(input.config || {})),
      };
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .insert([insertData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment_rules'] });
      toast({ title: 'Assignment rule created' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create rule',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

interface UpdateRuleInput {
  id: string;
  name?: string;
  description?: string | null;
  method?: AssignmentRule['method'];
  is_active?: boolean;
  is_default?: boolean;
  source?: string | null;
  interest_type?: string | null;
  min_debt_amount?: number | null;
  max_debt_amount?: number | null;
  config?: AssignmentRuleConfig;
  priority?: number;
}

export function useUpdateAssignmentRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateRuleInput) => {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.config) {
        updateData.config = updates.config as unknown as Record<string, unknown>;
      }
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignment_rules'] });
      queryClient.invalidateQueries({ queryKey: ['assignment_rule', variables.id] });
      toast({ title: 'Assignment rule updated' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update rule',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAssignmentRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('lead_assignment_rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment_rules'] });
      toast({ title: 'Assignment rule deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete rule',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
