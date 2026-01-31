import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Creditor = Tables<'creditors'>;

export function useCreditors() {
  return useQuery({
    queryKey: ['creditors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creditors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Creditor[];
    },
  });
}
