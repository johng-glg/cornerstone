import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LitigationTeam, LitigationTeamMemberWithStaff, ELIGIBLE_DEPARTMENTS } from '@/types/litigationTeams';

export function useLitigationTeams() {
  return useQuery({
    queryKey: ['litigation-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('litigation_teams')
        .select('*')
        .order('priority', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as LitigationTeam[];
    },
  });
}

export function useLitigationTeamMembers() {
  return useQuery({
    queryKey: ['litigation-team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('litigation_team_members')
        .select(`
          *,
          staff:staff_id (
            id,
            first_name,
            last_name,
            department,
            job_title,
            avatar_url,
            email
          )
        `)
        .order('assigned_at', { ascending: true });

      if (error) throw error;
      return data as LitigationTeamMemberWithStaff[];
    },
  });
}

export function useEligibleLitigationStaff() {
  return useQuery({
    queryKey: ['eligible-litigation-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, department, job_title, avatar_url, email')
        .eq('is_active', true)
        .in('department', ['attorney', 'case_manager', 'negotiations'])
        .order('first_name');

      if (error) throw error;
      return data;
    },
  });
}

interface CreateTeamInput {
  name: string;
  description?: string;
  color?: string;
  priority?: number;
}

export function useCreateLitigationTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTeamInput) => {
      // Get the current user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (staffError) throw staffError;

      const { data, error } = await supabase
        .from('litigation_teams')
        .insert({
          ...input,
          company_id: staffData.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LitigationTeam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['litigation-teams'] });
      toast({ title: 'Team created successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create team',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLitigationTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LitigationTeam> & { id: string }) => {
      const { data, error } = await supabase
        .from('litigation_teams')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LitigationTeam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['litigation-teams'] });
      toast({ title: 'Team updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update team',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteLitigationTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('litigation_teams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['litigation-teams'] });
      queryClient.invalidateQueries({ queryKey: ['litigation-team-members'] });
      toast({ title: 'Team deleted successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete team',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useAssignToTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ teamId, staffId }: { teamId: string; staffId: string }) => {
      // First remove from any existing team
      await supabase
        .from('litigation_team_members')
        .delete()
        .eq('staff_id', staffId);

      // Then add to new team
      const { data, error } = await supabase
        .from('litigation_team_members')
        .insert({
          team_id: teamId,
          staff_id: staffId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['litigation-team-members'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to assign to team',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveFromTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from('litigation_team_members')
        .delete()
        .eq('staff_id', staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['litigation-team-members'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove from team',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useMoveStaffToTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ staffId, targetTeamId }: { staffId: string; targetTeamId: string | null }) => {
      // Remove from current team
      await supabase
        .from('litigation_team_members')
        .delete()
        .eq('staff_id', staffId);

      // If moving to a team (not unassigned), add to new team
      if (targetTeamId) {
        const { error } = await supabase
          .from('litigation_team_members')
          .insert({
            team_id: targetTeamId,
            staff_id: staffId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['litigation-team-members'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to move staff member',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
