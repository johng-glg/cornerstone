import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  useRealtimeSubscription<Record<string, unknown>>({
    table: 'notifications',
    queryKey: ['notifications'],
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled: !!user?.id,
    onInsert: (payload) => {
      const notification = payload.new as { title?: string; message?: string };

      // Show toast for new notifications
      toast({
        title: notification.title || 'New notification',
        description: notification.message || undefined,
      });
    },
  });

  // Also update unread count when notifications change
  useRealtimeSubscription<Record<string, unknown>>({
    table: 'notifications',
    queryKey: ['notifications_unread_count'],
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled: !!user?.id,
  });
}
