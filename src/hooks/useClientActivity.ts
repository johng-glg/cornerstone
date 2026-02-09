import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientActivity {
  id: string;
  type: 'liability_action' | 'litigation_activity' | 'task_update' | 'settlement' | 'status_change' | 'communication' | 'billing_entry' | 'document_upload' | 'note';
  description: string;
  source_label: string;
  staff_name?: string;
  created_at: string;
}

async function fetchLiabilityIds(serviceIds: string[]): Promise<string[]> {
  const { data } = await supabase
    .from('liabilities')
    .select('id')
    .in('client_service_id', serviceIds);
  return data?.map(l => l.id) || [];
}

async function fetchLiabilityActions(liabilityIds: string[]): Promise<ClientActivity[]> {
  if (liabilityIds.length === 0) return [];
  const { data } = await supabase
    .from('liability_actions')
    .select(`id, action_type, description, created_at, staff:staff(first_name, last_name), liability:liabilities(id, current_creditor:creditors!liabilities_current_creditor_id_fkey(name))`)
    .in('liability_id', liabilityIds)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data || []).map(action => ({
    id: `liability-action-${action.id}`,
    type: 'liability_action' as const,
    description: action.description,
    source_label: `Liability - ${(action.liability as any)?.current_creditor?.name || 'Unknown'}`,
    staff_name: action.staff ? `${(action.staff as any).first_name} ${(action.staff as any).last_name}` : undefined,
    created_at: action.created_at,
  }));
}

async function fetchLitigationActivities(serviceIds: string[]): Promise<ClientActivity[]> {
  const { data: matters } = await supabase
    .from('litigation_matters')
    .select('id')
    .in('client_service_id', serviceIds);
  const matterIds = matters?.map(m => m.id) || [];
  if (matterIds.length === 0) return [];

  const { data } = await supabase
    .from('litigation_activities')
    .select(`id, activity_type, description, created_at, staff:staff(first_name, last_name), matter:litigation_matters(id, case_number)`)
    .in('matter_id', matterIds)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data || []).map(activity => ({
    id: `litigation-activity-${activity.id}`,
    type: 'litigation_activity' as const,
    description: activity.description,
    source_label: `Litigation ${(activity.matter as any)?.case_number || ''}`,
    staff_name: activity.staff ? `${(activity.staff as any).first_name} ${(activity.staff as any).last_name}` : undefined,
    created_at: activity.created_at,
  }));
}

async function fetchStatusChanges(serviceIds: string[]): Promise<ClientActivity[]> {
  const { data } = await supabase
    .from('service_status_history')
    .select(`id, status_dimension, old_value, new_value, reason, created_at, changed_by:staff(first_name, last_name), client_service:client_services(service_number)`)
    .in('client_service_id', serviceIds)
    .order('created_at', { ascending: false })
    .limit(30);

  return (data || []).map(change => ({
    id: `status-change-${change.id}`,
    type: 'status_change' as const,
    description: `${change.status_dimension} changed from ${change.old_value || 'none'} to ${change.new_value}${change.reason ? `: ${change.reason}` : ''}`,
    source_label: (change.client_service as any)?.service_number || 'Service',
    staff_name: change.changed_by ? `${(change.changed_by as any).first_name} ${(change.changed_by as any).last_name}` : undefined,
    created_at: change.created_at,
  }));
}

async function fetchSettlements(liabilityIds: string[]): Promise<ClientActivity[]> {
  if (liabilityIds.length === 0) return [];
  const { data } = await supabase
    .from('settlements')
    .select(`id, status, offer_amount, created_at, liability:liabilities(current_creditor:creditors!liabilities_current_creditor_id_fkey(name))`)
    .in('liability_id', liabilityIds)
    .order('created_at', { ascending: false })
    .limit(20);

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  return (data || []).map(s => ({
    id: `settlement-${s.id}`,
    type: 'settlement' as const,
    description: `Settlement offer of ${fmt.format(s.offer_amount)} - ${s.status}`,
    source_label: `Liability - ${(s.liability as any)?.current_creditor?.name || 'Unknown'}`,
    created_at: s.created_at,
  }));
}

