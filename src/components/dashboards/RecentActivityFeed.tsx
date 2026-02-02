import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, FileText, Calendar, MessageSquare, Gavel, DollarSign } from 'lucide-react';

export interface Activity {
  id: string;
  type: 'status_change' | 'document' | 'hearing' | 'communication' | 'settlement' | 'activity';
  message: string;
  timestamp: string;
  entityId?: string;
  entityType?: string;
}

interface RecentActivityFeedProps {
  title?: string;
  description?: string;
  activities: Activity[];
  viewAllHref?: string;
  maxItems?: number;
  emptyMessage?: string;
}

const activityIcons = {
  status_change: <TrendingUp className="h-3 w-3" />,
  document: <FileText className="h-3 w-3" />,
  hearing: <Calendar className="h-3 w-3" />,
  communication: <MessageSquare className="h-3 w-3" />,
  settlement: <DollarSign className="h-3 w-3" />,
  activity: <Gavel className="h-3 w-3" />,
};

const activityColors = {
  status_change: 'bg-blue-500',
  document: 'bg-green-500',
  hearing: 'bg-purple-500',
  communication: 'bg-yellow-500',
  settlement: 'bg-emerald-500',
  activity: 'bg-primary',
};

export function RecentActivityFeed({
  title = 'Recent Activity',
  description,
  activities,
  viewAllHref,
  maxItems = 5,
  emptyMessage = 'No recent activity',
}: RecentActivityFeedProps) {
  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxItems);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {recentActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`h-6 w-6 rounded-full ${activityColors[activity.type]} flex items-center justify-center text-white flex-shrink-0 mt-0.5`}>
                  {activityIcons[activity.type]}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-2">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {viewAllHref && (
          <Button variant="outline" className="w-full mt-4" asChild>
            <Link to={viewAllHref}>View All</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
