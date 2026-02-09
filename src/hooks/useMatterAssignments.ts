import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AssignmentType = Database['public']['Enums']['assignment_type'];

export interface MatterAssignment {
  id: string;
  entity_id: string;
  entity_type: string;
  staff_id: string;
  assignment_type: AssignmentType;
  assigned_date: string;
  unassigned_date: string | null;
  is_active: boolean;
  created_at: string;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    job_title: string | null;
  } | null;
}

export function useMatterAssignments(matterId: string | undefined) {
  return useQuery({
    queryKey: ['matter_assignments', matterId],
    queryFn: async () => {
      if (!matterId) return [];
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          staff:staff(id, first_name, last_name, job_title)
        `)
        .eq('entity_type', 'litigation_matter')
        .eq('entity_id', matterId)
        .eq('is_active', true)
        .order('assigned_date', { ascending: false });
      if (error) throw error;
      return data as MatterAssignment[];
    },
    enabled: !!matterId,
  });
}

export function useAssignStaffToMatter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      matterId,
      staffId,
      assignmentType,
    }: {
      matterId: string;
      staffId: string;
      assignmentType: AssignmentType;
    }) => {
      // Deactivate any existing active assignment for this role on this matter
      await supabase
        .from('assignments')
        .update({ is_active: false, unassigned_date: new Date().toISOString() })
        .eq('entity_type', 'litigation_matter')
        .eq('entity_id', matterId)
        .eq('assignment_type', assignmentType)
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('assignments')
        .insert([{
          entity_type: 'litigation_matter' as const,
          entity_id: matterId,
          staff_id: staffId,
          assignment_type: assignmentType,
          is_active: true,
        }])
        .select()
        .single();
      if (error) throw error;
      return { ...data, matterId };
    },
    onSuccess: ({ matterId }) => {
      queryClient.invalidateQueries({ queryKey: ['matter_assignments', matterId] });
      toast({ title: 'Staff assigned to matter' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to assign staff', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUnassignStaffFromMatter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ assignmentId, matterId }: { assignmentId: string; matterId: string }) => {
      const { error } = await supabase
        .from('assignments')
        .update({ is_active: false, unassigned_date: new Date().toISOString() })
        .eq('id', assignmentId);
      if (error) throw error;
      return { matterId };
    },
    onSuccess: ({ matterId }) => {
      queryClient.invalidateQueries({ queryKey: ['matter_assignments', matterId] });
      toast({ title: 'Staff unassigned from matter' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to unassign staff', description: error.message, variant: 'destructive' });
    },
  });
}