async function fetchCommunications(clientId: string): Promise<ClientActivity[]> {
  const { data } = await supabase
    .from('client_communications')
    .select(`id, communication_type, direction, subject, outcome, communication_date, staff:staff(first_name, last_name)`)
    .eq('client_id', clientId)
    .order('communication_date', { ascending: false })
    .limit(30);

  return (data || []).map(comm => {
    const typeLabel = comm.communication_type.charAt(0).toUpperCase() + comm.communication_type.slice(1);
    const dirLabel = comm.direction === 'outbound' ? 'Outbound' : 'Inbound';
    const description = comm.subject
      ? `${typeLabel} (${dirLabel}): ${comm.subject}`
      : `${typeLabel} (${dirLabel})${comm.outcome ? ` - ${comm.outcome}` : ''}`;
    return {
      id: `communication-${comm.id}`,
      type: 'communication' as const,
      description,
      source_label: typeLabel,
      staff_name: comm.staff ? `${(comm.staff as any).first_name} ${(comm.staff as any).last_name}` : undefined,
      created_at: comm.communication_date,
    };
  });
}

async function fetchTasks(serviceIds: string[], liabilityIds: string[]): Promise<ClientActivity[]> {
  const activities: ClientActivity[] = [];

  // Tasks linked to client_service (entity_type = 'engagement' in the DB enum)
  if (serviceIds.length > 0) {
    const { data } = await supabase
      .from('tasks')
      .select(`id, title, status, completed_at, created_at, updated_at, assigned_to_staff:staff!tasks_assigned_to_fkey(first_name, last_name)`)
      .eq('entity_type', 'engagement' as any)
      .in('entity_id', serviceIds)
      .order('updated_at', { ascending: false })
      .limit(30);

    (data || []).forEach(t => {
      const staffName = t.assigned_to_staff ? `${(t.assigned_to_staff as any).first_name} ${(t.assigned_to_staff as any).last_name}` : undefined;
      const prefix = t.status === 'completed' ? 'Task completed' : 'Task created';
      activities.push({
        id: `task-${t.id}`,
        type: 'task_update',
        description: `${prefix}: ${t.title}`,
        source_label: 'Tasks',
        staff_name: staffName,
        created_at: t.status === 'completed' && t.completed_at ? t.completed_at : t.created_at,
      });
    });
  }

  // Tasks linked to liability
  if (liabilityIds.length > 0) {
    const { data } = await supabase
      .from('tasks')
      .select(`id, title, status, completed_at, created_at, updated_at, assigned_to_staff:staff!tasks_assigned_to_fkey(first_name, last_name)`)
      .eq('entity_type', 'liability')
      .in('entity_id', liabilityIds)
      .order('updated_at', { ascending: false })
      .limit(30);

    (data || []).forEach(t => {
      if (activities.some(a => a.id === `task-${t.id}`)) return; // dedupe
      const staffName = t.assigned_to_staff ? `${(t.assigned_to_staff as any).first_name} ${(t.assigned_to_staff as any).last_name}` : undefined;
      const prefix = t.status === 'completed' ? 'Task completed' : 'Task created';
      activities.push({
        id: `task-${t.id}`,
        type: 'task_update',
        description: `${prefix}: ${t.title}`,
        source_label: 'Tasks',
        staff_name: staffName,
        created_at: t.status === 'completed' && t.completed_at ? t.completed_at : t.created_at,
      });
    });
  }

  return activities;
}

async function fetchBillingEntries(clientId: string, serviceIds: string[]): Promise<ClientActivity[]> {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  // Direct client billing entries
  const { data: byClient } = await supabase
    .from('billing_entries')
    .select(`id, entry_type, description, total_amount, created_at, staff:staff(first_name, last_name)`)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(30);

  const seen = new Set<string>();
  const activities: ClientActivity[] = [];

  (byClient || []).forEach(b => {
    seen.add(b.id);
    const typeLabel = b.entry_type.charAt(0).toUpperCase() + b.entry_type.slice(1);
    activities.push({
      id: `billing-${b.id}`,
      type: 'billing_entry',
      description: `${typeLabel} entry: ${b.description} - ${fmt.format(b.total_amount)}`,
      source_label: 'Billing',
      staff_name: b.staff ? `${(b.staff as any).first_name} ${(b.staff as any).last_name}` : undefined,
      created_at: b.created_at,
    });
  });

  // Billing via service ids
  if (serviceIds.length > 0) {
    const { data: byService } = await supabase
      .from('billing_entries')
      .select(`id, entry_type, description, total_amount, created_at, staff:staff(first_name, last_name)`)
      .in('client_service_id', serviceIds)
      .order('created_at', { ascending: false })
      .limit(30);

    (byService || []).forEach(b => {
      if (seen.has(b.id)) return;
      const typeLabel = b.entry_type.charAt(0).toUpperCase() + b.entry_type.slice(1);
      activities.push({
        id: `billing-${b.id}`,
        type: 'billing_entry',
        description: `${typeLabel} entry: ${b.description} - ${fmt.format(b.total_amount)}`,
        source_label: 'Billing',
        staff_name: b.staff ? `${(b.staff as any).first_name} ${(b.staff as any).last_name}` : undefined,
        created_at: b.created_at,
      });
    });
  }

  return activities;
}

