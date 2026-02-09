import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import type { Tables } from '@/integrations/supabase/types';

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

interface UseLitigationActivitiesOptions {
  realtime?: boolean;
}

export function useLitigationActivities(matterId: string | undefined, options?: UseLitigationActivitiesOptions) {
  const queryKey = ['litigation_activities', matterId];

  // Subscribe to realtime updates for this matter's activities
  useRealtimeSubscription<Tables<'litigation_activities'>>({
    table: 'litigation_activities',
    queryKey,
    filter: matterId ? `matter_id=eq.${matterId}` : undefined,
    enabled: (options?.realtime ?? false) && !!matterId,
  });

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!matterId) return [];

      // Fetch activities and matter creation date in parallel
      const [activitiesResult, matterResult] = await Promise.all([
        supabase
          .from('litigation_activities')
          .select(`*, staff:staff(id, first_name, last_name)`)
          .eq('matter_id', matterId)
          .order('created_at', { ascending: false }),
        supabase
          .from('litigation_matters')
          .select('created_at, case_number')
          .eq('id', matterId)
          .single(),
      ]);

      if (activitiesResult.error) throw activitiesResult.error;

      const activities = activitiesResult.data as LitigationActivity[];

      // Add synthetic "Matter created" entry
      if (matterResult.data) {
        activities.push({
          id: `creation-matter-${matterId}`,
          matter_id: matterId,
          activity_type: 'status_change',
          description: `Matter ${matterResult.data.case_number || ''} created`,
          outcome: null,
          activity_date: matterResult.data.created_at,
          staff_id: null,
          document_url: null,
          created_at: matterResult.data.created_at,
          staff: null,
        });
        activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      return activities;
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
