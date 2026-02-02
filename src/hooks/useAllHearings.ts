import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HearingWithMatter {
  id: string;
  matter_id: string;
  hearing_type: string;
  scheduled_date: string;
  location: string | null;
  judge_name: string | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  litigation_matter: {
    id: string;
    case_number: string | null;
    court_name: string | null;
    county: string | null;
    state: string | null;
    status: string;
    opposing_party: string | null;
    response_deadline: string | null;
    client_service: {
      id: string;
      service_number: string;
      primary_client: {
        id: string;
        first_name: string;
        last_name: string;
      } | null;
    } | null;
  } | null;
}

export function useAllHearings() {
  return useQuery({
    queryKey: ['all_litigation_hearings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('litigation_hearings')
        .select(`
          *,
          litigation_matter:litigation_matters!matter_id (
            id,
            case_number,
            court_name,
            county,
            state,
            status,
            opposing_party,
            response_deadline,
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
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data as HearingWithMatter[];
    },
  });
}

// Get all unique courts from hearings for filtering
export function useUniqueCourts() {
  return useQuery({
    queryKey: ['unique_courts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('litigation_matters')
        .select('court_name')
        .not('court_name', 'is', null);

      if (error) throw error;
      
      const courts = [...new Set(data?.map(d => d.court_name).filter(Boolean))] as string[];
      return courts.sort();
    },
  });
}

// Get all hearing types for filtering
export function useHearingTypes() {
  return useQuery({
    queryKey: ['hearing_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('litigation_hearings')
        .select('hearing_type');

      if (error) throw error;
      
      const types = [...new Set(data?.map(d => d.hearing_type).filter(Boolean))] as string[];
      return types.sort();
    },
  });
}
