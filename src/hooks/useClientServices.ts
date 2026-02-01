import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useRecordStatusChange } from './useServiceStatusHistory';
import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';
import type { 
  PrimaryServiceStatus, 
  PaymentStatus, 
  ContactStatus, 
  RetentionType 
} from '@/types/serviceStatus';

export type ClientService = Tables<'client_services'> & {
  primary_client?: Tables<'clients'> | null;
  client_service_clients?: (Tables<'client_service_clients'> & {
    client?: Tables<'clients'>;
  })[];
  client_service_types?: (Tables<'client_service_types'> & {
    service?: Tables<'services'>;
  })[];
};

export type ClientServiceInsert = Omit<TablesInsert<'client_services'>, 'id' | 'created_at' | 'updated_at' | 'service_number'>;
export type ClientServiceUpdate = TablesUpdate<'client_services'>;
export type ServiceStatus = Enums<'service_status'>;
export type ClientRelationship = Enums<'client_relationship'>;

// Re-export status types for convenience
export type { PrimaryServiceStatus, PaymentStatus, ContactStatus, RetentionType };

// Filter interface for multi-dimensional filtering
export interface ServiceFilters {
  primaryStatus?: PrimaryServiceStatus;
  paymentStatus?: PaymentStatus;
  contactStatus?: ContactStatus;
  retentionFlag?: boolean;
}

export function useClientServices(filters?: ServiceFilters) {
  return useQuery({
    queryKey: ['client_services', filters],
    queryFn: async () => {
      let query = supabase
        .from('client_services')
        .select(`
          *,
          primary_client:clients!engagements_primary_contact_id_fkey(id, first_name, last_name, email),
          client_service_types(
            *,
            service:services(id, name, service_type)
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.primaryStatus) {
        query = query.eq('status', filters.primaryStatus);
      }
      if (filters?.paymentStatus) {
        query = query.eq('payment_status', filters.paymentStatus);
      }
      if (filters?.contactStatus) {
        query = query.eq('contact_status', filters.contactStatus);
      }
      if (filters?.retentionFlag !== undefined) {
        query = query.eq('retention_flag', filters.retentionFlag);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        primary_client: Array.isArray(item.primary_client) ? item.primary_client[0] : item.primary_client,
      })) as ClientService[];
    },
  });
}

export function useClientService(id: string | undefined) {
  return useQuery({
    queryKey: ['client_service', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('client_services')
        .select(`
          *,
          primary_client:clients!engagements_primary_contact_id_fkey(id, first_name, last_name, email),
          client_service_clients(
            *,
            client:clients(id, first_name, last_name, email)
          ),
          client_service_types(
            *,
            service:services(id, name, service_type)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return {
        ...data,
        primary_client: Array.isArray(data.primary_client) ? data.primary_client[0] : data.primary_client,
      } as ClientService;
    },
    enabled: !!id,
  });
}

export function useCreateClientService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientService: ClientServiceInsert) => {
      const { data, error } = await supabase
        .from('client_services')
        .insert([{ ...clientService, service_number: '' }] as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_services'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Service created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create service', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateClientService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClientServiceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('client_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client_services'] });
      queryClient.invalidateQueries({ queryKey: ['client_service', data.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Service updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update service', description: error.message, variant: 'destructive' });
    },
  });
}

