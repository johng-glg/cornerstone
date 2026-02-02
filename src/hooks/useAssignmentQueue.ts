import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AssignmentQueueItem } from '@/types/assignment';

export function useAssignmentQueue(status?: 'pending' | 'assigned' | 'expired' | 'manual') {
  return useQuery({
    queryKey: ['assignment_queue', status],
    queryFn: async () => {
      let query = supabase
        .from('lead_assignment_queue')
        .select(`
          *,
          lead:lead_id (
            id,
            first_name,
            last_name,
            lead_number,
            source,
            interest_type,
            lead_score
          )
        `)
        .order('priority', { ascending: false })
        .order('queued_at', { ascending: true });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return (data || []) as AssignmentQueueItem[];
    },
  });
}

export function usePendingQueueCount() {
  return useQuery({
    queryKey: ['assignment_queue_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('lead_assignment_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useProcessQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('process_assignment_queue');
      
      if (error) throw error;
      return data as number;
    },
    onSuccess: (processed) => {
      queryClient.invalidateQueries({ queryKey: ['assignment_queue'] });
      queryClient.invalidateQueries({ queryKey: ['assignment_queue_count'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ 
        title: processed > 0 
          ? `Processed ${processed} lead${processed > 1 ? 's' : ''} from queue`
          : 'No leads ready for assignment'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to process queue',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveFromQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (queueItemId: string) => {
      const { error } = await supabase
        .from('lead_assignment_queue')
        .update({ status: 'expired' })
        .eq('id', queueItemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment_queue'] });
      queryClient.invalidateQueries({ queryKey: ['assignment_queue_count'] });
      toast({ title: 'Lead removed from queue' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove from queue',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
