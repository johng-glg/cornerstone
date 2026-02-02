import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface AssignedMatter {
  id: string;
  case_number: string | null;
  court_name: string | null;
  county: string | null;
  state: string | null;
  status: string;
  opposing_party: string | null;
  response_deadline: string | null;
  next_hearing_date: string | null;
  judgment_amount: number | null;
  settlement_amount: number | null;
  created_at: string;
  updated_at: string;
  client_service: {
    id: string;
    service_number: string;
    primary_client: {
      id: string;
      first_name: string;
      last_name: string;
    } | null;
  } | null;
  liability: {
    id: string;
    current_balance: number | null;
    enrolled_balance: number | null;
    original_creditor: {
      id: string;
      name: string;
    } | null;
    current_creditor: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export function useAssignedMatters(assignmentType?: 'litigation_attorney' | 'case_manager') {
  const { staff } = useAuth();

  return useQuery({
    queryKey: ['assigned_matters', staff?.id, assignmentType],
    queryFn: async () => {
      if (!staff?.id) return [];

      // First get assignments for the current staff
      let assignmentsQuery = supabase
        .from('assignments')
        .select('entity_id')
        .eq('staff_id', staff.id)
        .eq('entity_type', 'litigation_matter')
        .eq('is_active', true);

      if (assignmentType) {
        assignmentsQuery = assignmentsQuery.eq('assignment_type', assignmentType);
      }

      const { data: assignments, error: assignmentsError } = await assignmentsQuery;

      if (assignmentsError) throw assignmentsError;
      if (!assignments || assignments.length === 0) return [];

      const matterIds = assignments.map(a => a.entity_id);

      // Then get the full matter details
      const { data: matters, error: mattersError } = await supabase
        .from('litigation_matters')
        .select(`
          *,
          client_service:client_services!client_service_id (
            id,
            service_number,
            primary_client:clients!primary_client_id (
              id,
              first_name,
              last_name
            )
          ),
          liability:liabilities!liability_id (
            id,
            current_balance,
            enrolled_balance,
            original_creditor:creditors!original_creditor_id (
              id,
              name
            ),
            current_creditor:creditors!current_creditor_id (
              id,
              name
            )
          )
        `)
        .in('id', matterIds)
        .order('response_deadline', { ascending: true });

      if (mattersError) throw mattersError;
      return matters as AssignedMatter[];
    },
    enabled: !!staff?.id,
  });
}

// Get counts by status for assigned matters
export function useAssignedMatterCounts(assignmentType?: 'litigation_attorney' | 'case_manager') {
  const { data: matters } = useAssignedMatters(assignmentType);

  const counts = {
    total: matters?.length || 0,
    new: 0,
    pre_response: 0,
    post_response: 0,
    settled: 0,
    dropped: 0,
    judgment: 0,
    declined: 0,
    dismissed: 0,
  };

  matters?.forEach(m => {
    const status = m.status as keyof typeof counts;
    if (status in counts) {
      counts[status]++;
    }
  });

  return counts;
}

// Get all matters for the current staff's hearings
export function useStaffHearings() {
  const { staff } = useAuth();

  return useQuery({
    queryKey: ['staff_hearings', staff?.id],
    queryFn: async () => {
      if (!staff?.id) return [];

      // Get assigned matter IDs
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('entity_id')
        .eq('staff_id', staff.id)
        .eq('entity_type', 'litigation_matter')
        .eq('is_active', true);

      if (assignmentsError) throw assignmentsError;
      if (!assignments || assignments.length === 0) return [];

      const matterIds = assignments.map(a => a.entity_id);

      // Get hearings for those matters
      const { data: hearings, error: hearingsError } = await supabase
        .from('litigation_hearings')
        .select(`
          *,
          litigation_matter:litigation_matters!matter_id (
            id,
            case_number,
            court_name,
            opposing_party,
            status,
            client_service:client_services!client_service_id (
              id,
              service_number,
              primary_client:clients!primary_client_id (
                id,
                first_name,
                last_name
              )
            )
          )
        `)
        .in('matter_id', matterIds)
        .order('scheduled_date', { ascending: true });

      if (hearingsError) throw hearingsError;
      return hearings;
    },
    enabled: !!staff?.id,
  });
}
