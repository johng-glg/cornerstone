import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

// Types for aggregated client data
export type ClientServiceForClient = Tables<'client_services'> & {
  services?: Array<{
    service: Tables<'services'>;
  }>;
  owning_company?: Tables<'companies'> | null;
};

export type LiabilityForClient = Tables<'liabilities'> & {
  original_creditor?: Tables<'creditors'> | null;
  current_creditor?: Tables<'creditors'> | null;
  client_service?: {
    id: string;
    service_number: string;
    status: string;
  } | null;
};

export type TransactionForClient = Tables<'transactions'> & {
  processor?: Tables<'payment_processors'> | null;
  client_service?: {
    id: string;
    service_number: string;
  } | null;
};

export type TaskForClient = Tables<'tasks'> & {
  assigned_staff?: Tables<'staff'> | null;
};

export interface ClientActivitySummary {
  totalServices: number;
  activeServices: number;
  totalEnrolledDebt: number;
  totalSettledAmount: number;
  settlementPercentage: number;
  liabilitiesByStatus: Record<string, number>;
  upcomingPayment: { date: string; amount: number } | null;
  upcomingTasks: TaskForClient[];
}

// Fetch all services for a specific client
export function useClientServicesForClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['clientServicesForClient', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_services')
        .select(`
          *,
          services:client_service_types(
            service:services(*)
          ),
          owning_company:companies!engagements_owning_company_id_fkey(id, name)
        `)
        .eq('primary_client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientServiceForClient[];
    },
    enabled: !!clientId,
  });
}

// Fetch all liabilities across all client services for a client
export function useLiabilitiesForClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['liabilitiesForClient', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // First get all service IDs for this client
      const { data: services, error: servicesError } = await supabase
        .from('client_services')
        .select('id')
        .eq('primary_client_id', clientId);
      
      if (servicesError) throw servicesError;
      if (!services || services.length === 0) return [];
      
      const serviceIds = services.map(s => s.id);
      
      const { data, error } = await supabase
        .from('liabilities')
        .select(`
          *,
          original_creditor:creditors!liabilities_original_creditor_id_fkey(id, name, creditor_type),
          current_creditor:creditors!liabilities_current_creditor_id_fkey(id, name, creditor_type),
          client_service:client_services!liabilities_engagement_id_fkey(id, service_number, status)
        `)
        .in('client_service_id', serviceIds)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data as LiabilityForClient[];
    },
    enabled: !!clientId,
  });
}

// Fetch all transactions across all client services for a client
export function useTransactionsForClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['transactionsForClient', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // First get all service IDs for this client
      const { data: services, error: servicesError } = await supabase
        .from('client_services')
        .select('id')
        .eq('primary_client_id', clientId);
      
      if (servicesError) throw servicesError;
      if (!services || services.length === 0) return [];
      
      const serviceIds = services.map(s => s.id);
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          processor:payment_processors!transactions_processor_id_fkey(id, name, processor_type),
          client_service:client_services!transactions_engagement_id_fkey(id, service_number)
        `)
        .in('client_service_id', serviceIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TransactionForClient[];
    },
    enabled: !!clientId,
  });
}

// Fetch all tasks linked to a client or their services
export function useTasksForClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['tasksForClient', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      // Get service IDs
      const { data: services } = await supabase
        .from('client_services')
        .select('id')
        .eq('primary_client_id', clientId);
      
      const serviceIds = services?.map(s => s.id) || [];
      
      // Query tasks that are linked to either the client or their services
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_staff:staff!tasks_assigned_to_fkey(id, first_name, last_name, avatar_url)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });
      
      // Build OR condition for entity_id matching client or services
      if (serviceIds.length > 0) {
        query = query.or(`entity_id.eq.${clientId},entity_id.in.(${serviceIds.join(',')})`);
      } else {
        query = query.eq('entity_id', clientId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TaskForClient[];
    },
    enabled: !!clientId,
  });
}

// Compute aggregated activity summary for a client
export function useClientActivitySummary(clientId: string | undefined) {
  const { data: services } = useClientServicesForClient(clientId);
  const { data: liabilities } = useLiabilitiesForClient(clientId);
  const { data: tasks } = useTasksForClient(clientId);
  
  return useQuery({
    queryKey: ['clientActivitySummary', clientId, services, liabilities, tasks],
    queryFn: async (): Promise<ClientActivitySummary> => {
      const totalServices = services?.length || 0;
      const activeServices = services?.filter(s => s.status === 'active').length || 0;
      
      // Calculate debt totals
      const totalEnrolledDebt = services?.reduce((sum, s) => sum + (s.total_enrolled_debt || 0), 0) || 0;
      
      // Calculate settled amount from liabilities
      const settledLiabilities = liabilities?.filter(l => l.status === 'settled') || [];
      const totalSettledAmount = settledLiabilities.reduce((sum, l) => sum + (l.enrolled_balance || 0), 0);
      const settlementPercentage = totalEnrolledDebt > 0 
        ? Math.round((totalSettledAmount / totalEnrolledDebt) * 100) 
        : 0;
      
      // Group liabilities by status
      const liabilitiesByStatus: Record<string, number> = {};
      liabilities?.forEach(l => {
        liabilitiesByStatus[l.status] = (liabilitiesByStatus[l.status] || 0) + 1;
      });
      
      // Get upcoming payment from active services
      const activeService = services?.find(s => s.status === 'active');
      const upcomingPayment = activeService?.first_payment_date && activeService?.monthly_payment
        ? { date: activeService.first_payment_date, amount: activeService.monthly_payment }
        : null;
      
      // Get upcoming tasks (not completed, sorted by due date)
      const upcomingTasks = tasks
        ?.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
        .slice(0, 3) || [];
      
      return {
        totalServices,
        activeServices,
        totalEnrolledDebt,
        totalSettledAmount,
        settlementPercentage,
        liabilitiesByStatus,
        upcomingPayment,
        upcomingTasks,
      };
    },
    enabled: !!clientId && !!services && !!liabilities,
  });
}
