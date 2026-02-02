import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  getPreferenceValue,
} from '@/hooks/useNotificationPreferences';
import {
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
} from '@/types/notifications';

export function NotificationSettingsTab() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreference = useUpdateNotificationPreference();

  const handleToggle = (
    notificationType: NotificationType,
    field: 'in_app_enabled' | 'email_enabled' | 'sound_enabled',
    value: boolean
  ) => {
    updatePreference.mutate({ notificationType, field, value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <Skeleton className="h-5 w-40" />
              <div className="flex gap-8">
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-5 w-10" />
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose how you want to receive notifications</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 pb-4 border-b">
          <div />
          <div className="flex gap-8">
            <div className="w-16 text-center text-xs font-medium text-muted-foreground">In-App</div>
            <div className="w-16 text-center text-xs font-medium text-muted-foreground">Email</div>
            <div className="w-16 text-center text-xs font-medium text-muted-foreground">Sound</div>
          </div>
        </div>

        {/* Preference rows */}
        <div className="divide-y">
          {ALL_NOTIFICATION_TYPES.map((type) => (
            <div key={type} className="grid grid-cols-[1fr_auto] items-center gap-4 py-4">
              <Label htmlFor={`${type}-in-app`} className="font-normal cursor-pointer">
                {NOTIFICATION_TYPE_LABELS[type]}
              </Label>
              <div className="flex gap-8">
                <div className="w-16 flex justify-center">
                  <Switch
                    id={`${type}-in-app`}
                    checked={getPreferenceValue(preferences, type, 'in_app_enabled')}
                    onCheckedChange={(checked) => handleToggle(type, 'in_app_enabled', checked)}
                  />
                </div>
                <div className="w-16 flex justify-center">
                  <Switch
                    id={`${type}-email`}
                    checked={getPreferenceValue(preferences, type, 'email_enabled')}
                    onCheckedChange={(checked) => handleToggle(type, 'email_enabled', checked)}
                    disabled // Email notifications not yet implemented
                  />
                </div>
                <div className="w-16 flex justify-center">
                  <Switch
                    id={`${type}-sound`}
                    checked={getPreferenceValue(preferences, type, 'sound_enabled')}
                    onCheckedChange={(checked) => handleToggle(type, 'sound_enabled', checked)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Email notifications are coming soon. Sound notifications will play when new alerts arrive.
        </p>
      </CardContent>
    </Card>
  );
}
