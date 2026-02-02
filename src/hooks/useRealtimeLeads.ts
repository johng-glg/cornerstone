import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import type { Tables } from '@/integrations/supabase/types';

interface UseRealtimeLeadsOptions {
  enabled?: boolean;
  showToasts?: boolean;
}

type LeadRow = Tables<'leads'>;

export function useRealtimeLeads({ 
  enabled = true, 
  showToasts = true 
}: UseRealtimeLeadsOptions = {}) {
  const { toast } = useToast();
  const { staff } = useAuth();

  useRealtimeSubscription<LeadRow>({
    table: 'leads',
    queryKey: ['leads'],
    enabled,
    onInsert: (payload) => {
      const newLead = payload.new as LeadRow;
      if (showToasts && newLead && newLead.assigned_to === staff?.id) {
        toast({
          title: 'New Lead Assigned',
          description: `${newLead.first_name} ${newLead.last_name}`,
        });
      }
    },
    onUpdate: (payload) => {
      const newLead = payload.new as LeadRow;
      const oldLead = payload.old as Partial<LeadRow>;
      // Toast when a lead is assigned to the current user
      if (showToasts && newLead && oldLead) {
        if (oldLead.assigned_to !== staff?.id && newLead.assigned_to === staff?.id) {
          toast({
            title: 'Lead Assigned to You',
            description: `${newLead.first_name} ${newLead.last_name}`,
          });
        }
      }
    },
  });
}

// Hook for subscribing to a specific lead
export function useRealtimeLead(leadId: string | undefined, options?: { enabled?: boolean }) {
  useRealtimeSubscription<LeadRow>({
    table: 'leads',
    queryKey: ['lead', leadId],
    filter: leadId ? `id=eq.${leadId}` : undefined,
    enabled: (options?.enabled ?? true) && !!leadId,
  });
}
