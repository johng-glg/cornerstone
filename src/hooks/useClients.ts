import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';
import type { ClientStatus } from '@/types/serviceStatus';

export type Client = Tables<'clients'> & {
  phones?: Tables<'client_phones'>[];
  addresses?: Tables<'client_addresses'>[];
};

export type ClientInsert = Omit<TablesInsert<'clients'>, 'id' | 'created_at' | 'updated_at'>;
export type ClientUpdate = TablesUpdate<'clients'>;
export type PhoneType = Enums<'phone_type'>;
export type AddressType = Enums<'address_type'>;
export type { ClientStatus };

export function useClients(search?: string, statusFilter?: ClientStatus) {
  return useQuery({
    queryKey: ['clients', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select(`
          *,
          phones:client_phones(*),
          addresses:client_addresses(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          phones:client_phones(*),
          addresses:client_addresses(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      const { data, error } = await supabase
        .from('clients')
        .insert([client])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Client created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create client', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', data.id] });
      toast({ title: 'Client updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update client', description: error.message, variant: 'destructive' });
    },
  });
}

// Phone hooks
export function useCreateClientPhone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (phone: TablesInsert<'client_phones'>) => {
      const { data, error } = await supabase
        .from('client_phones')
        .insert([phone])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Phone added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add phone', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteClientPhone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_phones')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Phone removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove phone', description: error.message, variant: 'destructive' });
    },
  });
}

// Address hooks
export function useCreateClientAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (address: TablesInsert<'client_addresses'>) => {
      const { data, error } = await supabase
        .from('client_addresses')
        .insert([address])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client', data.client_id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Address added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add address', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteClientAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_addresses')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Address removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove address', description: error.message, variant: 'destructive' });
    },
  });
}
