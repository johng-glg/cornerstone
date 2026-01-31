import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Enums } from '@/integrations/supabase/types';

export type Staff = Tables<'staff'>;

export function useStaff(department?: Enums<'department'>) {
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
