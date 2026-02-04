import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import type { BillingEntry, BillingEntryInsert, BillingEntryUpdate } from '@/types/billing';
import type { Tables } from '@/integrations/supabase/types';

interface UseBillingEntriesOptions {
  clientId?: string;
  litigationMatterId?: string;
  staffId?: string;
  status?: string;
  realtime?: boolean;
}

export function useBillingEntries(options?: UseBillingEntriesOptions) {
  const queryKey = ['billing_entries', options];

  // Subscribe to realtime updates
  useRealtimeSubscription<Tables<'billing_entries'>>({
    table: 'billing_entries',
    queryKey,
    enabled: options?.realtime ?? false,
  });

  return useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('billing_entries')
        .select(`
          *,
          staff:staff(id, first_name, last_name, job_title),
          client:clients(id, first_name, last_name),
          litigation_matter:litigation_matters(id, case_number, status)
        `)
        .order('billing_date', { ascending: false });

      if (options?.clientId) {
        query = query.eq('client_id', options.clientId);
      }
      if (options?.litigationMatterId) {
        query = query.eq('litigation_matter_id', options.litigationMatterId);
      }
      if (options?.staffId) {
        query = query.eq('staff_id', options.staffId);
      }
      if (options?.status) {
        query = query.eq('status', options.status as 'draft' | 'approved' | 'invoiced' | 'paid');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BillingEntry[];
    },
  });
}

export function useBillingEntry(id: string | undefined) {
  return useQuery({
    queryKey: ['billing_entry', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('billing_entries')
        .select(`
          *,
          staff:staff(id, first_name, last_name, job_title),
          client:clients(id, first_name, last_name),
          litigation_matter:litigation_matters(id, case_number, status)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as BillingEntry;
    },
    enabled: !!id,
  });
}

export function useCreateBillingEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (entry: BillingEntryInsert) => {
      const { data, error } = await supabase
        .from('billing_entries')
        .insert([entry])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_entries'] });
      toast({ title: 'Billing entry created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create billing entry', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateBillingEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BillingEntryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('billing_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing_entries'] });
      queryClient.invalidateQueries({ queryKey: ['billing_entry', data.id] });
      toast({ title: 'Billing entry updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update billing entry', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteBillingEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('billing_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing_entries'] });
      toast({ title: 'Billing entry deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete billing entry', description: error.message, variant: 'destructive' });
    },
  });
}

// Calculate billing summary for a client or matter
export function useBillingSummary(options: { clientId?: string; litigationMatterId?: string }) {
  return useQuery({
    queryKey: ['billing_summary', options],
    queryFn: async () => {
      let query = supabase
        .from('billing_entries')
        .select('entry_type, total_amount, is_billable, status');

      if (options.clientId) {
        query = query.eq('client_id', options.clientId);
      }
      if (options.litigationMatterId) {
        query = query.eq('litigation_matter_id', options.litigationMatterId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const summary = {
        totalBillable: 0,
        totalNonBillable: 0,
        totalTime: 0,
        totalExpenses: 0,
        byStatus: {
          draft: 0,
          approved: 0,
          invoiced: 0,
          paid: 0,
        },
      };

      for (const entry of data || []) {
        const amount = Number(entry.total_amount) || 0;
        if (entry.is_billable) {
          summary.totalBillable += amount;
        } else {
          summary.totalNonBillable += amount;
        }
        if (entry.entry_type === 'time') {
          summary.totalTime += amount;
        } else {
          summary.totalExpenses += amount;
        }
        summary.byStatus[entry.status as keyof typeof summary.byStatus] += amount;
      }

      return summary;
    },
    enabled: !!options.clientId || !!options.litigationMatterId,
  });
}
