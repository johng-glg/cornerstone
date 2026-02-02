import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LawFirm {
  id: string;
  name: string;
  phone: string | null;
  fax: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  contact_count?: number;
}

export type LawFirmInsert = Omit<LawFirm, 'id' | 'created_at' | 'updated_at' | 'contact_count'>;
export type LawFirmUpdate = Partial<LawFirmInsert> & { id: string };

export function useLawFirms(search?: string) {
  return useQuery({
    queryKey: ['law_firms', search],
    queryFn: async () => {
      let query = supabase
        .from('law_firms')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Get contact counts for each firm
      const firmsWithCounts = await Promise.all(
        (data || []).map(async (firm) => {
          const { count } = await supabase
            .from('law_firm_contacts')
            .select('*', { count: 'exact', head: true })
            .eq('law_firm_id', firm.id)
            .eq('is_active', true);
          return { ...firm, contact_count: count || 0 };
        })
      );
      
      return firmsWithCounts as LawFirm[];
    },
  });
}

export function useLawFirm(id: string | undefined) {
  return useQuery({
    queryKey: ['law_firm', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('law_firms')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as LawFirm;
    },
    enabled: !!id,
  });
}

export function useCreateLawFirm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (firm: LawFirmInsert) => {
      const { data, error } = await supabase
        .from('law_firms')
        .insert([firm])
        .select()
        .single();
      if (error) throw error;
      return data as LawFirm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['law_firms'] });
      toast({ title: 'Law firm created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create law firm', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLawFirm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LawFirmUpdate) => {
      const { data, error } = await supabase
        .from('law_firms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LawFirm;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['law_firms'] });
      queryClient.invalidateQueries({ queryKey: ['law_firm', data.id] });
      toast({ title: 'Law firm updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update law firm', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLawFirm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('law_firms')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['law_firms'] });
      toast({ title: 'Law firm deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete law firm', description: error.message, variant: 'destructive' });
    },
  });
}
