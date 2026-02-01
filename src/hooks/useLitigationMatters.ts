import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type LitigationStatus = 
  | 'new'
  | 'pre_response'
  | 'post_response'
  | 'settled'
  | 'dropped'
  | 'judgment'
  | 'declined'
  | 'dismissed';

export interface LitigationMatter {
  id: string;
  liability_id: string;
  client_service_id: string;
  case_number: string | null;
  court_name: string | null;
  county: string | null;
  state: string | null;
  opposing_party: string | null;
  opposing_counsel: string | null;
  status: LitigationStatus;
  service_date: string | null;
  response_deadline: string | null;
  next_hearing_date: string | null;
  judgment_amount: number | null;
  settlement_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  liability?: {
    id: string;
    liability_type: string;
    current_balance: number | null;
    current_creditor?: { name: string } | null;
    original_creditor?: { name: string } | null;
  } | null;
  client_service?: {
    id: string;
    service_number: string;
    primary_client?: {
      id: string;
      first_name: string;
      last_name: string;
    } | null;
  } | null;
}

export type LitigationMatterInsert = Omit<LitigationMatter, 'id' | 'created_at' | 'updated_at' | 'liability' | 'client_service'>;
export type LitigationMatterUpdate = Partial<LitigationMatterInsert> & { id: string };

export function useLitigationMatters(clientServiceId?: string) {
  return useQuery({
    queryKey: ['litigation_matters', clientServiceId],
    queryFn: async () => {
      let query = supabase
        .from('litigation_matters')
        .select(`
          *,
          liability:liabilities(
            id,
            liability_type,
            current_balance,
            current_creditor:creditors!liabilities_current_creditor_id_fkey(name),
            original_creditor:creditors!liabilities_original_creditor_id_fkey(name)
          ),
          client_service:client_services!litigation_matters_client_service_id_fkey(
            id,
            service_number,
            primary_client:clients!engagements_primary_contact_id_fkey(id, first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (clientServiceId) {
        query = query.eq('client_service_id', clientServiceId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LitigationMatter[];
    },
    enabled: clientServiceId ? !!clientServiceId : true,
  });
}

export function useLitigationMattersForClient(clientId: string) {
  return useQuery({
    queryKey: ['litigation_matters', 'client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('litigation_matters')
        .select(`
          *,
          liability:liabilities(
            id,
            liability_type,
            current_balance,
            account_number,
            current_creditor:creditors!liabilities_current_creditor_id_fkey(name),
            original_creditor:creditors!liabilities_original_creditor_id_fkey(name)
          ),
          client_service:client_services!litigation_matters_client_service_id_fkey(
            id,
            service_number,
            primary_client_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter to only matters for services belonging to this client
      return (data as LitigationMatter[]).filter(
        matter => (matter.client_service as any)?.primary_client_id === clientId
      );
    },
    enabled: !!clientId,
  });
}

export function useLitigationMatter(id: string | undefined) {
  return useQuery({
    queryKey: ['litigation_matter', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('litigation_matters')
        .select(`
          *,
          liability:liabilities(
            id,
            liability_type,
            current_balance,
            current_creditor:creditors!liabilities_current_creditor_id_fkey(name),
            original_creditor:creditors!liabilities_original_creditor_id_fkey(name)
          ),
          client_service:client_services!litigation_matters_client_service_id_fkey(
            id,
            service_number,
            primary_client:clients!engagements_primary_contact_id_fkey(id, first_name, last_name)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as LitigationMatter;
    },
    enabled: !!id,
  });
}

export function useCreateLitigationMatter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (matter: LitigationMatterInsert) => {
      const { data, error } = await supabase
        .from('litigation_matters')
        .insert([matter])
        .select()
        .single();
      if (error) throw error;
      
      // Update liability status to in_litigation
      await supabase
        .from('liabilities')
        .update({ status: 'in_litigation' })
        .eq('id', matter.liability_id);
      
      // Log the initial activity
      await supabase
        .from('litigation_activities')
        .insert([{
          matter_id: data.id,
          activity_type: 'status_change',
          description: 'Litigation matter created',
          outcome: `Initial status: ${matter.status || 'new'}`,
        }]);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['litigation_matters'] });
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['litigation_activities', data.id] });
      toast({ title: 'Litigation matter created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create litigation matter', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLitigationMatter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: LitigationMatterUpdate) => {
      const { data, error } = await supabase
        .from('litigation_matters')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['litigation_matters'] });
      queryClient.invalidateQueries({ queryKey: ['litigation_matter', data.id] });
      toast({ title: 'Litigation matter updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update litigation matter', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLitigationMatter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('litigation_matters')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['litigation_matters'] });
      toast({ title: 'Litigation matter deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete litigation matter', description: error.message, variant: 'destructive' });
    },
  });
}