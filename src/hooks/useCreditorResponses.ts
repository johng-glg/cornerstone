import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

export type CreditorResponseChannel = 'email' | 'phone' | 'letter' | 'fax' | 'portal' | 'other';
export type CreditorResponseDirection = 'inbound' | 'outbound';
export type CreditorResponseSentiment = 'positive' | 'neutral' | 'negative';

export interface CreditorResponse {
  id: string;
  company_id: string;
  creditor_id: string;
  liability_id: string | null;
  client_service_id: string | null;
  outbound_reference_id: string | null;
  direction: CreditorResponseDirection;
  channel: CreditorResponseChannel;
  sentiment: CreditorResponseSentiment | null;
  subject: string | null;
  body: string | null;
  summary: string | null;
  received_at: string;
  response_time_hours: number | null;
  attachments: any;
  logged_by: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface ListFilter {
  creditorId?: string | null;
  liabilityId?: string | null;
  serviceId?: string | null;
}

export function useCreditorResponses(filter: ListFilter) {
  return useQuery({
    queryKey: ['creditor-responses', filter],
    enabled: Boolean(filter.creditorId || filter.liabilityId || filter.serviceId),
    queryFn: async () => {
      let q = supabase
        .from('creditor_responses' as any)
        .select('*')
        .order('received_at', { ascending: false });
      if (filter.creditorId) q = q.eq('creditor_id', filter.creditorId);
      if (filter.liabilityId) q = q.eq('liability_id', filter.liabilityId);
      if (filter.serviceId) q = q.eq('client_service_id', filter.serviceId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CreditorResponse[];
    },
  });
}

export function useCreateCreditorResponse() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { staff } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<CreditorResponse>) => {
      if (!staff?.company_id) throw new Error('Missing company');
      const payload = {
        company_id: staff.company_id,
        logged_by: staff.id,
        direction: 'inbound' as CreditorResponseDirection,
        channel: 'email' as CreditorResponseChannel,
        ...input,
      };
      const { data, error } = await supabase
        .from('creditor_responses' as any)
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CreditorResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creditor-responses'] });
      toast({ title: 'Response logged' });
    },
    onError: (e: Error) => toast({ title: 'Failed to log response', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteCreditorResponse() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('creditor_responses' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['creditor-responses'] });
      toast({ title: 'Response deleted' });
    },
    onError: (e: Error) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });
}
