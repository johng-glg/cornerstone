import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LawFirmContact {
  id: string;
  law_firm_id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  law_firm?: {
    id: string;
    name: string;
  } | null;
}

export type LawFirmContactInsert = Omit<LawFirmContact, 'id' | 'created_at' | 'updated_at' | 'law_firm'>;
export type LawFirmContactUpdate = Partial<LawFirmContactInsert> & { id: string };

export function useLawFirmContacts(lawFirmId?: string) {
  return useQuery({
    queryKey: ['law_firm_contacts', lawFirmId],
    queryFn: async () => {
      let query = supabase
        .from('law_firm_contacts')
        .select(`
          *,
          law_firm:law_firms(id, name)
        `)
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (lawFirmId) {
        query = query.eq('law_firm_id', lawFirmId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LawFirmContact[];
    },
    enabled: lawFirmId ? !!lawFirmId : true,
  });
}

export function useLawFirmContact(id: string | undefined) {
  return useQuery({
    queryKey: ['law_firm_contact', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('law_firm_contacts')
        .select(`
          *,
          law_firm:law_firms(id, name)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as LawFirmContact;
    },
    enabled: !!id,
  });
}

export function useCreateLawFirmContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contact: LawFirmContactInsert) => {
      const { data, error } = await supabase
        .from('law_firm_contacts')
        .insert([contact])
        .select()
        .single();
      if (error) throw error;
      return data as LawFirmContact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['law_firm_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['law_firms'] }); // Refresh contact counts
      toast({ title: 'Contact created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create contact', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLawFirmContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LawFirmContactUpdate) => {
      const { data, error } = await supabase
        .from('law_firm_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LawFirmContact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['law_firm_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['law_firm_contact', data.id] });
      toast({ title: 'Contact updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update contact', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLawFirmContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('law_firm_contacts')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['law_firm_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['law_firms'] }); // Refresh contact counts
      toast({ title: 'Contact deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete contact', description: error.message, variant: 'destructive' });
    },
  });
}
