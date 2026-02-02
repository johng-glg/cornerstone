import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  PaymentSchedule, 
  PaymentScheduleInsert, 
  PaymentScheduleUpdate,
  PaymentScheduleWithService,
  ScheduleSummary,
  ScheduleGenerationParams,
  PaymentFrequency,
} from '@/types/paymentSchedule';
import { 
  generateScheduleTransactions, 
  calculateTotalDrafts,
  calculateCompletionDate,
} from '@/lib/scheduleGenerator';

// Fetch payment schedule for a service
export function usePaymentSchedule(clientServiceId: string | undefined) {
  return useQuery({
    queryKey: ['payment-schedule', clientServiceId],
    queryFn: async () => {
      if (!clientServiceId) return null;
      
      const { data, error } = await supabase
        .from('payment_schedules')
        .select(`
          *,
          client_service:client_services!payment_schedules_client_service_id_fkey(
            id,
            service_number,
            primary_client:clients!engagements_primary_contact_id_fkey(
              id,
              first_name,
              last_name
            )
          )
        `)
        .eq('client_service_id', clientServiceId)
        .maybeSingle();
      
      if (error) throw error;
      return data as PaymentScheduleWithService | null;
    },
    enabled: !!clientServiceId,
  });
}

// Fetch schedule summary with transaction counts
export function useScheduleSummary(clientServiceId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-summary', clientServiceId],
    queryFn: async (): Promise<ScheduleSummary | null> => {
      if (!clientServiceId) return null;
      
      // Fetch schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('client_service_id', clientServiceId)
        .maybeSingle();
      
      if (scheduleError) throw scheduleError;
      if (!schedule) return null;
      
      // Fetch transaction counts by status
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id, status, scheduled_date')
        .eq('client_service_id', clientServiceId)
        .eq('transaction_type', 'draft')
        .not('scheduled_date', 'is', null);
      
      if (txError) throw txError;
      
      const now = new Date();
      const draftsCleared = transactions?.filter(t => t.status === 'cleared').length || 0;
      const draftsPending = transactions?.filter(t => t.status === 'pending').length || 0;
      const draftsCancelled = transactions?.filter(t => t.status === 'cancelled').length || 0;
      
      // Find next draft date
      const upcomingDrafts = transactions
        ?.filter(t => t.status === 'open' && new Date(t.scheduled_date!) >= now)
        .sort((a, b) => new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime());
      
      const nextDraftDate = upcomingDrafts?.[0]?.scheduled_date 
        ? new Date(upcomingDrafts[0].scheduled_date) 
        : null;
      
      const completionDate = calculateCompletionDate(
        new Date(schedule.first_draft_date),
        schedule.frequency as PaymentFrequency,
        Math.ceil(schedule.total_drafts / (schedule.frequency === 'monthly' ? 1 : schedule.frequency === 'semi_monthly' ? 2 : 26/12))
      );
      
      return {
        id: schedule.id,
        frequency: schedule.frequency as PaymentFrequency,
        draftAmount: Number(schedule.draft_amount),
        processorFeeAmount: Number(schedule.processor_fee_amount),
        totalDrafts: schedule.total_drafts,
        draftsGenerated: schedule.drafts_generated,
        draftsCleared,
        draftsPending,
        draftsCancelled,
        nextDraftDate,
        progressPercentage: Math.round((draftsCleared / schedule.total_drafts) * 100),
        status: schedule.status as any,
        firstDraftDate: new Date(schedule.first_draft_date),
        estimatedCompletionDate: completionDate,
      };
    },
    enabled: !!clientServiceId,
  });
}

