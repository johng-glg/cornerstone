import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FilingFeeStatus = 'pending' | 'submitted_to_client' | 'approved' | 'declined' | 'paid';

export interface FilingFee {
  id: string;
  matter_id: string;
  amount: number;
  description: string;
  status: FilingFeeStatus;
  requested_date: string;
  approved_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  staff?: { first_name: string; last_name: string } | null;
}

export function useFilingFees(matterId: string | undefined) {
  return useQuery({
    queryKey: ['filing_fees', matterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('filing_fees')
        .select('*, staff:staff!filing_fees_created_by_fkey(first_name, last_name)')
        .eq('matter_id', matterId!)
        .order('requested_date', { ascending: false });
      if (error) throw error;
      return data as FilingFee[];
    },
    enabled: !!matterId,
  });
}

export function useCreateFilingFee() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (fee: Omit<FilingFee, 'id' | 'created_at' | 'updated_at' | 'staff'>) => {
      const { data, error } = await supabase.from('filing_fees').insert([fee]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['filing_fees', vars.matter_id] });
      toast({ title: 'Filing fee added' });
    },
    onError: (e: Error) => toast({ title: 'Failed to add filing fee', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateFilingFee() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FilingFee> & { id: string }) => {
      const { data, error } = await supabase.from('filing_fees').update(updates as never).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['filing_fees', data.matter_id] });
      toast({ title: 'Filing fee updated' });
    },
    onError: (e: Error) => toast({ title: 'Failed to update filing fee', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteFilingFee() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, matterId }: { id: string; matterId: string }) => {
      const { error } = await supabase.from('filing_fees').delete().eq('id', id);
      if (error) throw error;
      return matterId;
    },
    onSuccess: (matterId) => {
      qc.invalidateQueries({ queryKey: ['filing_fees', matterId] });
      toast({ title: 'Filing fee deleted' });
    },
    onError: (e: Error) => toast({ title: 'Failed to delete filing fee', description: e.message, variant: 'destructive' }),
  });
}
