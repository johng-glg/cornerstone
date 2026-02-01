import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

export type Settlement = Tables<'settlements'> & {
  attorney_approver?: Tables<'staff'> | null;
};

export type SettlementInsert = Omit<TablesInsert<'settlements'>, 'id' | 'created_at' | 'updated_at'>;
export type SettlementUpdate = TablesUpdate<'settlements'>;
export type SettlementStatus = Enums<'settlement_status'>;
export type PaymentType = Enums<'payment_type'>;

export function useSettlements(liabilityId?: string) {
  return useQuery({
    queryKey: ['settlements', liabilityId],
    queryFn: async () => {
      let query = supabase
        .from('settlements')
        .select(`
          *,
          attorney_approver:staff!settlements_attorney_approved_by_fkey(id, first_name, last_name)
        `)
        .order('offered_date', { ascending: false });

      if (liabilityId) {
        query = query.eq('liability_id', liabilityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Settlement[];
    },
    enabled: liabilityId ? !!liabilityId : true,
  });
}

export function useSettlement(id: string | undefined) {
  return useQuery({
    queryKey: ['settlement', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('settlements')
        .select(`
          *,
          attorney_approver:staff!settlements_attorney_approved_by_fkey(id, first_name, last_name)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Settlement;
    },
    enabled: !!id,
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settlement: SettlementInsert) => {
      const { data, error } = await supabase
        .from('settlements')
        .insert([settlement])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      toast({ title: 'Settlement offer created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create settlement', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SettlementUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('settlements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      queryClient.invalidateQueries({ queryKey: ['settlement', data.id] });
      toast({ title: 'Settlement updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update settlement', description: error.message, variant: 'destructive' });
    },
  });
}

export function useApproveSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, staffId }: { id: string; staffId: string }) => {
      const { data, error } = await supabase
        .from('settlements')
        .update({
          attorney_approved: true,
          attorney_approved_by: staffId,
          attorney_approved_date: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      toast({ title: 'Settlement approved by attorney' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to approve settlement', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAcceptSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('settlements')
        .update({
          status: 'accepted' as SettlementStatus,
          accepted_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      toast({ title: 'Settlement accepted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to accept settlement', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRejectSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('settlements')
        .update({ status: 'rejected' as SettlementStatus })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      toast({ title: 'Settlement rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to reject settlement', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCompleteSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('settlements')
        .update({
          status: 'completed' as SettlementStatus,
          completed_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      toast({ title: 'Settlement marked as completed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to complete settlement', description: error.message, variant: 'destructive' });
    },
  });
}
