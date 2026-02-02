import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { startOfDay, addDays, startOfMonth, startOfWeek, format } from 'date-fns';

// Admin Dashboard Stats - Company-wide metrics
export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin_dashboard_stats'],
    queryFn: async () => {
      // Active clients count
      const { count: activeClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Active services by status
      const { data: servicesByStatus } = await supabase
        .from('client_services')
        .select('status')
        .in('status', ['active', 'pending', 'prospect']);
      
      const serviceCounts = {
        active: 0,
        pending: 0,
        prospect: 0,
        total: servicesByStatus?.length || 0,
      };
      
      servicesByStatus?.forEach(s => {
        if (s.status === 'active') serviceCounts.active++;
        if (s.status === 'pending') serviceCounts.pending++;
        if (s.status === 'prospect') serviceCounts.prospect++;
      });

      // Liabilities in negotiation
      const { count: liabilitiesInNegotiation } = await supabase
        .from('liabilities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_negotiation');

      // Pending tasks company-wide
      const { count: pendingTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);

      // Staff with task counts for workload
      const { data: staffWorkload } = await supabase
        .from('tasks')
        .select('assigned_to')
        .in('status', ['pending', 'in_progress']);

      const workloadByStaff: Record<string, number> = {};
      staffWorkload?.forEach(t => {
        if (t.assigned_to) {
          workloadByStaff[t.assigned_to] = (workloadByStaff[t.assigned_to] || 0) + 1;
        }
      });

      return {
        activeClients: activeClients || 0,
        serviceCounts,
        liabilitiesInNegotiation: liabilitiesInNegotiation || 0,
        pendingTasks: pendingTasks || 0,
        workloadByStaff,
      };
    },
  });
}