// Create payment schedule and generate transactions
export function useCreatePaymentSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: ScheduleGenerationParams) => {
      const { clientServiceId, firstDraftDate, frequency, termMonths, draftAmount, processorFeeAmount = 10 } = params;
      
      const totalDrafts = calculateTotalDrafts(frequency, termMonths);
      
      // 1. Create the schedule record
      const { data: schedule, error: scheduleError } = await supabase
        .from('payment_schedules')
        .insert({
          client_service_id: clientServiceId,
          frequency,
          draft_amount: draftAmount,
          processor_fee_amount: processorFeeAmount,
          first_draft_date: firstDraftDate.toISOString().split('T')[0],
          total_drafts: totalDrafts,
          drafts_generated: totalDrafts,
          last_generated_date: new Date().toISOString().split('T')[0],
          status: 'active',
        })
        .select()
        .single();
      
      if (scheduleError) throw scheduleError;
      
      // 2. Generate all transactions
      const transactions = generateScheduleTransactions(params);
      
      // 3. Add schedule_id to all transactions
      const transactionsWithSchedule = transactions.map(t => ({
        ...t,
        schedule_id: schedule.id,
      }));
      
      // 4. Insert drafts first, then fees with parent references
      const drafts = transactionsWithSchedule.filter(t => t.transaction_type === 'draft');
      const fees = transactionsWithSchedule.filter(t => t.transaction_type === 'processor_fee');
      
      // Insert all drafts
      const { data: insertedDrafts, error: draftError } = await supabase
        .from('transactions')
        .insert(drafts)
        .select('id, sequence_number');
      
      if (draftError) throw draftError;
      
      // Map fees to their parent drafts
      const feesWithParents = fees.map(fee => {
        const parentDraft = insertedDrafts?.find(d => d.sequence_number === fee.sequence_number);
        return {
          ...fee,
          parent_transaction_id: parentDraft?.id || null,
        };
      });
      
      // Insert all fees
      const { error: feeError } = await supabase
        .from('transactions')
        .insert(feesWithParents);
      
      if (feeError) throw feeError;
      
      // 5. Update service with first_draft_date
      await supabase
        .from('client_services')
        .update({ first_draft_date: firstDraftDate.toISOString().split('T')[0] })
        .eq('id', clientServiceId);
      
      return schedule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['client-service'] });
      toast({ title: `Payment schedule created with ${data.total_drafts} drafts` });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to create payment schedule', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Update schedule configuration
export function useUpdatePaymentSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PaymentScheduleUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-summary'] });
      toast({ title: 'Payment schedule updated' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to update schedule', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Pause or resume schedule
export function usePausePaymentSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, pause }: { id: string; pause: boolean }) => {
      const { data, error } = await supabase
        .from('payment_schedules')
        .update({ status: pause ? 'paused' : 'active' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-summary'] });
      toast({ title: `Payment schedule ${data.status === 'paused' ? 'paused' : 'resumed'}` });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to update schedule status', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Cancel remaining schedule (mark as cancelled and cancel open transactions)
export function useCancelPaymentSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      // Update schedule status
      const { error: scheduleError } = await supabase
        .from('payment_schedules')
        .update({ status: 'cancelled' })
        .eq('id', scheduleId);
      
      if (scheduleError) throw scheduleError;
      
      // Cancel all open transactions for this schedule
      const { error: txError } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('schedule_id', scheduleId)
        .eq('status', 'open');
      
      if (txError) throw txError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Payment schedule cancelled' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to cancel schedule', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Skip a specific draft (cancel it and its processor fee)
export function useSkipDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      // Cancel the draft
      const { error: draftError } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('id', transactionId);
      
      if (draftError) throw draftError;
      
      // Cancel the associated processor fee
      const { error: feeError } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('parent_transaction_id', transactionId);
      
      if (feeError) throw feeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-summary'] });
      toast({ title: 'Draft skipped' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to skip draft', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Reschedule a specific draft
export function useRescheduleDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ transactionId, newDate }: { transactionId: string; newDate: Date }) => {
      const formattedDate = newDate.toISOString().split('T')[0];
      const feeDate = new Date(newDate);
      feeDate.setDate(feeDate.getDate() + 1);
      const formattedFeeDate = feeDate.toISOString().split('T')[0];
      
      // Update the draft
      const { error: draftError } = await supabase
        .from('transactions')
        .update({ scheduled_date: formattedDate })
        .eq('id', transactionId);
      
      if (draftError) throw draftError;
      
      // Update the associated processor fee
      const { error: feeError } = await supabase
        .from('transactions')
        .update({ scheduled_date: formattedFeeDate })
        .eq('parent_transaction_id', transactionId);
      
      if (feeError) throw feeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-summary'] });
      toast({ title: 'Draft rescheduled' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to reschedule draft', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}
