import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from './useDebounce';
import type { SearchResult, GroupedSearchResults } from '@/types/search';

async function searchLeads(query: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, first_name, last_name, lead_number, email, phone, status')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,lead_number.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Search leads error:', error);
    return [];
  }

  return (data || []).map((lead) => ({
    id: lead.id,
    type: 'lead' as const,
    title: `${lead.first_name} ${lead.last_name}`,
    subtitle: lead.lead_number,
    badge: lead.status,
    badgeVariant: lead.status === 'converted' ? 'default' : 'secondary',
    route: `/leads?open=${lead.id}`,
  }));
}

async function searchClients(query: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, email, status')
    .eq('is_active', true)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Search clients error:', error);
    return [];
  }

  return (data || []).map((client) => ({
    id: client.id,
    type: 'client' as const,
    title: `${client.first_name} ${client.last_name}`,
    subtitle: client.email || 'No email',
    badge: client.status || undefined,
    badgeVariant: 'secondary' as const,
    route: `/clients/${client.id}`,
  }));
}


async function searchLiabilities(query: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('liabilities')
    .select(`
      id,
      account_number,
      current_balance,
      status,
      current_creditor:creditors!liabilities_current_creditor_id_fkey(name),
      original_creditor:creditors!liabilities_original_creditor_id_fkey(name),
      client_service:client_services!liabilities_engagement_id_fkey(
        service_number,
        primary_client:clients!engagements_primary_contact_id_fkey(first_name, last_name)
      )
    `)
    .or(`account_number.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Search liabilities error:', error);
    return [];
  }

  return (data || []).map((liability) => {
    const creditorName = liability.current_creditor?.name || liability.original_creditor?.name || 'Unknown';
    const clientName = liability.client_service?.primary_client
      ? `${liability.client_service.primary_client.first_name} ${liability.client_service.primary_client.last_name}`
      : '';
    const balance = liability.current_balance
      ? `$${Number(liability.current_balance).toLocaleString()}`
      : '';

    return {
      id: liability.id,
      type: 'liability' as const,
      title: `${creditorName} - ${clientName || 'No client'}`,
      subtitle: `${liability.account_number ? `****${liability.account_number.slice(-4)}` : 'No account'} ${balance ? `• ${balance}` : ''}`,
      badge: liability.status,
      badgeVariant: liability.status === 'settled' ? 'default' : 'secondary',
      route: `/liabilities?open=${liability.id}`,
    };
  });
}

async function searchLitigationMatters(query: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('litigation_matters')
    .select(`
      id,
      case_number,
      court_name,
      opposing_party,
      status,
      client_service:client_services!litigation_matters_client_service_id_fkey(
        service_number,
        primary_client:clients!engagements_primary_contact_id_fkey(first_name, last_name)
      )
    `)
    .or(`case_number.ilike.%${query}%,court_name.ilike.%${query}%,opposing_party.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Search litigation error:', error);
    return [];
  }

  return (data || []).map((matter) => {
    const clientName = matter.client_service?.primary_client
      ? `${matter.client_service.primary_client.first_name} ${matter.client_service.primary_client.last_name}`
      : '';

    return {
      id: matter.id,
      type: 'litigation' as const,
      title: `${matter.case_number || 'No case #'} - ${clientName || matter.opposing_party || 'Unknown'}`,
      subtitle: matter.court_name || 'No court',
      badge: matter.status,
      badgeVariant: matter.status === 'settled' ? 'default' : matter.status === 'judgment' ? 'destructive' : 'secondary',
      route: `/litigation?open=${matter.id}`,
    };
  });
}

function groupResults(results: SearchResult[]): GroupedSearchResults {
  return {
    leads: results.filter((r) => r.type === 'lead'),
    clients: results.filter((r) => r.type === 'client'),
    services: [],
    liabilities: results.filter((r) => r.type === 'liability'),
    litigation: results.filter((r) => r.type === 'litigation'),
  };
}

export function useGlobalSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { results: [], grouped: groupResults([]) };
      }

      const [leads, clients, liabilities, matters] = await Promise.all([
        searchLeads(debouncedQuery),
        searchClients(debouncedQuery),
        searchLiabilities(debouncedQuery),
        searchLitigationMatters(debouncedQuery),
      ]);

      const results = [...leads, ...clients, ...liabilities, ...matters];
      return { results, grouped: groupResults(results) };
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });
}
