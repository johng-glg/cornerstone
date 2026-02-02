import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LitigationHearing {
  id: string;
  matter_id: string;
  hearing_type: string;
  scheduled_date: string;
  end_date: string | null;
  location: string | null;
  judge_name: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type LitigationHearingInsert = Omit<LitigationHearing, 'id' | 'created_at' | 'updated_at'>;
export type LitigationHearingUpdate = Partial<LitigationHearingInsert> & { id: string };

export function useLitigationHearings(matterId: string | undefined) {
  return useQuery({
    queryKey: ['litigation_hearings', matterId],
    queryFn: async () => {
      if (!matterId) return [];
      const { data, error } = await supabase
        .from('litigation_hearings')
        .select('*')
        .eq('matter_id', matterId)
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data as LitigationHearing[];
    },
    enabled: !!matterId,
  });
}

export function useCreateLitigationHearing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (hearing: LitigationHearingInsert) => {
      const { data, error } = await supabase
        .from('litigation_hearings')
        .insert([hearing])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['litigation_hearings', data.matter_id] });
      toast({ title: 'Hearing scheduled' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to schedule hearing', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLitigationHearing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LitigationHearingUpdate) => {
      const { data, error } = await supabase
        .from('litigation_hearings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['litigation_hearings', data.matter_id] });
      toast({ title: 'Hearing updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update hearing', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLitigationHearing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, matterId }: { id: string; matterId: string }) => {
      const { error } = await supabase
        .from('litigation_hearings')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { matterId };
    },
    onSuccess: ({ matterId }) => {
      queryClient.invalidateQueries({ queryKey: ['litigation_hearings', matterId] });
      toast({ title: 'Hearing deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete hearing', description: error.message, variant: 'destructive' });
    },
  });
}
