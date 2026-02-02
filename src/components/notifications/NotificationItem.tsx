import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  UserPlus,
  Gavel,
  Calendar,
  DollarSign,
  AtSign,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarkAsRead } from '@/hooks/useNotifications';
import type { Notification, NotificationType } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
}

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  task_assigned: CheckSquare,
  task_due_soon: Clock,
  task_overdue: AlertCircle,
  lead_assigned: UserPlus,
  matter_assigned: Gavel,
  hearing_reminder: Calendar,
  response_deadline_reminder: FileText,
  settlement_update: DollarSign,
  mention: AtSign,
  system_alert: AlertTriangle,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  task_assigned: 'text-blue-500 bg-blue-500/10',
  task_due_soon: 'text-yellow-500 bg-yellow-500/10',
  task_overdue: 'text-destructive bg-destructive/10',
  lead_assigned: 'text-green-500 bg-green-500/10',
  matter_assigned: 'text-purple-500 bg-purple-500/10',
  hearing_reminder: 'text-orange-500 bg-orange-500/10',
  response_deadline_reminder: 'text-red-500 bg-red-500/10',
  settlement_update: 'text-green-500 bg-green-500/10',
  mention: 'text-blue-500 bg-blue-500/10',
  system_alert: 'text-yellow-500 bg-yellow-500/10',
};

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const navigate = useNavigate();
  const markAsRead = useMarkAsRead();

  const Icon = NOTIFICATION_ICONS[notification.type] || AlertCircle;
  const colorClass = NOTIFICATION_COLORS[notification.type] || 'text-muted-foreground bg-muted';

  const handleClick = () => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    // Navigate if there's a link
    if (notification.link) {
      navigate(notification.link);
      onClose?.();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50',
        !notification.is_read && 'bg-primary/5'
      )}
    >
      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', colorClass)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-medium line-clamp-1', !notification.is_read && 'text-foreground')}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </div>

        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </button>
  );
}
