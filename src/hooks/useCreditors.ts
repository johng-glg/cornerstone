import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

export type Creditor = Tables<'creditors'>;
export type CreditorInsert = Omit<TablesInsert<'creditors'>, 'id' | 'created_at' | 'updated_at'>;
export type CreditorUpdate = TablesUpdate<'creditors'>;
export type CreditorType = Enums<'creditor_type'>;

export function useCreditors(search?: string, type?: CreditorType) {
  return useQuery({
    queryKey: ['creditors', search, type],
    queryFn: async () => {
      let query = supabase
        .from('creditors')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      if (type) {
        query = query.eq('creditor_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Creditor[];
    },
  });
}

export function useCreditor(id: string | undefined) {
  return useQuery({
    queryKey: ['creditor', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('creditors')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Creditor;
    },
    enabled: !!id,
  });
}

export function useCreateCreditor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (creditor: CreditorInsert) => {
      const { data, error } = await supabase
        .from('creditors')
        .insert([creditor])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      toast({ title: 'Creditor created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create creditor', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCreditor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CreditorUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('creditors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      queryClient.invalidateQueries({ queryKey: ['creditor', data.id] });
      toast({ title: 'Creditor updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update creditor', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCreditor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('creditors')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      toast({ title: 'Creditor deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete creditor', description: error.message, variant: 'destructive' });
    },
  });
}
