import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Enums } from '@/integrations/supabase/types';

export interface JobTitle {
  id: string;
  role: Enums<'app_role'>;
  title: string;
  display_order: number;
  is_active: boolean;
}

export function useJobTitles(role?: Enums<'app_role'>) {
  return useQuery({
    queryKey: ['job-titles', role],
    queryFn: async () => {
      let query = supabase
        .from('job_titles')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as JobTitle[];
    },
  });
}