// Sales Rep Dashboard Stats - Lead pipeline
export function useSalesRepStats() {
  const { staff } = useAuth();
  
  return useQuery({
    queryKey: ['sales_rep_stats', staff?.id],
    queryFn: async () => {
      if (!staff?.id) return null;

      // My active leads
      const { count: myActiveLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', staff.id)
        .not('status', 'in', '(converted,lost)');

      // Leads by status (mine)
      const { data: myLeadsByStatus } = await supabase
        .from('leads')
        .select('status')
        .eq('assigned_to', staff.id)
        .not('status', 'in', '(converted,lost)');

      const leadCounts = {
        new: 0,
        contacted: 0,
        qualified: 0,
        proposal: 0,
      };
      
      myLeadsByStatus?.forEach(l => {
        if (l.status in leadCounts) {
          leadCounts[l.status as keyof typeof leadCounts]++;
        }
      });

      // Conversions this month
      const monthStart = startOfMonth(new Date()).toISOString();
      const { count: conversionsThisMonth } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', staff.id)
        .eq('status', 'converted')
        .gte('converted_at', monthStart);

      // My follow-up tasks
      const { count: followUpTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', staff.id)
        .in('status', ['pending', 'in_progress'])
        .eq('task_type', 'follow_up');

      return {
        myActiveLeads: myActiveLeads || 0,
        leadCounts,
        conversionsThisMonth: conversionsThisMonth || 0,
        followUpTasks: followUpTasks || 0,
      };
    },
    enabled: !!staff?.id,
  });
}

// Negotiator Dashboard Stats - Settlement workflow
export function useNegotiatorStats() {
  const { staff } = useAuth();
  
  return useQuery({
    queryKey: ['negotiator_stats', staff?.id],
    queryFn: async () => {
      // Liabilities in negotiation
      const { count: inNegotiation } = await supabase
        .from('liabilities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_negotiation');

      // Pending settlements (offered)
      const { count: pendingSettlements } = await supabase
        .from('settlements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'offered');

      // Settlements awaiting attorney approval
      const { count: awaitingApproval } = await supabase
        .from('settlements')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .eq('attorney_approved', false);

      // Settlement value this month
      const monthStart = startOfMonth(new Date()).toISOString();
      const { data: monthlySettlements } = await supabase
        .from('settlements')
        .select('offer_amount')
        .in('status', ['accepted', 'completed'])
        .gte('accepted_date', monthStart);

      const settlementValueThisMonth = monthlySettlements?.reduce(
        (sum, s) => sum + (s.offer_amount || 0), 0
      ) || 0;

      return {
        inNegotiation: inNegotiation || 0,
        pendingSettlements: pendingSettlements || 0,
        awaitingApproval: awaitingApproval || 0,
        settlementValueThisMonth,
      };
    },
    enabled: !!staff?.id,
  });
}

// Payment Processor Dashboard Stats - Transaction processing
export function usePaymentProcessorStats() {
  return useQuery({
    queryKey: ['payment_processor_stats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const monthStart = startOfMonth(new Date()).toISOString();

      // Transactions due today
      const { count: dueToday } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('scheduled_date', today)
        .eq('status', 'open');

      // Pending transactions
      const { count: pendingTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Cleared this month (volume)
      const { data: clearedThisMonth } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'cleared')
        .gte('cleared_date', monthStart);

      const clearedVolume = clearedThisMonth?.reduce(
        (sum, t) => sum + (t.amount || 0), 0
      ) || 0;

      // Failed/NSF transactions (recent)
      const weekStart = startOfWeek(new Date()).toISOString();
      const { count: failedTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('updated_at', weekStart);

      return {
        dueToday: dueToday || 0,
        pendingTransactions: pendingTransactions || 0,
        clearedVolume,
        failedTransactions: failedTransactions || 0,
      };
    },
  });
}

// Correspondence Dashboard Stats - Communication and documents
export function useCorrespondenceStats() {
  const { staff } = useAuth();
  
  return useQuery({
    queryKey: ['correspondence_stats', staff?.id],
    queryFn: async () => {
      if (!staff?.id) return null;

      const weekStart = startOfWeek(new Date()).toISOString();
      const today = startOfDay(new Date()).toISOString();
      const tomorrow = addDays(startOfDay(new Date()), 1).toISOString();

      // Documents uploaded this week (by me)
      const { count: documentsThisWeek } = await supabase
        .from('client_documents')
        .select('*', { count: 'exact', head: true })
        .eq('uploaded_by', staff.id)
        .gte('created_at', weekStart);

      // Communications logged today (by me)
      const { count: communicationsToday } = await supabase
        .from('client_communications')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', staff.id)
        .gte('communication_date', today)
        .lt('communication_date', tomorrow);

      // My pending tasks
      const { count: pendingTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', staff.id)
        .in('status', ['pending', 'in_progress']);

      // My follow-up tasks
      const { count: followUpTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', staff.id)
        .in('status', ['pending', 'in_progress'])
        .eq('task_type', 'follow_up');

      return {
        documentsThisWeek: documentsThisWeek || 0,
        communicationsToday: communicationsToday || 0,
        pendingTasks: pendingTasks || 0,
        followUpTasks: followUpTasks || 0,
      };
    },
    enabled: !!staff?.id,
  });
}

// Client Services Rep Dashboard Stats - Client engagement
export function useClientServicesStats() {
  const { staff } = useAuth();
  
  return useQuery({
    queryKey: ['client_services_stats', staff?.id],
    queryFn: async () => {
      if (!staff?.id) return null;

      const weekStart = startOfWeek(new Date()).toISOString();

      // Services at risk (with retention flag)
      const { count: atRiskServices } = await supabase
        .from('client_services')
        .select('*', { count: 'exact', head: true })
        .eq('retention_flag', true);

      // Services assigned to retention staff
      const { count: myRetentionServices } = await supabase
        .from('client_services')
        .select('*', { count: 'exact', head: true })
        .eq('retention_assigned_to', staff.id)
        .eq('retention_flag', true);

      // Communications this week (by me)
      const { count: communicationsThisWeek } = await supabase
        .from('client_communications')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', staff.id)
        .gte('communication_date', weekStart);

      // My follow-up tasks
      const { count: followUpTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', staff.id)
        .in('status', ['pending', 'in_progress']);

      // Active services count
      const { count: activeServices } = await supabase
        .from('client_services')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'pending']);

      return {
        atRiskServices: atRiskServices || 0,
        myRetentionServices: myRetentionServices || 0,
        communicationsThisWeek: communicationsThisWeek || 0,
        followUpTasks: followUpTasks || 0,
        activeServices: activeServices || 0,
      };
    },
    enabled: !!staff?.id,
  });
}
