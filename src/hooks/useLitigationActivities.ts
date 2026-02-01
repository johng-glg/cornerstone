import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LitigationActivity {
  id: string;
  matter_id: string;
  activity_type: string;
  description: string;
  outcome: string | null;
  activity_date: string | null;
  staff_id: string | null;
  document_url: string | null;
  created_at: string;
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export type LitigationActivityInsert = Omit<LitigationActivity, 'id' | 'created_at' | 'staff'>;

export function useLitigationActivities(matterId: string | undefined) {
  return useQuery({
    queryKey: ['litigation_activities', matterId],
    queryFn: async () => {
      if (!matterId) return [];
      const { data, error } = await supabase
        .from('litigation_activities')
        .select(`
          *,
          staff:staff(id, first_name, last_name)
        `)
        .eq('matter_id', matterId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LitigationActivity[];
    },
    enabled: !!matterId,
  });
}

export function useCreateLitigationActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (activity: LitigationActivityInsert) => {
      const { data, error } = await supabase
        .from('litigation_activities')
        .insert([activity])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['litigation_activities', data.matter_id] });
      toast({ title: 'Activity logged' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to log activity', description: error.message, variant: 'destructive' });
    },
  });
}
