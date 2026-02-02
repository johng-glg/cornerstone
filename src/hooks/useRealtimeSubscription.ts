import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeSubscriptionOptions<T extends Record<string, unknown>> {
  table: string;
  schema?: string;
  queryKey: unknown[];
  filter?: string;
  event?: PostgresChangeEvent;
  enabled?: boolean;
  onInsert?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export function useRealtimeSubscription<T extends Record<string, unknown>>({
  table,
  schema = 'public',
  queryKey,
  filter,
  event = '*',
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeSubscriptionOptions<T>) {
  const queryClient = useQueryClient();
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${JSON.stringify(queryKey)}`;
    
    console.log(`[Realtime] Subscribing to ${table}`, { filter, event });

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          console.log(`[Realtime] ${table} change:`, payload.eventType, payload);
          
          // Invalidate the query to trigger refetch
          queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
          
          // Call generic onChange handler
          if (onChange) {
            onChange(payload);
          }
          
          // Call specific handlers if provided
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload);
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload);
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${table} subscription status:`, status);
      });

    return () => {
      console.log(`[Realtime] Unsubscribing from ${table}`);
      supabase.removeChannel(channel);
    };
  }, [table, schema, JSON.stringify(queryKey), filter, event, enabled]);
}

// Convenience hook for subscribing to multiple tables at once
export function useRealtimeSubscriptions(
  subscriptions: Array<Omit<UseRealtimeSubscriptionOptions<Record<string, unknown>>, 'enabled'> & { enabled?: boolean }>
) {
  subscriptions.forEach((sub) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRealtimeSubscription(sub);
  });
}
