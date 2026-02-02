import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import type { Tables } from '@/integrations/supabase/types';

export type StatusDimension = 'primary' | 'payment' | 'retention' | 'contact';

export interface ServiceStatusHistoryEntry {
  id: string;
  client_service_id: string;
  status_dimension: StatusDimension;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  changed_by: string | null;
  created_at: string;
  staff?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface UseServiceStatusHistoryOptions {
  realtime?: boolean;
}

export function useServiceStatusHistory(clientServiceId: string | undefined, options?: UseServiceStatusHistoryOptions) {
  const queryKey = ['service_status_history', clientServiceId];

  // Subscribe to realtime updates for this service's status history
  useRealtimeSubscription<Tables<'service_status_history'>>({
    table: 'service_status_history',
    queryKey,
    filter: clientServiceId ? `client_service_id=eq.${clientServiceId}` : undefined,
    enabled: (options?.realtime ?? false) && !!clientServiceId,
  });

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!clientServiceId) return [];
      const { data, error } = await supabase
        .from('service_status_history')
        .select(`
          *,
          staff:changed_by(first_name, last_name)
        `)
        .eq('client_service_id', clientServiceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ServiceStatusHistoryEntry[];
    },
    enabled: !!clientServiceId,
  });
}

export function useRecordStatusChange() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: async ({
      clientServiceId,
      dimension,
      oldValue,
      newValue,
      reason,
    }: {
      clientServiceId: string;
      dimension: StatusDimension;
      oldValue: string | null;
      newValue: string | null;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('service_status_history')
        .insert([{
          client_service_id: clientServiceId,
          status_dimension: dimension,
          old_value: oldValue,
          new_value: newValue,
          reason,
          changed_by: staff?.id || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service_status_history', data.client_service_id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to record status change', description: error.message, variant: 'destructive' });
    },
  });
}
