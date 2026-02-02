import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { Phone, Mail, MessageSquare, Users, FileText, ArrowUp, ArrowDown, Edit2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ClientCommunication, CommunicationType } from '@/hooks/useClientCommunications';

interface CommunicationTimelineItemProps {
  communication: ClientCommunication;
  onEdit: (communication: ClientCommunication) => void;
  onDelete: (id: string) => void;
}

const typeConfig: Record<CommunicationType, { icon: typeof Phone; label: string; className: string }> = {
  call: { icon: Phone, label: 'Call', className: 'text-blue-600 bg-blue-100' },
  email: { icon: Mail, label: 'Email', className: 'text-green-600 bg-green-100' },
  sms: { icon: MessageSquare, label: 'SMS', className: 'text-purple-600 bg-purple-100' },
  meeting: { icon: Users, label: 'Meeting', className: 'text-orange-600 bg-orange-100' },
  note: { icon: FileText, label: 'Note', className: 'text-gray-600 bg-gray-100' },
};

const outcomeColors: Record<string, string> = {
  answered: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  voicemail: 'bg-yellow-100 text-yellow-700',
  no_answer: 'bg-red-100 text-red-700',
  busy: 'bg-orange-100 text-orange-700',
  bounced: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
  no_show: 'bg-red-100 text-red-700',
  logged: 'bg-gray-100 text-gray-700',
};

function formatCommunicationDate(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, yyyy h:mm a');
}

export function CommunicationTimelineItem({
  communication,
  onEdit,
  onDelete,
}: CommunicationTimelineItemProps) {
  const config = typeConfig[communication.communication_type];
  const Icon = config.icon;
  const DirectionIcon = communication.direction === 'outbound' ? ArrowUp : ArrowDown;
  const staffName = communication.staff
    ? `${communication.staff.first_name} ${communication.staff.last_name}`
    : null;

  return (
    <div className="group relative flex gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
      {/* Type Icon */}
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', config.className)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{config.label}</span>
          {communication.communication_type !== 'note' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <DirectionIcon className="h-3 w-3" />
              {communication.direction === 'outbound' ? 'Outbound' : 'Inbound'}
            </span>
          )}
          {communication.outcome && (
            <Badge variant="secondary" className={cn('text-xs', outcomeColors[communication.outcome])}>
              {communication.outcome.replace('_', ' ')}
            </Badge>
          )}
          {communication.duration_minutes && (
            <span className="text-xs text-muted-foreground">
              {communication.duration_minutes} min
            </span>
          )}
        </div>

        {communication.subject && (
          <p className="mt-1 font-medium text-sm">{communication.subject}</p>
        )}

        {communication.notes && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {communication.notes}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatCommunicationDate(communication.communication_date)}</span>
          {staffName && (
            <>
              <span>•</span>
              <span>by {staffName}</span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(communication)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(communication.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
