import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientActivity {
  id: string;
  type: 'liability_action' | 'litigation_activity' | 'task_completed' | 'settlement' | 'status_change';
  description: string;
  source_label: string;
  staff_name?: string;
  created_at: string;
}

export function useClientActivity(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client_activity', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const activities: ClientActivity[] = [];

      // Get client services for this client
      const { data: services } = await supabase
        .from('client_services')
        .select('id, service_number')
        .eq('primary_client_id', clientId);

      if (!services || services.length === 0) return [];

      const serviceIds = services.map(s => s.id);

      // 1. Liability actions
      const { data: liabilityActions } = await supabase
        .from('liability_actions')
        .select(`
          id,
          action_type,
          description,
          created_at,
          staff:staff(first_name, last_name),
          liability:liabilities(
            id,
            current_creditor:creditors!liabilities_current_creditor_id_fkey(name)
          )
        `)
        .in('liability_id', (
          await supabase
            .from('liabilities')
            .select('id')
            .in('client_service_id', serviceIds)
        ).data?.map(l => l.id) || [])
        .order('created_at', { ascending: false })
        .limit(50);

      if (liabilityActions) {
        liabilityActions.forEach(action => {
          const creditorName = (action.liability as any)?.current_creditor?.name || 'Unknown';
          const staffName = action.staff 
            ? `${(action.staff as any).first_name} ${(action.staff as any).last_name}` 
            : undefined;
          activities.push({
            id: `liability-action-${action.id}`,
            type: 'liability_action',
            description: action.description,
            source_label: `Liability - ${creditorName}`,
            staff_name: staffName,
            created_at: action.created_at,
          });
        });
      }

      // 2. Litigation activities
      const { data: litigationActivities } = await supabase
        .from('litigation_activities')
        .select(`
          id,
          activity_type,
          description,
          created_at,
          staff:staff(first_name, last_name),
          matter:litigation_matters(id, case_number)
        `)
        .in('matter_id', (
          await supabase
            .from('litigation_matters')
            .select('id')
            .in('client_service_id', serviceIds)
        ).data?.map(m => m.id) || [])
        .order('created_at', { ascending: false })
        .limit(50);

      if (litigationActivities) {
        litigationActivities.forEach(activity => {
          const caseNumber = (activity.matter as any)?.case_number || 'Litigation';
          const staffName = activity.staff 
            ? `${(activity.staff as any).first_name} ${(activity.staff as any).last_name}` 
            : undefined;
          activities.push({
            id: `litigation-activity-${activity.id}`,
            type: 'litigation_activity',
            description: activity.description,
            source_label: `Litigation ${caseNumber}`,
            staff_name: staffName,
            created_at: activity.created_at,
          });
        });
      }

      // 3. Service status history
      const { data: statusHistory } = await supabase
        .from('service_status_history')
        .select(`
          id,
          status_dimension,
          old_value,
          new_value,
          reason,
          created_at,
          changed_by:staff(first_name, last_name),
          client_service:client_services(service_number)
        `)
        .in('client_service_id', serviceIds)
        .order('created_at', { ascending: false })
        .limit(30);

      if (statusHistory) {
        statusHistory.forEach(change => {
          const serviceNum = (change.client_service as any)?.service_number || 'Service';
          const staffName = change.changed_by 
            ? `${(change.changed_by as any).first_name} ${(change.changed_by as any).last_name}` 
            : undefined;
          activities.push({
            id: `status-change-${change.id}`,
            type: 'status_change',
            description: `${change.status_dimension} changed from ${change.old_value || 'none'} to ${change.new_value}${change.reason ? `: ${change.reason}` : ''}`,
            source_label: serviceNum,
            staff_name: staffName,
            created_at: change.created_at,
          });
        });
      }

      // 4. Settlements
      const { data: settlements } = await supabase
        .from('settlements')
        .select(`
          id,
          status,
          offer_amount,
          created_at,
          liability:liabilities(
            current_creditor:creditors!liabilities_current_creditor_id_fkey(name)
          )
        `)
        .in('liability_id', (
          await supabase
            .from('liabilities')
            .select('id')
            .in('client_service_id', serviceIds)
        ).data?.map(l => l.id) || [])
        .order('created_at', { ascending: false })
        .limit(20);

      if (settlements) {
        settlements.forEach(settlement => {
          const creditorName = (settlement.liability as any)?.current_creditor?.name || 'Unknown';
          const amount = new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
          }).format(settlement.offer_amount);
          activities.push({
            id: `settlement-${settlement.id}`,
            type: 'settlement',
            description: `Settlement offer of ${amount} - ${settlement.status}`,
            source_label: `Liability - ${creditorName}`,
            created_at: settlement.created_at,
          });
        });
      }

      // Sort all activities by created_at descending
      return activities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 50);
    },
    enabled: !!clientId,
  });
}
