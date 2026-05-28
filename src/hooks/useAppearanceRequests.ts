import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AppearanceRequestStatus = 'pending' | 'approved' | 'assigned' | 'completed' | 'cancelled';

export interface AppearanceRequest {
  id: string;
  matter_id: string;
  hearing_id: string | null;
  requested_date: string;
  appearance_date: string;
  court_name: string | null;
  description: string;
  status: AppearanceRequestStatus;
  assigned_to: string | null;
  requested_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_staff?: { first_name: string; last_name: string } | null;
  requested_staff?: { first_name: string; last_name: string } | null;
}

export function useAppearanceRequests(matterId: string | undefined) {
  return useQuery({
    queryKey: ['appearance_requests', matterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appearance_requests')
        .select(`
          *,
          assigned_staff:staff!appearance_requests_assigned_to_fkey(first_name, last_name),
          requested_staff:staff!appearance_requests_requested_by_fkey(first_name, last_name)
        `)
        .eq('matter_id', matterId!)
        .order('appearance_date', { ascending: false });
      if (error) throw error;
      return data as AppearanceRequest[];
    },
    enabled: !!matterId,
  });
}

export function useCreateAppearanceRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (req: Omit<AppearanceRequest, 'id' | 'created_at' | 'updated_at' | 'assigned_staff' | 'requested_staff'>) => {
      const { data, error } = await supabase.from('appearance_requests').insert([req]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['appearance_requests', vars.matter_id] });
      toast({ title: 'Appearance request created' });
    },
    onError: (e: Error) => toast({ title: 'Failed to create request', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateAppearanceRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AppearanceRequest> & { id: string }) => {
      const { data, error } = await supabase.from('appearance_requests').update(updates as never).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['appearance_requests', data.matter_id] });
      toast({ title: 'Appearance request updated' });
    },
    onError: (e: Error) => toast({ title: 'Failed to update request', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteAppearanceRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, matterId }: { id: string; matterId: string }) => {
      const { error } = await supabase.from('appearance_requests').delete().eq('id', id);
      if (error) throw error;
      return matterId;
    },
    onSuccess: (matterId) => {
      qc.invalidateQueries({ queryKey: ['appearance_requests', matterId] });
      toast({ title: 'Appearance request deleted' });
    },
    onError: (e: Error) => toast({ title: 'Failed to delete request', description: e.message, variant: 'destructive' }),
  });
}
