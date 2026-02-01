import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Transaction = Tables<'transactions'> & {
  processor?: Tables<'payment_processors'> | null;
  client_service?: Tables<'client_services'> & {
    primary_client?: Tables<'clients'> | null;
  };
};

export type TransactionInsert = Omit<TablesInsert<'transactions'>, 'id' | 'created_at' | 'updated_at'>;
export type TransactionUpdate = TablesUpdate<'transactions'>;

export function useTransactions(status?: string, type?: string, clientServiceId?: string) {
  return useQuery({
    queryKey: ['transactions', status, type, clientServiceId],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          processor:payment_processors!transactions_processor_id_fkey(id, name, processor_type),
          client_service:client_services!transactions_engagement_id_fkey(
            id, 
            service_number,
            primary_client:clients!engagements_primary_contact_id_fkey(id, first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (type) {
        query = query.eq('transaction_type', type);
      }

      if (clientServiceId) {
        query = query.eq('client_service_id', clientServiceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          processor:payment_processors!transactions_processor_id_fkey(*),
          client_service:client_services!transactions_engagement_id_fkey(
            id, 
            service_number,
            primary_client:clients!engagements_primary_contact_id_fkey(id, first_name, last_name, email)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Transaction;
    },
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transaction: TransactionInsert) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Transaction created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create transaction', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TransactionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction', data.id] });
      toast({ title: 'Transaction updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update transaction', description: error.message, variant: 'destructive' });
    },
  });
}
