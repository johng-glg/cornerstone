import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

export type Contact = Tables<'contacts'> & {
  phones?: Tables<'contact_phones'>[];
  addresses?: Tables<'contact_addresses'>[];
};

export type ContactInsert = Omit<TablesInsert<'contacts'>, 'id' | 'created_at' | 'updated_at'>;
export type ContactUpdate = TablesUpdate<'contacts'>;
export type PhoneType = Enums<'phone_type'>;
export type AddressType = Enums<'address_type'>;

export function useContacts(search?: string) {
  return useQuery({
    queryKey: ['contacts', search],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select(`
          *,
          phones:contact_phones(*),
          addresses:contact_addresses(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contact[];
    },
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          phones:contact_phones(*),
          addresses:contact_addresses(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Contact;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contact: ContactInsert) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert([contact])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Contact created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create contact', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ContactUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', data.id] });
      toast({ title: 'Contact updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update contact', description: error.message, variant: 'destructive' });
    },
  });
}

// Phone hooks
export function useCreateContactPhone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (phone: TablesInsert<'contact_phones'>) => {
      const { data, error } = await supabase
        .from('contact_phones')
        .insert([phone])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact', data.contact_id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Phone added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add phone', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteContactPhone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from('contact_phones')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Phone removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove phone', description: error.message, variant: 'destructive' });
    },
  });
}

// Address hooks
export function useCreateContactAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (address: TablesInsert<'contact_addresses'>) => {
      const { data, error } = await supabase
        .from('contact_addresses')
        .insert([address])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact', data.contact_id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Address added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add address', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteContactAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from('contact_addresses')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return contactId;
    },
    onSuccess: (contactId) => {
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: 'Address removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove address', description: error.message, variant: 'destructive' });
    },
  });
}
