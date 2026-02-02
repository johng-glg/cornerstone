export type ReminderType = 'response_deadline' | 'hearing' | 'task_due';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface DeadlineReminder {
  id: string;
  reminder_type: ReminderType;
  entity_id: string;
  deadline_date: string;
  staff_id: string | null;
  days_before: number;
  scheduled_for: string;
  status: ReminderStatus;
  sent_at: string | null;
  notification_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderSettings {
  id: string;
  company_id: string;
  response_deadline_days: number[];
  hearing_days: number[];
  task_due_days: number[];
  reminder_hour: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ReminderSettingsInsert = Omit<ReminderSettings, 'id' | 'created_at' | 'updated_at'>;
export type ReminderSettingsUpdate = Partial<Omit<ReminderSettings, 'id' | 'company_id' | 'created_at' | 'updated_at'>>;

// Available days for reminder configuration
export const REMINDER_DAY_OPTIONS = [
  { value: 0, label: 'Day of' },
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '7 days before' },
  { value: 14, label: '14 days before' },
] as const;

// Hour options for reminder timing
export const REMINDER_HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 7, // 7 AM to 6 PM
  label: `${i + 7 > 12 ? i + 7 - 12 : i + 7}:00 ${i + 7 >= 12 ? 'PM' : 'AM'}`,
}));
