import { MessageSquare, RefreshCw, Calendar, FileText, Clock, Phone, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLitigationActivities, type LitigationActivity } from '@/hooks/useLitigationActivities';

interface LitigationActivityTimelineProps {
  matterId: string;
  onAddActivity: () => void;
}

const activityIcons: Record<string, React.ElementType> = {
  note: MessageSquare,
  status_change: RefreshCw,
  hearing: Calendar,
  filing: FileText,
  deadline: Clock,
  communication: Phone,
};

const activityColors: Record<string, string> = {
  note: 'bg-blue-100 text-blue-600',
  status_change: 'bg-purple-100 text-purple-600',
  hearing: 'bg-green-100 text-green-600',
  filing: 'bg-orange-100 text-orange-600',
  deadline: 'bg-red-100 text-red-600',
  communication: 'bg-teal-100 text-teal-600',
};

export function LitigationActivityTimeline({ matterId, onAddActivity }: LitigationActivityTimelineProps) {
  const { data: activities, isLoading } = useLitigationActivities(matterId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Activity Timeline</h3>
        <Button variant="outline" size="sm" onClick={onAddActivity}>
          <Plus className="h-4 w-4 mr-1" />
          Log Activity
        </Button>
      </div>

      {activities && activities.length > 0 ? (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No activity logged yet</p>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: LitigationActivity }) {
  const Icon = activityIcons[activity.activity_type] || MessageSquare;
  const colorClass = activityColors[activity.activity_type] || 'bg-gray-100 text-gray-600';

  return (
    <div className="relative pl-10">
      <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${colorClass}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium capitalize">{activity.activity_type.replace('_', ' ')}</p>
            <p className="text-sm text-foreground mt-1">{activity.description}</p>
            {activity.outcome && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium">Outcome:</span> {activity.outcome}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>{format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}</span>
          {activity.staff && (
            <span>by {activity.staff.first_name} {activity.staff.last_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}
