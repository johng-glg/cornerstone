import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CreditorContact {
  id: string;
  creditor_id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creditor?: {
    id: string;
    name: string;
  } | null;
}

export type CreditorContactInsert = Omit<CreditorContact, 'id' | 'created_at' | 'updated_at' | 'creditor'>;
export type CreditorContactUpdate = Partial<CreditorContactInsert> & { id: string };

export function useCreditorContacts(creditorId?: string) {
  return useQuery({
    queryKey: ['creditor_contacts', creditorId],
    queryFn: async () => {
      let query = supabase
        .from('creditor_contacts')
        .select(`
          *,
          creditor:creditors(id, name)
        `)
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (creditorId) {
        query = query.eq('creditor_id', creditorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CreditorContact[];
    },
    enabled: creditorId ? !!creditorId : true,
  });
}

export function useCreditorContact(id: string | undefined) {
  return useQuery({
    queryKey: ['creditor_contact', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('creditor_contacts')
        .select(`
          *,
          creditor:creditors(id, name)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as CreditorContact;
    },
    enabled: !!id,
  });
}

export function useCreateCreditorContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contact: CreditorContactInsert) => {
      const { data, error } = await supabase
        .from('creditor_contacts')
        .insert([contact])
        .select()
        .single();
      if (error) throw error;
      return data as CreditorContact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['creditor_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      toast({ title: 'Contact created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create contact', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCreditorContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CreditorContactUpdate) => {
      const { data, error } = await supabase
        .from('creditor_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CreditorContact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['creditor_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['creditor_contact', data.id] });
      toast({ title: 'Contact updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update contact', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCreditorContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('creditor_contacts')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditor_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      toast({ title: 'Contact deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete contact', description: error.message, variant: 'destructive' });
    },
  });
}
