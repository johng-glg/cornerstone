import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DeadlineReminder } from '@/types/reminders';

export function useDeadlineReminders(limit = 50) {
  return useQuery({
    queryKey: ['deadline_reminders', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deadline_reminders')
        .select('*')
        .order('scheduled_for', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as DeadlineReminder[];
    },
  });
}

export function usePendingRemindersCount() {
  return useQuery({
    queryKey: ['pending_reminders_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('deadline_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useRemindersByEntity(
  entityType: 'response_deadline' | 'hearing' | 'task_due', 
  entityId: string
) {
  return useQuery({
    queryKey: ['deadline_reminders', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deadline_reminders')
        .select('*')
        .eq('reminder_type', entityType)
        .eq('entity_id', entityId)
        .order('days_before', { ascending: false });
      
      if (error) throw error;
      return data as DeadlineReminder[];
    },
    enabled: !!entityId,
  });
}
