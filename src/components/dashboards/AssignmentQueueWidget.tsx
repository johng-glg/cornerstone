import { Link } from 'react-router-dom';
import { usePendingQueue } from '@/hooks/useAssignmentQueue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function AssignmentQueueWidget() {
  const { data: queue, isLoading } = usePendingQueue();

  const pendingCount = queue?.length || 0;

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Assignment Queue
        </CardTitle>
        <CardDescription>
          Leads awaiting assignment
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingCount === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No leads in queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue?.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {item.lead?.first_name} {item.lead?.last_name}
                    </p>
                    {item.attempt_count > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {item.attempt_count} attempts
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.lead?.lead_number}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Queued {formatDistanceToNow(new Date(item.queued_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge 
                  variant={item.priority > 50 ? 'default' : 'secondary'}
                  className="flex-shrink-0"
                >
                  {item.priority} pts
                </Badge>
              </div>
            ))}

            {pendingCount > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{pendingCount - 5} more in queue
              </p>
            )}
          </div>
        )}

        {pendingCount > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">{pendingCount} lead{pendingCount !== 1 ? 's' : ''} waiting</p>
                <p className="text-xs mt-0.5 opacity-80">
                  Check pool availability or create assignment rules
                </p>
              </div>
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full mt-4" asChild>
          <Link to="/settings">
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Assignment Rules
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
