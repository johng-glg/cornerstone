export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'lead_assigned'
  | 'matter_assigned'
  | 'hearing_reminder'
  | 'response_deadline_reminder'
  | 'settlement_update'
  | 'mention'
  | 'system_alert';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  in_app_enabled: boolean;
  email_enabled: boolean;
  sound_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: 'Task Assignments',
  task_due_soon: 'Task Reminders',
  task_overdue: 'Overdue Tasks',
  lead_assigned: 'Lead Assignments',
  matter_assigned: 'Matter Assignments',
  hearing_reminder: 'Hearing Reminders',
  response_deadline_reminder: 'Response Deadline Reminders',
  settlement_update: 'Settlement Updates',
  mention: 'Mentions',
  system_alert: 'System Alerts',
};

export const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'task_assigned',
  'task_due_soon',
  'task_overdue',
  'lead_assigned',
  'matter_assigned',
  'hearing_reminder',
  'response_deadline_reminder',
  'settlement_update',
  'mention',
  'system_alert',
];
