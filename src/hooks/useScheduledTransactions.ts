import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Transaction } from './useTransactions';

export function useScheduledTransactions(clientServiceId: string | undefined) {
  return useQuery({
    queryKey: ['scheduled-transactions', clientServiceId],
    queryFn: async () => {
      if (!clientServiceId) return [];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          processor:payment_processors!transactions_processor_id_fkey(id, name, processor_type)
        `)
        .eq('client_service_id', clientServiceId)
        .not('scheduled_date', 'is', null)
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!clientServiceId,
  });
}

export function useUpcomingTransactions(clientServiceId: string | undefined, limit: number = 12) {
  return useQuery({
    queryKey: ['upcoming-transactions', clientServiceId, limit],
    queryFn: async () => {
      if (!clientServiceId) return [];
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          processor:payment_processors!transactions_processor_id_fkey(id, name, processor_type)
        `)
        .eq('client_service_id', clientServiceId)
        .gte('scheduled_date', today)
        .in('status', ['open', 'pending'])
        .order('scheduled_date', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!clientServiceId,
  });
}
