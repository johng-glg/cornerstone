import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Clock, Calendar, FileText } from 'lucide-react';
import { useReminderSettings, useCreateReminderSettings, useUpdateReminderSettings } from '@/hooks/useReminderSettings';
import { useAuth } from '@/lib/auth';
import { REMINDER_DAY_OPTIONS, REMINDER_HOUR_OPTIONS } from '@/types/reminders';

export function ReminderSettingsTab() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useReminderSettings();
  const createSettings = useCreateReminderSettings();
  const updateSettings = useUpdateReminderSettings();

  // Create default settings if none exist
  useEffect(() => {
    if (!isLoading && !settings && user) {
      // We need to get company_id from staff table
      // For now, we'll let the RLS handle this
    }
  }, [isLoading, settings, user]);

  const handleToggleActive = (checked: boolean) => {
    if (!settings) return;
    updateSettings.mutate({ id: settings.id, is_active: checked });
  };

  const handleDayToggle = (
    field: 'response_deadline_days' | 'hearing_days' | 'task_due_days',
    day: number,
    checked: boolean
  ) => {
    if (!settings) return;
    
    const currentDays = settings[field] || [];
    const newDays = checked
      ? [...currentDays, day].sort((a, b) => b - a)
      : currentDays.filter(d => d !== day);
    
    updateSettings.mutate({ id: settings.id, [field]: newDays });
  };

  const handleHourChange = (hour: string) => {
    if (!settings) return;
    updateSettings.mutate({ id: settings.id, reminder_hour: parseInt(hour) });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deadline Reminders</CardTitle>
          <CardDescription>Configure automatic reminders for deadlines and hearings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <div className="flex gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deadline Reminders</CardTitle>
          <CardDescription>Configure automatic reminders for deadlines and hearings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Reminder settings have not been configured for your company. Please contact an administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Deadline Reminders
        </CardTitle>
        <CardDescription>
          Configure automatic reminders for response deadlines and court hearings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="reminders-active" className="text-base font-medium">
              Enable Automatic Reminders
            </Label>
            <p className="text-sm text-muted-foreground">
              Send notifications before upcoming deadlines and hearings
            </p>
          </div>
          <Switch
            id="reminders-active"
            checked={settings.is_active}
            onCheckedChange={handleToggleActive}
          />
        </div>

        {settings.is_active && (
          <>
            {/* Response Deadline Reminders */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Response Deadline Reminders</Label>
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                Send reminders before court response deadlines
              </p>
              <div className="flex flex-wrap gap-4 pl-6">
                {REMINDER_DAY_OPTIONS.filter(opt => opt.value !== 0).map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`response-${option.value}`}
                      checked={settings.response_deadline_days?.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleDayToggle('response_deadline_days', option.value, !!checked)
                      }
                    />
                    <Label htmlFor={`response-${option.value}`} className="font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Hearing Reminders */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Hearing Reminders</Label>
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                Send reminders before scheduled court appearances
              </p>
              <div className="flex flex-wrap gap-4 pl-6">
                {REMINDER_DAY_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`hearing-${option.value}`}
                      checked={settings.hearing_days?.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleDayToggle('hearing_days', option.value, !!checked)
                      }
                    />
                    <Label htmlFor={`hearing-${option.value}`} className="font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Reminder Timing */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Reminder Timing</Label>
              </div>
              <p className="text-sm text-muted-foreground -mt-2">
                Choose when daily reminders should be sent
              </p>
              <div className="pl-6">
                <Select
                  value={settings.reminder_hour.toString()}
                  onValueChange={handleHourChange}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_HOUR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground border-t pt-4">
          Reminders are processed automatically every hour. Notifications will appear in your notification center
          and can be configured in the Notifications tab.
        </p>
      </CardContent>
    </Card>
  );
}
