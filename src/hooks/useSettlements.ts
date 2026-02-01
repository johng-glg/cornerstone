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
    mutationFn: async (settlement: SettlementInsert & { staffId?: string }) => {
      const { staffId, ...settlementData } = settlement;
      const { data, error } = await supabase
        .from('settlements')
        .insert([settlementData])
        .select()
        .single();
      if (error) throw error;
      
      // Log action
      const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.offer_amount);
      await supabase.from('liability_actions').insert({
        liability_id: data.liability_id,
        action_type: 'settlement',
        description: `Settlement offer of ${formattedAmount} created (${data.payment_type === 'lump_sum' ? 'Lump Sum' : `${data.number_of_payments || 1} payments`})`,
        amount: data.offer_amount,
        staff_id: staffId || null,
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      queryClient.invalidateQueries({ queryKey: ['liability_actions', data.liability_id] });
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
    mutationFn: async ({ id, liabilityId, offerAmount, staffId }: { id: string; liabilityId: string; offerAmount: number; staffId: string }) => {
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
      
      // Log action
      const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(offerAmount);
      await supabase.from('liability_actions').insert({
        liability_id: liabilityId,
        action_type: 'settlement',
        description: `Settlement offer of ${formattedAmount} approved by attorney`,
        amount: offerAmount,
        staff_id: staffId,
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      queryClient.invalidateQueries({ queryKey: ['liability_actions', data.liability_id] });
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
    mutationFn: async ({ id, liabilityId, offerAmount, staffId }: { id: string; liabilityId: string; offerAmount: number; staffId?: string }) => {
      // First get the full settlement details
      const { data: settlement, error: settlementError } = await supabase
        .from('settlements')
        .select('*')
        .eq('id', id)
        .single();
      if (settlementError) throw settlementError;

      // Get liability to find client_service_id and enrolled_balance for fee calculation
      const { data: liability, error: liabilityError } = await supabase
        .from('liabilities')
        .select('client_service_id, enrolled_balance')
        .eq('id', liabilityId)
        .single();
      if (liabilityError) throw liabilityError;

      // Get client service for settlement fee percentage
      const { data: clientService, error: csError } = await supabase
        .from('client_services')
        .select('settlement_fee_percentage')
        .eq('id', liability.client_service_id)
        .single();
      if (csError) throw csError;

      // Update settlement status
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

      // Update liability status to settled
      const { error: liabilityUpdateError } = await supabase
        .from('liabilities')
        .update({ status: 'settled' })
        .eq('id', liabilityId);
      if (liabilityUpdateError) throw liabilityUpdateError;

      // Calculate transactions to schedule
      const transactions: Array<{
        client_service_id: string;
        settlement_id: string;
        liability_id: string;
        transaction_type: string;
        amount: number;
        scheduled_date: string;
        status: string;
        sequence_number: number;
        description: string;
      }> = [];

      const numberOfPayments = settlement.number_of_payments || 1;
      const paymentAmount = offerAmount / numberOfPayments;
      const firstPaymentDate = settlement.first_payment_date 
        ? new Date(settlement.first_payment_date) 
        : new Date();

      // Schedule settlement payments (open = scheduled, not yet processed)
      for (let i = 0; i < numberOfPayments; i++) {
        const paymentDate = new Date(firstPaymentDate);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        
        transactions.push({
          client_service_id: liability.client_service_id,
          settlement_id: id,
          liability_id: liabilityId,
          transaction_type: 'settlement_payment',
          amount: paymentAmount,
          scheduled_date: paymentDate.toISOString().split('T')[0],
          status: 'open',
          sequence_number: i + 1,
          description: `Settlement payment ${i + 1} of ${numberOfPayments}`,
        });
      }

      // Calculate contingency fee
      const enrolledBalance = liability.enrolled_balance || offerAmount;
      const feePercentage = (clientService.settlement_fee_percentage || 25) / 100;
      const totalFee = enrolledBalance * feePercentage;
      const feeCollectionMethod = settlement.fee_collection_method || 'split';
      const feeStartOffset = settlement.fee_start_offset_months || 0;

      if (feeCollectionMethod === 'lump_sum') {
        // Single fee after settlement payments complete
        const feeDate = new Date(firstPaymentDate);
        feeDate.setMonth(feeDate.getMonth() + numberOfPayments + feeStartOffset);
        
        transactions.push({
          client_service_id: liability.client_service_id,
          settlement_id: id,
          liability_id: liabilityId,
          transaction_type: 'contingency_fee',
          amount: totalFee,
          scheduled_date: feeDate.toISOString().split('T')[0],
          status: 'open',
          sequence_number: 1,
          description: 'Contingency fee (lump sum)',
        });
      } else {
        // Split fees across settlement payments
        const feePerPayment = totalFee / numberOfPayments;
        for (let i = 0; i < numberOfPayments; i++) {
          const feeDate = new Date(firstPaymentDate);
          feeDate.setMonth(feeDate.getMonth() + i + feeStartOffset);
          
          transactions.push({
            client_service_id: liability.client_service_id,
            settlement_id: id,
            liability_id: liabilityId,
            transaction_type: 'contingency_fee',
            amount: feePerPayment,
            scheduled_date: feeDate.toISOString().split('T')[0],
            status: 'open',
            sequence_number: i + 1,
            description: `Contingency fee ${i + 1} of ${numberOfPayments}`,
          });
        }
      }

      // Insert all transactions
      if (transactions.length > 0) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert(transactions);
        if (txError) throw txError;
      }

      // Log action
      const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(offerAmount);
      await supabase.from('liability_actions').insert({
        liability_id: liabilityId,
        action_type: 'settlement',
        description: `Settlement offer of ${formattedAmount} was accepted. Scheduled ${numberOfPayments} payment(s) and contingency fees.`,
        amount: offerAmount,
        staff_id: staffId || null,
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      queryClient.invalidateQueries({ queryKey: ['liability_actions', data.liability_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled_transactions'] });
      toast({ title: 'Settlement accepted and transactions scheduled' });
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
    mutationFn: async ({ id, liabilityId, staffId }: { id: string; liabilityId: string; staffId?: string }) => {
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
      
      // Log action
      await supabase.from('liability_actions').insert({
        liability_id: liabilityId,
        action_type: 'settlement',
        description: `Settlement marked as completed`,
        staff_id: staffId || null,
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      queryClient.invalidateQueries({ queryKey: ['liability_actions', data.liability_id] });
      toast({ title: 'Settlement marked as completed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to complete settlement', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSettlement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, liabilityId, offerAmount, staffId }: { id: string; liabilityId: string; offerAmount: number; staffId?: string }) => {
      const { data, error } = await supabase
        .from('settlements')
        .update({ status: 'cancelled' as SettlementStatus })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      // Log action
      const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(offerAmount);
      await supabase.from('liability_actions').insert({
        liability_id: liabilityId,
        action_type: 'settlement',
        description: `Settlement offer of ${formattedAmount} was deleted`,
        amount: offerAmount,
        staff_id: staffId || null,
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlements', data.liability_id] });
      queryClient.invalidateQueries({ queryKey: ['liability_actions', data.liability_id] });
      toast({ title: 'Settlement deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete settlement', description: error.message, variant: 'destructive' });
    },
  });
}