async function fetchDocuments(clientId: string): Promise<ClientActivity[]> {
  const { data } = await supabase
    .from('client_documents')
    .select(`id, title, document_type, created_at, uploaded_by_staff:staff(first_name, last_name)`)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data || []).map(d => ({
    id: `document-${d.id}`,
    type: 'document_upload' as const,
    description: `Document uploaded: ${d.title} (${d.document_type})`,
    source_label: 'Documents',
    staff_name: d.uploaded_by_staff ? `${(d.uploaded_by_staff as any).first_name} ${(d.uploaded_by_staff as any).last_name}` : undefined,
    created_at: d.created_at,
  }));
}

async function fetchNotes(clientId: string, serviceIds: string[]): Promise<ClientActivity[]> {
  // Notes on the client directly
  const { data: clientNotes } = await supabase
    .from('notes')
    .select(`id, entity_type, created_at, created_by_staff:staff(first_name, last_name)`)
    .eq('entity_type', 'client')
    .eq('entity_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20);

  const seen = new Set<string>();
  const activities: ClientActivity[] = [];

  (clientNotes || []).forEach(n => {
    seen.add(n.id);
    activities.push({
      id: `note-${n.id}`,
      type: 'note',
      description: `Note added on client`,
      source_label: 'Notes',
      staff_name: n.created_by_staff ? `${(n.created_by_staff as any).first_name} ${(n.created_by_staff as any).last_name}` : undefined,
      created_at: n.created_at,
    });
  });

  // Notes on client_service entities
  if (serviceIds.length > 0) {
    const { data: serviceNotes } = await supabase
      .from('notes')
      .select(`id, entity_type, created_at, created_by_staff:staff(first_name, last_name)`)
      .eq('entity_type', 'client_service')
      .in('entity_id', serviceIds)
      .order('created_at', { ascending: false })
      .limit(20);

    (serviceNotes || []).forEach(n => {
      if (seen.has(n.id)) return;
      activities.push({
        id: `note-${n.id}`,
        type: 'note',
        description: `Note added on service`,
        source_label: 'Notes',
        staff_name: n.created_by_staff ? `${(n.created_by_staff as any).first_name} ${(n.created_by_staff as any).last_name}` : undefined,
        created_at: n.created_at,
      });
    });
  }

  return activities;
}

export function useClientActivity(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client_activity', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // Fetch client record for creation event
      const { data: client } = await supabase
        .from('clients')
        .select('created_at, first_name, last_name')
        .eq('id', clientId)
        .single();

      const { data: services } = await supabase
        .from('client_services')
        .select('id, service_number, created_at')
        .eq('primary_client_id', clientId);

      const serviceIds = services?.map(s => s.id) || [];
      const liabilityIds = serviceIds.length > 0 ? await fetchLiabilityIds(serviceIds) : [];

      // Run all fetches in parallel
      const [
        liabilityActions,
        litigationActivities,
        statusChanges,
        settlements,
        communications,
        tasks,
        billingEntries,
        documents,
        notes,
      ] = await Promise.all([
        fetchLiabilityActions(liabilityIds),
        fetchLitigationActivities(serviceIds),
        fetchStatusChanges(serviceIds),
        fetchSettlements(liabilityIds),
        fetchCommunications(clientId),
        fetchTasks(serviceIds, liabilityIds),
        fetchBillingEntries(clientId, serviceIds),
        fetchDocuments(clientId),
        fetchNotes(clientId, serviceIds),
      ]);

      // Synthetic creation events
      const creationEvents: ClientActivity[] = [];

      if (client) {
        creationEvents.push({
          id: `creation-client-${clientId}`,
          type: 'status_change',
          description: `Client record created for ${client.first_name} ${client.last_name}`,
          source_label: 'System',
          created_at: client.created_at,
        });
      }

      (services || []).forEach(s => {
        creationEvents.push({
          id: `creation-service-${s.id}`,
          type: 'status_change',
          description: `Service ${s.service_number} created`,
          source_label: 'System',
          created_at: s.created_at,
        });
      });

      return [
        ...liabilityActions,
        ...litigationActivities,
        ...statusChanges,
        ...settlements,
        ...communications,
        ...tasks,
        ...billingEntries,
        ...documents,
        ...notes,
        ...creationEvents,
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);
    },
    enabled: !!clientId,
  });
}
