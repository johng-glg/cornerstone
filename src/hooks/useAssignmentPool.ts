import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AssignmentPoolMember, PoolMemberSkill } from '@/types/assignment';

export function useAssignmentPool(ruleId: string | undefined) {
  return useQuery({
    queryKey: ['assignment_pool', ruleId],
    queryFn: async () => {
      if (!ruleId) return [];
      
      const { data, error } = await supabase
        .from('lead_assignment_pool')
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('rule_id', ruleId)
        .order('weight', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(member => ({
        ...member,
        skills: (member.skills || []) as unknown as PoolMemberSkill[],
      })) as unknown as AssignmentPoolMember[];
    },
    enabled: !!ruleId,
  });
}

// Get all pool memberships for a specific staff member
export function useStaffPoolMemberships(staffId: string | undefined) {
  return useQuery({
    queryKey: ['staff_pool_memberships', staffId],
    queryFn: async () => {
      if (!staffId) return [];
      
      const { data, error } = await supabase
        .from('lead_assignment_pool')
        .select(`
          *,
          rule:rule_id (
            id,
            name,
            method,
            is_active
          )
        `)
        .eq('staff_id', staffId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!staffId,
  });
}

interface AddPoolMemberInput {
  rule_id: string;
  staff_id: string;
  weight?: number;
  max_active_leads?: number | null;
  is_available?: boolean;
  skills?: PoolMemberSkill[];
}

export function useAddPoolMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: AddPoolMemberInput) => {
      const insertData = {
        rule_id: input.rule_id,
        staff_id: input.staff_id,
        weight: input.weight,
        max_active_leads: input.max_active_leads,
        is_available: input.is_available,
        skills: JSON.parse(JSON.stringify(input.skills || [])),
      };
      const { data, error } = await supabase
        .from('lead_assignment_pool')
        .insert([insertData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignment_pool', variables.rule_id] });
      toast({ title: 'Team member added to pool' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add team member',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

interface UpdatePoolMemberInput {
  id: string;
  rule_id: string;
  weight?: number;
  max_active_leads?: number | null;
  is_available?: boolean;
  skills?: PoolMemberSkill[];
}

export function useUpdatePoolMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, rule_id, ...updates }: UpdatePoolMemberInput) => {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.skills) {
        updateData.skills = updates.skills as unknown as Record<string, unknown>[];
      }
      const { data, error } = await supabase
        .from('lead_assignment_pool')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, rule_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['assignment_pool', result.rule_id] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update team member',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemovePoolMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, rule_id }: { id: string; rule_id: string }) => {
      const { error } = await supabase
        .from('lead_assignment_pool')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { rule_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['assignment_pool', result.rule_id] });
      toast({ title: 'Team member removed from pool' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove team member',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

// Toggle availability for a staff member across all their pools
export function useToggleAvailability() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ staffId, isAvailable }: { staffId: string; isAvailable: boolean }) => {
      const { error } = await supabase
        .from('lead_assignment_pool')
        .update({ 
          is_available: isAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq('staff_id', staffId);
      
      if (error) throw error;
      return { staffId, isAvailable };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['assignment_pool'] });
      queryClient.invalidateQueries({ queryKey: ['staff_pool_memberships', result.staffId] });
      toast({ 
        title: result.isAvailable 
          ? 'You are now available for lead assignments' 
          : 'You are now unavailable for lead assignments' 
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update availability',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
