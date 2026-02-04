import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import type { Department } from '@/lib/staffDepartments';

export type Staff = Tables<'staff'>;

export function useStaff(department?: Department) {
  return useQuery({
    queryKey: ['staff', department],
    queryFn: async () => {
      let query = supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .order('first_name');

      if (department) {
        query = query.eq('department', department);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Staff[];
    },
  });
}

export function useCurrentStaff() {
  return useQuery({
    queryKey: ['current-staff'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) return null;
      return data as Staff;
    },
  });
}

interface UpdateStaffInput {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
}

export function useUpdateCurrentStaff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: UpdateStaffInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('staff')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-staff'] });
      toast({ title: 'Profile updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update profile',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
