import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { NotificationPreference, NotificationType, ALL_NOTIFICATION_TYPES } from '@/types/notifications';

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notification_preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as NotificationPreference[];
    },
    enabled: !!user?.id,
  });
}

interface UpdatePreferenceParams {
  notificationType: NotificationType;
  field: 'in_app_enabled' | 'email_enabled' | 'sound_enabled';
  value: boolean;
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ notificationType, field, value }: UpdatePreferenceParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Try to upsert the preference
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            notification_type: notificationType,
            [field]: value,
          },
          {
            onConflict: 'user_id,notification_type',
          }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_preferences'] });
    },
  });
}

// Helper to get the effective preference value (defaults to true for in_app, false for email, true for sound)
export function getPreferenceValue(
  preferences: NotificationPreference[] | undefined,
  notificationType: NotificationType,
  field: 'in_app_enabled' | 'email_enabled' | 'sound_enabled'
): boolean {
  const pref = preferences?.find((p) => p.notification_type === notificationType);
  if (!pref) {
    // Default values
    if (field === 'email_enabled') return false;
    return true;
  }
  return pref[field];
}