// Update primary status with history tracking
export function useUpdatePrimaryStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const recordStatusChange = useRecordStatusChange();

  return useMutation({
    mutationFn: async ({ 
      id, 
      oldStatus,
      newStatus, 
      reason 
    }: { 
      id: string; 
      oldStatus: string;
      newStatus: PrimaryServiceStatus; 
      reason: string;
    }) => {
      const updates: any = { 
        status: newStatus,
        primary_status_changed_at: new Date().toISOString(),
      };
      
      // Set payment_status when becoming active
      if (newStatus === 'active') {
        updates.enrolled_date = new Date().toISOString();
        updates.program_start_date = new Date().toISOString().split('T')[0];
        updates.payment_status = 'current';
      } else {
        // Clear payment status when not active
        updates.payment_status = null;
      }
      
      if (newStatus === 'graduated' || newStatus === 'dropped' || newStatus === 'cancelled') {
        updates.closed_date = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('client_services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      // Record in history
      await recordStatusChange.mutateAsync({
        clientServiceId: id,
        dimension: 'primary',
        oldValue: oldStatus,
        newValue: newStatus,
        reason,
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client_services'] });
      queryClient.invalidateQueries({ queryKey: ['client_service', data.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: 'Status updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    },
  });
}

// Update payment status with history tracking
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const recordStatusChange = useRecordStatusChange();

  return useMutation({
    mutationFn: async ({ 
      id, 
      oldStatus,
      newStatus, 
      reason 
    }: { 
      id: string; 
      oldStatus: string | null;
      newStatus: PaymentStatus; 
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('client_services')
        .update({ 
          payment_status: newStatus,
          payment_status_changed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      await recordStatusChange.mutateAsync({
        clientServiceId: id,
        dimension: 'payment',
        oldValue: oldStatus,
        newValue: newStatus,
        reason,
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client_services'] });
      queryClient.invalidateQueries({ queryKey: ['client_service', data.id] });
      toast({ title: 'Payment status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update payment status', description: error.message, variant: 'destructive' });
    },
  });
}

// Update contact status with history tracking
export function useUpdateContactStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const recordStatusChange = useRecordStatusChange();

  return useMutation({
    mutationFn: async ({ 
      id, 
      oldStatus,
      newStatus, 
      reason 
    }: { 
      id: string; 
      oldStatus: string | null;
      newStatus: ContactStatus; 
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('client_services')
        .update({ 
          contact_status: newStatus,
          contact_status_changed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      await recordStatusChange.mutateAsync({
        clientServiceId: id,
        dimension: 'contact',
        oldValue: oldStatus,
        newValue: newStatus,
        reason,
      });
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client_services'] });
      queryClient.invalidateQueries({ queryKey: ['client_service', data.id] });
      toast({ title: 'Contact status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update contact status', description: error.message, variant: 'destructive' });
    },
  });
}

// Update retention flag
export function useUpdateRetention() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const recordStatusChange = useRecordStatusChange();

  return useMutation({
    mutationFn: async ({ 
      id, 
      retention_flag,
      retention_type,
      retention_date,
      retention_reason,
      retention_assigned_to,
      oldRetentionType,
    }: { 
      id: string; 
      retention_flag: boolean;
      retention_type: RetentionType;
      retention_date: string | null;
      retention_reason: string | null;
      retention_assigned_to: string | null;
      oldRetentionType?: RetentionType;
    }) => {
      const { data, error } = await supabase
        .from('client_services')
        .update({ 
          retention_flag,
          retention_type,
          retention_date,
          retention_reason,
          retention_assigned_to,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      // Record in history if flag changed
      if (retention_flag || oldRetentionType) {
        await recordStatusChange.mutateAsync({
          clientServiceId: id,
          dimension: 'retention',
          oldValue: oldRetentionType || null,
          newValue: retention_type,
          reason: retention_reason || (retention_flag ? 'Retention flag set' : 'Retention flag cleared'),
        });
      }
      
      return { data, retention_flag };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['client_services'] });
      queryClient.invalidateQueries({ queryKey: ['client_service', result.data.id] });
      toast({ title: result.retention_flag ? 'Retention concern flagged' : 'Retention flag cleared' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update retention', description: error.message, variant: 'destructive' });
    },
  });
}

// Legacy status update (for backwards compatibility)
export function useUpdateClientServiceStatus() {
  const updatePrimaryStatus = useUpdatePrimaryStatus();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ServiceStatus }) => {
      return updatePrimaryStatus.mutateAsync({ 
        id, 
        oldStatus: '', 
        newStatus: status as PrimaryServiceStatus, 
        reason: 'Status updated via legacy method' 
      });
    },
  });
}

// Client service clients (junction table)
export function useAddClientServiceClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: TablesInsert<'client_service_clients'>) => {
      const { data: result, error } = await supabase
        .from('client_service_clients')
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client_service', data.client_service_id] });
      toast({ title: 'Client added to service' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add client', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveClientServiceClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, clientServiceId }: { id: string; clientServiceId: string }) => {
      const { error } = await supabase
        .from('client_service_clients')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return clientServiceId;
    },
    onSuccess: (clientServiceId) => {
      queryClient.invalidateQueries({ queryKey: ['client_service', clientServiceId] });
      toast({ title: 'Client removed from service' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove client', description: error.message, variant: 'destructive' });
    },
  });
}

// Client service types (services offered)
export function useAddClientServiceType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: TablesInsert<'client_service_types'>) => {
      const { data: result, error } = await supabase
        .from('client_service_types')
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client_service', data.client_service_id] });
      toast({ title: 'Service type added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add service type', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveClientServiceType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, clientServiceId }: { id: string; clientServiceId: string }) => {
      const { error } = await supabase
        .from('client_service_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return clientServiceId;
    },
    onSuccess: (clientServiceId) => {
      queryClient.invalidateQueries({ queryKey: ['client_service', clientServiceId] });
      toast({ title: 'Service type removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove service type', description: error.message, variant: 'destructive' });
    },
  });
}
