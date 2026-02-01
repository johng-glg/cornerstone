import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type LiabilityAction = Tables<'liability_actions'> & {
  staff?: Tables<'staff'> | null;
};

export type LiabilityActionInsert = Omit<TablesInsert<'liability_actions'>, 'id' | 'created_at'>;

export function useLiabilityActions(liabilityId?: string) {
  return useQuery({
    queryKey: ['liability_actions', liabilityId],
    queryFn: async () => {
      if (!liabilityId) return [];
      
      const { data, error } = await supabase
        .from('liability_actions')
        .select(`
          *,
          staff:staff!liability_actions_staff_id_fkey(id, first_name, last_name)
        `)
        .eq('liability_id', liabilityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LiabilityAction[];
    },
    enabled: !!liabilityId,
  });
}

export function useCreateLiabilityAction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (action: LiabilityActionInsert) => {
      const { data, error } = await supabase
        .from('liability_actions')
        .insert([action])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['liability_actions', data.liability_id] });
      toast({ title: 'Action recorded' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to record action', description: error.message, variant: 'destructive' });
    },
  });
}
