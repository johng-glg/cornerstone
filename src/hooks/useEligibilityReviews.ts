import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentStaff } from '@/hooks/useStaff';

export interface EligibilityFlag {
  code: string;
  label: string;
  severity: 'info' | 'warning' | 'critical';
  details: string;
}

export interface EligibilityReview {
  id: string;
  lead_id: string;
  status: string;
  submitted_by: string | null;
  reviewed_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  decline_reason: string | null;
  flags: EligibilityFlag[];
  created_at: string;
  updated_at: string;
  // Joined
  lead?: {
    id: string;
    first_name: string;
    last_name: string;
    lead_number: string;
    estimated_debt_amount: number | null;
    phone: string | null;
    email: string | null;
  } | null;
  submitted_staff?: { first_name: string; last_name: string } | null;
  reviewed_staff?: { first_name: string; last_name: string } | null;
}

export function useEligibilityReviews(status?: string) {
  return useQuery({
    queryKey: ['eligibility-reviews', status],
    queryFn: async () => {
      let query = (supabase as any)
        .from('eligibility_reviews')
        .select(`
          *,
          lead:leads!eligibility_reviews_lead_id_fkey(id, first_name, last_name, lead_number, estimated_debt_amount, phone, email),
          submitted_staff:staff!eligibility_reviews_submitted_by_fkey(first_name, last_name),
          reviewed_staff:staff!eligibility_reviews_reviewed_by_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        flags: Array.isArray(r.flags) ? r.flags : [],
      })) as EligibilityReview[];
    },
  });
}

export function useEligibilityReviewForLead(leadId: string | undefined) {
  return useQuery({
    queryKey: ['eligibility-review', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await (supabase as any)
        .from('eligibility_reviews')
        .select(`
          *,
          submitted_staff:staff!eligibility_reviews_submitted_by_fkey(first_name, last_name),
          reviewed_staff:staff!eligibility_reviews_reviewed_by_fkey(first_name, last_name)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        flags: Array.isArray(data.flags) ? data.flags : [],
      } as EligibilityReview;
    },
    enabled: !!leadId,
  });
}

export function useSubmitForReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: currentStaff } = useCurrentStaff();

  return useMutation({
    mutationFn: async (leadId: string) => {
      // Call the simulate-underwriting edge function
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'simulate-underwriting',
        { body: { lead_id: leadId } }
      );
      if (fnError) throw fnError;

      const flags = fnData?.flags || [];

      // Create the eligibility review record
      const { data, error } = await (supabase as any)
        .from('eligibility_reviews')
        .insert({
          lead_id: leadId,
          status: 'pending',
          submitted_by: currentStaff?.id || null,
          flags,
        })
        .select()
        .single();
      if (error) throw error;

      // Update lead status to eligibility_review
      const { error: statusError } = await supabase
        .from('leads')
        .update({ status: 'eligibility_review' as any })
        .eq('id', leadId);
      if (statusError) throw statusError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eligibility-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['eligibility-review'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      toast({ title: 'Submitted for eligibility review' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to submit for review', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReviewDecision() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: currentStaff } = useCurrentStaff();

  return useMutation({
    mutationFn: async ({
      reviewId,
      decision,
      notes,
      declineReason,
    }: {
      reviewId: string;
      decision: 'approved' | 'declined';
      notes?: string;
      declineReason?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from('eligibility_reviews')
        .update({
          status: decision,
          reviewed_by: currentStaff?.id || null,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
          decline_reason: decision === 'declined' ? declineReason || null : null,
        })
        .eq('id', reviewId)
        .select('*, lead:leads!eligibility_reviews_lead_id_fkey(id)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eligibility-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['eligibility-review'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      toast({ title: 'Review decision saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save decision', description: error.message, variant: 'destructive' });
    },
  });
}
