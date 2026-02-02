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
          staff:staff_id(id, first_name, last_name, avatar_url)
        `)
        .eq('rule_id', ruleId)
        .order('weight', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(member => ({
        ...member,
        skills: (member.skills as unknown as PoolMemberSkill[]) || [],
      })) as AssignmentPoolMember[];
    },
    enabled: !!ruleId,
  });
}

export function useMyPoolMembership() {
  return useQuery({
    queryKey: ['my_pool_membership'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Get staff ID
      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!staffData) return null;
      
      // Get first pool membership for this staff
      const { data, error } = await supabase
        .from('lead_assignment_pool')
        .select('*')
        .eq('staff_id', staffData.id)
        .limit(1)
        .maybeSingle();
      
      if (error || !data) return null;
      
      return {
        ...data,
        skills: (data.skills as unknown as PoolMemberSkill[]) || [],
      } as AssignmentPoolMember;
    },
  });
}

interface AddPoolMemberInput {
  rule_id: string;
  staff_id: string;
  weight?: number;
  max_active_leads?: number | null;
  is_available?: boolean;
}

export function useAddPoolMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: AddPoolMemberInput) => {
      const { data, error } = await supabase
        .from('lead_assignment_pool')
        .insert([{
          rule_id: input.rule_id,
          staff_id: input.staff_id,
          weight: input.weight ?? 10,
          max_active_leads: input.max_active_leads ?? 25,
          is_available: input.is_available ?? true,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignment_pool', variables.rule_id] });
      toast({ title: 'Member added to pool' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add member',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

interface UpdatePoolMemberInput {
  id: string;
  weight?: number;
  max_active_leads?: number | null;
  is_available?: boolean;
}

export function useUpdatePoolMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePoolMemberInput) => {
      const { data, error } = await supabase
        .from('lead_assignment_pool')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment_pool'] });
    },
  });
}

export function useRemovePoolMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('lead_assignment_pool')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment_pool'] });
      toast({ title: 'Member removed from pool' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove member',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useToggleAvailability() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ poolId, available }: { poolId: string; available: boolean }) => {
      const { data, error } = await supabase
        .from('lead_assignment_pool')
        .update({
          is_available: available,
          updated_at: new Date().toISOString(),
        })
        .eq('id', poolId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignment_pool'] });
      queryClient.invalidateQueries({ queryKey: ['my_pool_membership'] });
      toast({ 
        title: variables.available ? 'You are now available for leads' : 'You are now unavailable for leads' 
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
