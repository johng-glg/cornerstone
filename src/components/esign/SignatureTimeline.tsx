import { format } from 'date-fns';
import { 
  Send, Eye, CheckCircle2, XCircle, Clock, Bell, 
  FileCheck, AlertCircle 
} from 'lucide-react';
import type { SignatureEvent } from '@/types/esign';

interface SignatureTimelineProps {
  events: SignatureEvent[];
}

const eventConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  created: { 
    icon: <Clock className="h-4 w-4" />, 
    label: 'Request created', 
    color: 'text-muted-foreground' 
  },
  sent: { 
    icon: <Send className="h-4 w-4" />, 
    label: 'Sent for signature', 
    color: 'text-blue-500' 
  },
  viewed: { 
    icon: <Eye className="h-4 w-4" />, 
    label: 'Document viewed', 
    color: 'text-amber-500' 
  },
  signed: { 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    label: 'Signed', 
    color: 'text-green-500' 
  },
  declined: { 
    icon: <XCircle className="h-4 w-4" />, 
    label: 'Declined', 
    color: 'text-destructive' 
  },
  completed: { 
    icon: <FileCheck className="h-4 w-4" />, 
    label: 'All signatures complete', 
    color: 'text-green-600' 
  },
  reminder_sent: { 
    icon: <Bell className="h-4 w-4" />, 
    label: 'Reminder sent', 
    color: 'text-muted-foreground' 
  },
  expired: { 
    icon: <AlertCircle className="h-4 w-4" />, 
    label: 'Request expired', 
    color: 'text-destructive' 
  },
  canceled: { 
    icon: <XCircle className="h-4 w-4" />, 
    label: 'Request canceled', 
    color: 'text-muted-foreground' 
  },
};

export function SignatureTimeline({ events }: SignatureTimelineProps) {
  // Sort events by occurred_at descending (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  if (sortedEvents.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No events recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedEvents.map((event, index) => {
        const config = eventConfig[event.event_type] || {
          icon: <Clock className="h-4 w-4" />,
          label: event.event_type,
          color: 'text-muted-foreground',
        };

        const signerName = event.event_data?.signer_name as string | undefined;

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline line and dot */}
            <div className="flex flex-col items-center">
              <div className={`p-1.5 rounded-full bg-muted ${config.color}`}>
                {config.icon}
              </div>
              {index < sortedEvents.length - 1 && (
                <div className="w-px h-full bg-border flex-1 mt-2" />
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {config.label}
                  {signerName && (
                    <span className="text-muted-foreground font-normal">
                      {' '}by {signerName}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(event.occurred_at), 'MMM d, h:mm a')}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
