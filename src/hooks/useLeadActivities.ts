import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type LeadActivity = Tables<'lead_activities'> & {
  staff?: Tables<'staff'> | null;
};

export type LeadActivityInsert = TablesInsert<'lead_activities'>;

interface UseLeadActivitiesOptions {
  realtime?: boolean;
}

export function useLeadActivities(leadId: string | undefined, options?: UseLeadActivitiesOptions) {
  const queryKey = ['lead-activities', leadId];

  // Subscribe to realtime updates for this lead's activities
  useRealtimeSubscription<Tables<'lead_activities'>>({
    table: 'lead_activities',
    queryKey,
    filter: leadId ? `lead_id=eq.${leadId}` : undefined,
    enabled: (options?.realtime ?? false) && !!leadId,
  });

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from('lead_activities')
        .select(`
          *,
          staff(id, first_name, last_name, avatar_url)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeadActivity[];
    },
    enabled: !!leadId,
  });
}

export function useCreateLeadActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (activity: LeadActivityInsert) => {
      const { data, error } = await supabase
        .from('lead_activities')
        .insert(activity)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', data.lead_id] });
      toast({ title: 'Activity logged' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to log activity', description: error.message, variant: 'destructive' });
    },
  });
}
