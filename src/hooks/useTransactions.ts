import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Transaction = Tables<'transactions'> & {
  processor?: Tables<'payment_processors'> | null;
  client_service?: Tables<'client_services'> & {
    primary_client?: Tables<'clients'> | null;
  };
  // New fields from migration
  scheduled_date?: string | null;
  settlement_id?: string | null;
  liability_id?: string | null;
  parent_transaction_id?: string | null;
  description?: string | null;
  sequence_number?: number | null;
};

export type TransactionInsert = Omit<TablesInsert<'transactions'>, 'id' | 'created_at' | 'updated_at'>;
export type TransactionUpdate = TablesUpdate<'transactions'>;

// Transaction types
export type TransactionType = 'draft' | 'processor_fee' | 'settlement_payment' | 'contingency_fee';
export type TransactionStatus = 'open' | 'pending' | 'cleared' | 'cancelled';

export interface UseTransactionsOptions {
  status?: string;
  type?: string;
  clientServiceId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedTransactionsResult {
  data: Transaction[];
  count: number;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { status, type, clientServiceId, page = 1, pageSize = 50 } = options;
  
  return useQuery({
    queryKey: ['transactions', { status, type, clientServiceId, page, pageSize }],
    queryFn: async (): Promise<PaginatedTransactionsResult> => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

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
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (status) {
        query = query.eq('status', status);
      }

      if (type) {
        query = query.eq('transaction_type', type);
      }

      if (clientServiceId) {
        query = query.eq('client_service_id', clientServiceId);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Transaction[], count: count ?? 0 };
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
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
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
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      toast({ title: 'Transaction updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update transaction', description: error.message, variant: 'destructive' });
    },
  });
}

// Create multiple transactions at once (for generating scheduled drafts)
export function useCreateTransactionsBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transactions: TransactionInsert[]) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      toast({ title: `Transactions created` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create transactions', description: error.message, variant: 'destructive' });
    },
  });
}
