import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentStaff } from '@/hooks/useStaff';
import { toast } from 'sonner';

/**
 * Subscribes to new inbound Dialpad calls assigned to the current staff
 * and surfaces a screen-pop according to their preference:
 *   - 'toast' (default): sticky toast with "Open" action, ~30s
 *   - 'auto_navigate': navigate immediately to the related record
 *   - 'off': do nothing
 */
export function ScreenPopProvider() {
  const { data: staff } = useCurrentStaff();
  const navigate = useNavigate();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!staff?.company_id) return;
    const pref = (staff as any).screen_pop_preference ?? 'toast';
    if (pref === 'off') return;

    const channel = supabase
      .channel(`screen-pop-${staff.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dialpad_calls',
          filter: `company_id=eq.${staff.company_id}`,
        },
        (payload) => {
          const row: any = payload.new;
          if (!row || row.direction !== 'inbound') return;
          if (seen.current.has(row.id)) return;
          seen.current.add(row.id);

          const link = buildLink(row.related_entity_type, row.related_entity_id);
          const name = row.target_phone || 'Unknown caller';

          if (pref === 'auto_navigate' && link) {
            navigate(link);
            return;
          }

          toast(`Incoming call: ${name}`, {
            description: row.related_entity_type
              ? `Linked ${row.related_entity_type.replace('_', ' ')}`
              : 'No record matched',
            duration: 30000,
            action: link
              ? { label: 'Open', onClick: () => navigate(link) }
              : undefined,
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [staff?.id, staff?.company_id, (staff as any)?.screen_pop_preference, navigate]);

  return null;
}

function buildLink(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'client': return `/clients/${entityId}`;
    case 'lead': return `/leads?open=${entityId}`;
    case 'litigation_matter': return `/litigation?open=${entityId}`;
    case 'creditor':
    case 'creditor_contact': return `/creditors?open=${entityId}`;
    default: return null;
  }
}
