import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import type { Tables, Enums } from '@/integrations/supabase/types';

export type CommunicationType = Enums<'communication_type'>;
export type CommunicationDirection = Enums<'communication_direction'>;

export type ClientCommunication = Tables<'client_communications'> & {
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
};

export const COMMUNICATION_TYPES: { value: CommunicationType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
];

export const COMMUNICATION_OUTCOMES: Record<CommunicationType, { value: string; label: string }[]> = {
  call: [
    { value: 'answered', label: 'Answered' },
    { value: 'voicemail', label: 'Voicemail' },
    { value: 'no_answer', label: 'No Answer' },
    { value: 'busy', label: 'Busy' },
  ],
  email: [
    { value: 'sent', label: 'Sent' },
    { value: 'received', label: 'Received' },
    { value: 'bounced', label: 'Bounced' },
  ],
  sms: [
    { value: 'sent', label: 'Sent' },
    { value: 'received', label: 'Received' },
    { value: 'failed', label: 'Failed' },
  ],
  meeting: [
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show', label: 'No Show' },
  ],
  note: [
    { value: 'logged', label: 'Logged' },
  ],
};

interface UseClientCommunicationsOptions {
  realtime?: boolean;
}

export function useClientCommunications(clientId: string | undefined, options?: UseClientCommunicationsOptions) {
  const queryKey = ['client_communications', clientId];

  // Subscribe to realtime updates for this client's communications
  useRealtimeSubscription<Tables<'client_communications'>>({
    table: 'client_communications',
    queryKey,
    filter: clientId ? `client_id=eq.${clientId}` : undefined,
    enabled: (options?.realtime ?? false) && !!clientId,
  });

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_communications')
        .select(`
          *,
          staff:staff(id, first_name, last_name, avatar_url)
        `)
        .eq('client_id', clientId)
        .order('communication_date', { ascending: false });

      if (error) throw error;
      return data as ClientCommunication[];
    },
    enabled: !!clientId,
  });
}

interface CreateCommunicationInput {
  client_id: string;
  communication_type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string;
  notes?: string;
  outcome?: string;
  contact_phone?: string;
  contact_email?: string;
  duration_minutes?: number;
  staff_id?: string;
  communication_date: string;
}

export function useCreateClientCommunication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateCommunicationInput) => {
      const { data, error } = await supabase
        .from('client_communications')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client_communications', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client_activity'] });
      toast({ title: 'Communication logged successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to log communication',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

interface UpdateCommunicationInput {
  id: string;
  client_id: string;
  communication_type?: CommunicationType;
  direction?: CommunicationDirection;
  subject?: string;
  notes?: string;
  outcome?: string;
  contact_phone?: string;
  contact_email?: string;
  duration_minutes?: number;
  communication_date?: string;
}

export function useUpdateClientCommunication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, client_id, ...updates }: UpdateCommunicationInput) => {
      const { data, error } = await supabase
        .from('client_communications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, client_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['client_communications', result.client_id] });
      queryClient.invalidateQueries({ queryKey: ['client_activity'] });
      toast({ title: 'Communication updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update communication',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClientCommunication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_communications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { clientId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['client_communications', result.clientId] });
      queryClient.invalidateQueries({ queryKey: ['client_activity'] });
      toast({ title: 'Communication deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete communication',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });
}
