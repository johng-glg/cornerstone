import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import type { Tables } from '@/integrations/supabase/types';

interface UseRealtimeTasksOptions {
  enabled?: boolean;
  showToasts?: boolean;
}

type TaskRow = Tables<'tasks'>;

export function useRealtimeTasks({ 
  enabled = true, 
  showToasts = true 
}: UseRealtimeTasksOptions = {}) {
  const { toast } = useToast();
  const { staff } = useAuth();

  useRealtimeSubscription<TaskRow>({
    table: 'tasks',
    queryKey: ['tasks'],
    enabled,
    onInsert: (payload) => {
      const newTask = payload.new as TaskRow;
      if (showToasts && newTask && newTask.assigned_to === staff?.id) {
        toast({
          title: 'New Task Assigned',
          description: newTask.title || 'A new task has been assigned to you',
        });
      }
    },
    onUpdate: (payload) => {
      const newTask = payload.new as TaskRow;
      const oldTask = payload.old as Partial<TaskRow>;
      // Toast for task completion
      if (showToasts && newTask && oldTask) {
        if (oldTask.status !== 'completed' && newTask.status === 'completed') {
          if (newTask.assigned_to === staff?.id) {
            // Don't notify the user who completed it - they know
          }
        }
      }
    },
  });
}

// Hook for subscribing to a specific task
export function useRealtimeTask(taskId: string | undefined, options?: { enabled?: boolean }) {
  useRealtimeSubscription<TaskRow>({
    table: 'tasks',
    queryKey: ['task', taskId],
    filter: taskId ? `id=eq.${taskId}` : undefined,
    enabled: (options?.enabled ?? true) && !!taskId,
  });
}
