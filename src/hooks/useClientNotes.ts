import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientNote {
  id: string;
  source: 'client' | 'service' | 'liability' | 'litigation' | 'task';
  source_id: string;
  source_label: string;
  notes: string;
  created_at: string;
}

export function useClientNotes(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client_notes', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const notes: ClientNote[] = [];

      // 1. Client notes
      const { data: client } = await supabase
        .from('clients')
        .select('id, notes, created_at')
        .eq('id', clientId)
        .single();

      if (client?.notes) {
        notes.push({
          id: `client-${client.id}`,
          source: 'client',
          source_id: client.id,
          source_label: 'Client Profile',
          notes: client.notes,
          created_at: client.created_at,
        });
      }

      // 2. Get client services for this client
      const { data: services } = await supabase
        .from('client_services')
        .select('id, service_number, notes, created_at')
        .eq('primary_client_id', clientId);

      if (services) {
        services.forEach(svc => {
          if (svc.notes) {
            notes.push({
              id: `service-${svc.id}`,
              source: 'service',
              source_id: svc.id,
              source_label: `Service ${svc.service_number}`,
              notes: svc.notes,
              created_at: svc.created_at,
            });
          }
        });

        const serviceIds = services.map(s => s.id);

        if (serviceIds.length > 0) {
          // 3. Liability notes
          const { data: liabilities } = await supabase
            .from('liabilities')
            .select('id, notes, created_at, current_creditor:creditors!liabilities_current_creditor_id_fkey(name)')
            .in('client_service_id', serviceIds);

          if (liabilities) {
            liabilities.forEach(lib => {
              if (lib.notes) {
                notes.push({
                  id: `liability-${lib.id}`,
                  source: 'liability',
                  source_id: lib.id,
                  source_label: `Liability - ${(lib.current_creditor as any)?.name || 'Unknown'}`,
                  notes: lib.notes,
                  created_at: lib.created_at,
                });
              }
            });
          }

          // 4. Litigation matter notes
          const { data: matters } = await supabase
            .from('litigation_matters')
            .select('id, case_number, notes, created_at')
            .in('client_service_id', serviceIds);

          if (matters) {
            matters.forEach(matter => {
              if (matter.notes) {
                notes.push({
                  id: `litigation-${matter.id}`,
                  source: 'litigation',
                  source_id: matter.id,
                  source_label: `Litigation ${matter.case_number || 'Matter'}`,
                  notes: matter.notes,
                  created_at: matter.created_at,
                });
              }
            });
          }
        }
      }

      // Sort by created_at descending (newest first)
      return notes.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!clientId,
  });
}
