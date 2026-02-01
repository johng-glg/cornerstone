import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

export type Liability = Tables<'liabilities'> & {
  original_creditor?: Tables<'creditors'> | null;
  current_creditor?: Tables<'creditors'> | null;
  client_service?: Tables<'client_services'> & {
    primary_client?: Tables<'clients'> | null;
  };
};

export type LiabilityInsert = Omit<TablesInsert<'liabilities'>, 'id' | 'created_at' | 'updated_at'>;
export type LiabilityUpdate = TablesUpdate<'liabilities'>;
export type LiabilityStatus = Enums<'liability_status'>;
export type LiabilityType = Enums<'liability_type'>;

export function useLiabilities(status?: LiabilityStatus, type?: LiabilityType, clientServiceId?: string) {
  return useQuery({
    queryKey: ['liabilities', status, type, clientServiceId],
    queryFn: async () => {
      let query = supabase
        .from('liabilities')
        .select(`
          *,
          original_creditor:creditors!liabilities_original_creditor_id_fkey(id, name, creditor_type),
          current_creditor:creditors!liabilities_current_creditor_id_fkey(id, name, creditor_type),
          client_service:client_services!liabilities_engagement_id_fkey(
            id, 
            service_number, 
            status,
            primary_client:clients!engagements_primary_contact_id_fkey(id, first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (type) {
        query = query.eq('liability_type', type);
      }

      if (clientServiceId) {
        query = query.eq('client_service_id', clientServiceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Liability[];
    },
  });
}

export function useLiability(id: string | undefined) {
  return useQuery({
    queryKey: ['liability', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('liabilities')
        .select(`
          *,
          original_creditor:creditors!liabilities_original_creditor_id_fkey(*),
          current_creditor:creditors!liabilities_current_creditor_id_fkey(*),
          client_service:client_services!liabilities_engagement_id_fkey(
            id, 
            service_number, 
            status,
            primary_client:clients!engagements_primary_contact_id_fkey(id, first_name, last_name, email)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Liability;
    },
    enabled: !!id,
  });
}

export function useCreateLiability() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (liability: LiabilityInsert) => {
      const { data, error } = await supabase
        .from('liabilities')
        .insert([liability])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      toast({ title: 'Liability created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create liability', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLiability() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LiabilityUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('liabilities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['liability', data.id] });
      toast({ title: 'Liability updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update liability', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLiabilityStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LiabilityStatus }) => {
      const { data, error } = await supabase
        .from('liabilities')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['liability', data.id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    },
  });
}
